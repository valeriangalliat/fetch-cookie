/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import * as tough from 'tough-cookie'
import { splitCookiesString } from 'set-cookie-parser'
import { Readable } from 'stream'

type FetchImpl = typeof fetch

interface GenericRequest { url: string }
interface URLLike { href: string }

type GenericRequestInfo = string | URLLike | GenericRequest

interface GenericRequestInit {
  method?: string
  redirect?: string
  body?: any
  referrerPolicy?: string
}

interface GenericResponse {
  url: string
  status: number
  headers: {
    get: (name: string) => string | null
    has: (name: string) => boolean
  }
}

type FetchCookieInit<T extends GenericRequestInit> = T & {
  maxRedirect?: number
  redirectCount?: number
}

type GenericFetch<T1 extends GenericRequestInfo, T2 extends GenericRequestInit, T3> = (input: T1, init?: T2) => Promise<T3>

export interface FetchCookieImpl<T1 extends GenericRequestInfo, T2 extends GenericRequestInit, T3> {
  (input: T1, init?: FetchCookieInit<T2>): Promise<T3>
  toughCookie: typeof tough
}

type NodeFetchHeaders = Headers & {
  getAll?: (name: string) => string[]
  raw?: () => { [name: string]: string[] }
}

export interface CookieJar {
  getCookieString: (currentUrl: string) => Promise<string>
  setCookie: (cookieString: string, currentUrl: string, opts: { ignoreError: boolean }) => Promise<any>
}

// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/is.js#L68>.
function isDomainOrSubdomain (destination: string, original: string): boolean {
  const orig = new URL(original).hostname
  const dest = new URL(destination).hostname

  return orig === dest || orig.endsWith(`.${dest}`)
}

// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/referrer.js#L60>.
const referrerPolicy = new Set([
  '',
  'no-referrer',
  'no-referrer-when-downgrade',
  'same-origin',
  'origin',
  'strict-origin',
  'origin-when-cross-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url'
])

// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/referrer.js#L320>.
function parseReferrerPolicy (policyHeader: string): ReferrerPolicy {
  const policyTokens = policyHeader.split(/[,\s]+/)

  let policy: ReferrerPolicy = ''

  for (const token of policyTokens) {
    if (token !== '' && referrerPolicy.has(token)) {
      policy = token as ReferrerPolicy
    }
  }

  return policy
}

function doNothing (init: RequestInit, name: string): void {}

function callDeleteMethod (init: RequestInit, name: string): void {
  (init.headers as Headers).delete(name)
}

function deleteFromObject (init: RequestInit, name: string): void {
  const headers = init.headers as Record<string, string>

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete headers[key]
    }
  }
}

function identifyDeleteHeader (init: RequestInit): typeof doNothing {
  if (init.headers == null) {
    return doNothing
  }

  if (typeof (init.headers as Headers).delete === 'function') {
    return callDeleteMethod
  }

  return deleteFromObject
}

// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/is-redirect.js>.
const redirectStatus = new Set([301, 302, 303, 307, 308])

function isRedirect (status: number): boolean {
  return redirectStatus.has(status)
}

// Adapted from <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/index.js#L161>.
async function handleRedirect (fetchImpl: FetchImpl, init: FetchCookieInit<RequestInit>, response: Response): Promise<Response> {
  switch (init.redirect ?? 'follow') {
    case 'error':
      throw new TypeError(`URI requested responded with a redirect and redirect mode is set to error: ${response.url}`)
    case 'manual':
      return response
    case 'follow':
      break
    default:
      throw new TypeError(`Invalid redirect option: ${init.redirect as RequestRedirect}`)
  }

  const locationUrl = response.headers.get('location')

  if (locationUrl === null) {
    return response
  }

  // We can use `response.url` here since we force `redirect` to `manual`.
  const requestUrl = response.url
  const redirectUrl = new URL(locationUrl, requestUrl).toString()

  const redirectCount = init.redirectCount ?? 0
  const maxRedirect = init.maxRedirect ?? 20

  if (redirectCount >= maxRedirect) {
    throw new TypeError(`Reached maximum redirect of ${maxRedirect} for URL: ${requestUrl}`)
  }

  init = {
    ...init,
    redirectCount: redirectCount + 1
  }

  const deleteHeader = identifyDeleteHeader(init)

  // Do not forward sensitive headers to third-party domains.
  if (!isDomainOrSubdomain(requestUrl, redirectUrl)) {
    for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
      deleteHeader(init, name)
    }
  }

  const maybeNodeStreamBody = init.body as unknown as Readable
  const maybeStreamBody = init.body as ReadableStream

  if (response.status !== 303 && init.body != null && (typeof maybeNodeStreamBody.pipe === 'function' || typeof maybeStreamBody.pipeTo === 'function')) {
    throw new TypeError('Cannot follow redirect with body being a readable stream')
  }

  if (response.status === 303 || ((response.status === 301 || response.status === 302) && init.method === 'POST')) {
    init.method = 'GET'
    init.body = undefined
    deleteHeader(init, 'content-length')
  }

  if (response.headers.has('referrer-policy')) {
    init.referrerPolicy = parseReferrerPolicy(response.headers.get('referrer-policy') as string)
  }

  // Remove any explicit host header to avoid sending the wrong host in redirects to other host.
  deleteHeader(init, 'host')

  return await fetchImpl(redirectUrl, init)
}

