import fetchCookie from '../src'
import nodeFetch3 from 'node-fetch'
import nodeFetch2 from './node-fetch-2/index.js'
import undici from 'undici'

fetchCookie(nodeFetch3)
fetchCookie(nodeFetch2)
fetchCookie(undici.fetch)
