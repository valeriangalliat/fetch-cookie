var assign = Object.assign || require('object-assign')
var Promise = Promise || require('promise')
var denodeify = require('es6-denodeify')(Promise)
var tough = require('tough-cookie')

module.exports = function fetchCookieDecorator (fetch, jar) {
  fetch = fetch || window.fetch
  jar = jar || new tough.CookieJar()

  var getCookieString = denodeify(jar.getCookieString.bind(jar))
  var setCookie = denodeify(jar.setCookie.bind(jar))

  return function fetchCookie (url, opts) {
    opts = opts || {}

    return getCookieString(url)
      .then(function (cookie) {
        return fetch(url, assign(opts, {
          headers: assign(opts.headers || {}, { cookie: cookie })
        }))
      })
      .then(function (res) {
        var cookies = res.headers.getAll('set-cookie')

        if (!cookies.length) {
          return res
        }

        return Promise.all(cookies.map(function(cookie){
          return setCookie(cookie,url);
        })).then(function () {
          return res
        });
      });
  }
}