function addCookiesToRequest (input: RequestInfo | URL, init: RequestInit, cookie: string): RequestInit {
  if (cookie === '') {
    return init
  }

  const maybeRequest = input as Request
  const maybeHeaders = init.headers as Headers

  if (maybeRequest.headers && typeof maybeRequest.headers.append === 'function') {
    maybeRequest.headers.append('cookie', cookie)
  } else if (maybeHeaders && typeof maybeHeaders.append === 'function') {
    maybeHeaders.append('cookie', cookie)
  } else {
    init = { ...init, headers: { ...init.headers, cookie } }
  }

  return init
}

function getCookiesFromResponse (response: Response): string[] {
  const maybeNodeFetchHeaders = response.headers as NodeFetchHeaders

  if (typeof maybeNodeFetchHeaders.getAll === 'function') {
    // node-fetch v1
    return maybeNodeFetchHeaders.getAll('set-cookie')
  }

  if (typeof maybeNodeFetchHeaders.raw === 'function') {
    // node-fetch v2
    const headers = maybeNodeFetchHeaders.raw()

    if (Array.isArray(headers['set-cookie'])) {
      return headers['set-cookie']
    }

    return []
  }

  // WhatWG `fetch`
  const cookieString = response.headers.get('set-cookie')

  if (cookieString !== null) {
    return splitCookiesString(cookieString)
  }

  return []
}

export default function fetchCookie<
  T1 extends GenericRequestInfo,
  T2 extends GenericRequestInit,
  T3 extends GenericResponse
> (fetch: GenericFetch<T1, T2, T3>, jar?: CookieJar, ignoreError = true): FetchCookieImpl<T1, T2, T3> {
  const actualFetch = fetch as unknown as FetchImpl
  const actualJar: CookieJar = jar ?? new tough.CookieJar()

  async function fetchCookieWrapper (input: RequestInfo | URL, init?: FetchCookieInit<RequestInit>): Promise<Response> {
    // Keep track of original init for the `redirect` property that we hijack.
    const originalInit = init ?? {}

    // Force manual redirects to forward cookies during redirects.
    init = { ...init, redirect: 'manual' }

    // Resolve request URL.
    const requestUrl = typeof input === 'string' ? input : 'href' in input ? input.href : input.url

    // Get matching cookie for resolved request URL.
    const cookie = await actualJar.getCookieString(requestUrl)

    // Add cookie header to request.
    init = addCookiesToRequest(input, init, cookie)

    // Proxy to `fetch` implementation.
    const response = await actualFetch(input, init)

    // Get response cookies.
    const cookies = getCookiesFromResponse(response)

    // Store cookies in the jar for that URL.
    await Promise.all(cookies.map(async cookie => await actualJar.setCookie(cookie, response.url, { ignoreError })))

    // Do this check here to allow tail recursion of redirect.
    if ((init.redirectCount ?? 0) > 0) {
      Object.defineProperty(response, 'redirected', { value: true })
    }

    if (!isRedirect(response.status)) {
      return response
    }

    // Recurse into redirect.
    return await handleRedirect(fetchCookieWrapper, originalInit, response)
  }

  fetchCookieWrapper.toughCookie = tough

  return fetchCookieWrapper as any
}

fetchCookie.toughCookie = tough
