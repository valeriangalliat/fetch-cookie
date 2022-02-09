module.exports = function nodeFetchCookieDecorator (nodeFetch, jar, ignoreError) {
  const fetchCookie = require('.')(nodeFetch, jar, ignoreError)

  async function nodeFetchCookie (url, userOptions = {}) {
    const opts = Object.assign({}, userOptions, { redirect: 'manual' })

    // Forward identical options to wrapped node-fetch but tell to not handle redirection.
    const res = await fetchCookie(url, opts)

    const isRedirect = (res.status === 303 || res.status === 301 || res.status === 302 || res.status === 307)

    // Interpret the proprietary "redirect" option in the same way that node-fetch does.
    if (!isRedirect || userOptions.redirect === 'manual' || userOptions.follow === 0) {
      return res
    }

    const statusOpts = {
      counter: (userOptions.counter || 0) + 1
    }

    if (res.status !== 307) {
      statusOpts.method = 'GET'
      statusOpts.body = null
    }

    const redirectOpts = Object.assign({}, userOptions, statusOpts)
    const redirectUrl = new URL(res.headers.get('location'), url).toString()

    return nodeFetchCookie(redirectUrl, redirectOpts)
  }

  nodeFetchCookie.toughCookie = fetchCookie.toughCookie

  return nodeFetchCookie
}
