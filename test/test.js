/* eslint-env mocha */

import { assert } from 'chai'
import fetchCookie from 'fetch-cookie'
import * as nodeFetch3 from 'node-fetch'
import nodeFetch2 from 'node-fetch-2'
import * as undici from 'undici'
import app from './test-server.js'

// https://github.com/nodejs/undici/blob/eec867d01c920b005051d5686e39a4e008e7d6ea/docs/best-practices/writing-tests.md
undici.setGlobalDispatcher(new undici.Agent({
  keepAliveTimeout: 10, // milliseconds
  keepAliveMaxTimeout: 10 // milliseconds
}))

const { CookieJar, Cookie } = fetchCookie.toughCookie
let server

before('start test server', async () => {
  return new Promise((resolve, reject) => {
    server = app.listen(9999, (err) => {
      if (err) { reject(err) } else { resolve() }
    })
  })
})

after('stop test server', () => {
  if (server) {
    server.close()
  }
})

suite('node-fetch@3', nodeFetch3.default, nodeFetch3.Request)
suite('node-fetch@2', nodeFetch2, nodeFetch2.Request)
suite('undici', undici.fetch, undici.Request)

function suite (name, fetchImpl, Request) {
  describe(name, () => {
    const fetch = fetchCookie(fetchImpl)

    it('should accept a Request object as only parameter', async () => {
      const req = new Request('http://localhost:9999/get')
      const res = await fetch(req)
      assert.propertyVal(res, 'status', 200)
    })

    it('should not send empty cookie header', async () => {
      const req = new Request('http://localhost:9999/ok-if-empty')
      const res = await fetch(req)
      assert.propertyVal(res, 'status', 200)
    })

    it('should handle cookies (using internal cookie jar)', async () => {
      await fetch('http://localhost:9999/set?name=foo&value=bar')
      const res = await fetch('http://localhost:9999/get')
      assert.deepEqual((await res.json()).cookies, ['foo=bar'])
    })

    // This test esentially tests if to clients with different jars are
    // completely separated and don't share state.
    it('should handle cookies (using custom cookie jar)', async () => {
      // Client 1
      const jar1 = new CookieJar()
      const fetch1 = fetchCookie(fetchImpl, jar1)
      await fetch1('http://localhost:9999/set?name=foo&value=bar')
      const cookies1 = jar1.store.idx.localhost['/']
      assert.property(cookies1, 'foo')
      /** @type {Cookie} */
      const cookie1 = cookies1.foo
      assert.instanceOf(cookie1, Cookie)
      assert.propertyVal(cookie1, 'value', 'bar')

      // Client 2
      const jar2 = new CookieJar()
      const fetch2 = fetchCookie(fetchImpl, jar2)
      await fetch2('http://localhost:9999/set?name=tuna&value=can')
      const cookies2 = jar2.store.idx.localhost['/']
      assert.property(cookies2, 'tuna')
      /** @type {Cookie} */
      const cookie2 = cookies2.tuna
      assert.instanceOf(cookie2, Cookie)
      assert.propertyVal(cookie2, 'value', 'can')

      // Compare the two clients (jars)
      assert.notEqual(cookie1, cookie2)
      assert.notStrictEqual(cookie1.key, cookie2.key)

      Object.keys(cookies1).forEach(cookie1Key => {
        assert.notProperty(cookie2, cookie1Key)
      })

      Object.keys(cookies2).forEach(cookie2Key => {
        assert.notProperty(cookie1, cookie2Key)
      })
    })

    it("should handle multiple cookies (including comma in 'expires' option)", async () => {
      const jar = new CookieJar()
      const fetch = fetchCookie(fetchImpl, jar)
      await fetch('http://localhost:9999/set-multiple')
      const cookies = jar.store.idx.localhost['/']

      assert.property(cookies, 'foo')
      /** @type {Cookie} */
      const cookie1 = cookies.foo
      assert.instanceOf(cookie1, Cookie)
      assert.propertyVal(cookie1, 'value', 'bar')
      assert.property(cookie1, 'expires')
      assert.instanceOf(cookie1.expires, Date)

      assert.property(cookies, 'tuna')
      /** @type {Cookie} */
      const cookie2 = cookies.tuna
      assert.instanceOf(cookie2, Cookie)
      assert.propertyVal(cookie2, 'value', 'can')

      // Compare the two cookies
      assert.notEqual(cookie1, cookie2)
      assert.notStrictEqual(cookie1.key, cookie2.key)
    })

    it('should ignore error when there is error in setCookie', async () => {
      const jar = new CookieJar()
      const fetch = fetchCookie(fetchImpl, jar)
      let error = null
      try {
        await fetch('http://localhost:9999/cookie')
      } catch (err) {
        error = err
      }
      assert.isNull(error)
    })

    it('should throw error when there is error in setCookie', async () => {
      const jar = new CookieJar()
      const fetch = fetchCookie(fetchImpl, jar, false)
      let error = null
      try {
        await fetch('http://localhost:9999/cookie')
      } catch (err) {
        error = err
      }
      assert.instanceOf(error, Error)
    })

    it('should handle redirects', async () => {
      const jar = new CookieJar()
      const fetch = fetchCookie(fetchImpl, jar)
      const res = await fetch('http://localhost:9999/set-redirect?name=foo&value=bar')
      assert.isTrue(res.redirected)
      assert.deepEqual((await res.json()).cookies, ['foo=bar'])
    })

    it('should handle relative redirects', async () => {
      const jar = new CookieJar()
      const fetch = fetchCookie(fetchImpl, jar)
      const res = await fetch('http://localhost:9999/set-relative-redirect?name=foo&value=bar')
      assert.isTrue(res.redirected)
      assert.deepEqual((await res.json()).cookies, ['foo=bar'])
    })

    it('should handle redirects to another domain', async () => {
      const jar = new CookieJar()
      const fetch = fetchCookie(fetchImpl, jar)
      const res = await fetch('http://localhost:9999/set-other-host-redirect?name=foo&value=bar')
      assert.isTrue(res.redirected)
      assert.deepEqual(await res.json(), {
        hostname: '127.0.0.1',
        cookies: []
      })
    })

    it('should handle redirects to another domain explicit host header', async () => {
      const jar = new CookieJar()
      const fetch = fetchCookie(fetchImpl, jar)

      const res = await fetch('http://localhost:9999/set-other-host-redirect?name=foo&value=bar', {
        headers: {
          host: 'localhost:9999'
        }
      })

      assert.isTrue(res.redirected)
      assert.deepEqual(await res.json(), {
        hostname: '127.0.0.1',
        cookies: []
      })
    })
  })
}
