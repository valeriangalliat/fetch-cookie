const express = require('express')

const app = express()

// Respons with a 'set-cookie' header with a single cookie with only a name and value created by the URL params
app.get('/set', (req, res) => {
  const { name, value } = req.query
  res.set('set-cookie', `${name}=${value}`)
  res.end()
})

app.get('/set-multiple', (req, res) => {
  res.append('set-cookie', 'foo=bat; expires=Mon, 17-Jul-2017 16:06:00 GMT; Max-Age=31449600; Path=/; secure')
  res.append('set-cookie', 'tuna=can')
  res.end()
})

app.get('/get', (req, res) => {
  res.end(req.headers.cookie)
})

app.get('/redirect', (req, res) => {
  res.redirect('http://localhost:9998/get') // FIXME: There is nothing at this port ...
})

module.exports = app
