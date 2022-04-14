const fetchCookie = require('fetch-cookie')

if (typeof fetchCookie !== 'function') {
  throw new Error('Not good')
}
