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

app.get('/get', (req, res) => {
  res.end(req.headers.cookie)
})

app.get('/redirect', (req, res) => {
  res.redirect('http://localhost:9998/get')
})

app.listen(9999)

describe('fetch-cookie', () => {
  it('should handle cookies', () => {
    return fetch('http://localhost:9999/set')
      .then(() => fetch('http://localhost:9999/get'))
      .then(res => res.text())
      .then(body => {
        equal(body, 'foo=bar')
      })
  })
})
