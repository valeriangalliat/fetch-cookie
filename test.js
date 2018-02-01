/* eslint-env mocha */

const { equal } = require('assert')
const express = require('express')
const nodeFetch = require('node-fetch')
const fetch = require('./')(nodeFetch)

const app = express()

app.get('/set', (req, res) => {
  res.set('set-cookie', 'foo=bar')
  res.end()
})

app.get('/set2', (req, res) => {
  res.set('set-cookie', 'foo=bar2')
  res.end()
})

app.get('/get', (req, res) => {
  res.end(req.headers.cookie)
})

app.get('/redirect', (req, res) => {
  res.redirect('http://localhost:9998/get')
})

app.listen(9999)

describe('fetch-cookie', () => {
  it('should handle cookies', async () => {
    await fetch('http://localhost:9999/set');
    const res = await fetch('http://localhost:9999/get');
    equal(await res.text(), 'foo=bar');
  })
  it('should handle cookies jars', async () => {
    const cookieJar1 = {};
    const cookieJar2 = {};
    await fetch('http://localhost:9999/set', cookieJar1);
    const res1 = await fetch('http://localhost:9999/get', cookieJar1);

    await fetch('http://localhost:9999/set2', cookieJar2);
    const res2 = await fetch('http://localhost:9999/get', cookieJar2);

    equal(await res1.text(), 'foo=bar');
    equal(cookieJar1.headers.cookie, 'foo=bar');

    equal(await res2.text(), 'foo=bar2');
    equal(cookieJar2.headers.cookie, 'foo=bar2');
  })
})
