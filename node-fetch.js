module.exports = function nodeFetchCookieDecorator (nodeFetch, jar) {
  var fetchCookie = require('./')(nodeFetch, jar)

  return function nodeFetchCookie (url, opts) {
    opts = Object.assign({}, opts, { redirect: 'manual' })

    // Forward identical options to wrapped node-fetch but tell to not handle redirection.
    return fetchCookie(url, opts)
      .then(res => {
        var isRedirect = (res.status === 303 || ((res.status === 301 || res.status === 302) && opts.method === 'POST'))

        // Interpret the proprietary "redirect" option in the same way that node-fetch does.
        if (isRedirect && opts.redirect !== 'manual' && opts.follow !== 0) {
          var optsForGet = Object.assign({}, {
            method: 'GET',
            body: null,
            // Since the "follow" flag is not relevant for node-fetch in this case,
            // we'll hijack it for our internal bookkeeping.
            follow: opts.follow !== undefined ? opts.follow - 1 : undefined
          })

          return nodeFetchCookie(res.headers.get('location'), optsForGet)
        } else {
          return res
        }
      })
  }
}
