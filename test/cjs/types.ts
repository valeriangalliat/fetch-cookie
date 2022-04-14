import fetchCookie from 'fetch-cookie'
import nodeFetch3 from 'node-fetch'
import nodeFetch2 from 'node-fetch-2'
import undici from 'undici'

fetchCookie(nodeFetch3)
fetchCookie(nodeFetch2)
fetchCookie(undici.fetch)
