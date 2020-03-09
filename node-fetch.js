module.exports = function nodeFetchCookieDecorator (nodeFetch, jar) {
  const fetchCookie = require('./')(nodeFetch, jar)

  return function nodeFetchCookie (url, userOptions = {}) {
    const opts = Object.assign({}, userOptions, { redirect: 'manual' })

    // Forward identical options to wrapped node-fetch but tell to not handle redirection.
    return fetchCookie(url, opts)
      .then(res => {
        const isRedirect = (res.status === 303 || ((res.status === 301 || res.status === 302)))

        // Interpret the proprietary "redirect" option in the same way that node-fetch does.
        if (isRedirect && userOptions.redirect !== 'manual' && userOptions.follow !== 0) {
          const optsForGet = Object.assign({}, opts, {
            method: 'GET',
            body: null,
            // Since the "follow" flag is not relevant for node-fetch in this case,
            // we'll hijack it for our internal bookkeeping.
            follow: userOptions.follow !== undefined ? userOptions.follow - 1 : undefined
          })

          return nodeFetchCookie(res.headers.get('location'), optsForGet)
        } else {
          return res
        }
      })
  }
}
