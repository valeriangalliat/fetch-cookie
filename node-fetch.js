module.exports = function nodeFetchCookieDecorator(nodeFetch, jar) {
    var fetchCookie = require('./index.js')(nodeFetch, jar);

    return function nodeFetchCookie(url, opts) {
        // forward identical options to wrapped node-fetch but tell to not handle redirection
        return fetchCookie(url, Object.assign({}, opts, { redirect: 'manual' }))
            .then(function (res) {
                var isRedirect = (res.status === 303
                    || ((res.status === 301 || res.status === 302) && opts.method === 'POST'));
                // interpret the proprietary "redirect" option in the same way that node-fetch does
                if (isRedirect && opts.redirect !== 'manual' && opts.follow !== 0) {
                    var optsForGet = Object.assign({}, {
                        method: 'GET',
                        body: null,
                        // since the "follow" flag is not relevant for node-fetch in this case,
                        // we'll hijack it for our internal bookkeeping
                        follow: opts.follow !== undefined ? opts.follow - 1 : undefined
                    });
                    return nodeFetchCookie(res.headers._headers.location[0], optsForGet);
                } else {
                    return res;
                }
            });
    }
}
