import fetchCookie from 'fetch-cookie'

if (typeof fetchCookie !== 'function') {
  throw new Error('Not good')
}
