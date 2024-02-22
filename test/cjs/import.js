const fetchCookie = require('fetch-cookie').default

if (typeof fetchCookie !== 'function') {
  throw new Error('Not good')
}
