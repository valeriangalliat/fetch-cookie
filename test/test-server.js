const express = require('express')

const app = express()

// Responds with a 'set-cookie' header with a single cookie with only a name and value created by the URL params
app.get('/set', (req, res) => {
  const { name, value } = req.query
  res.set('set-cookie', `${name}=${value}`)
  res.end()
})

// Responds with two cookies. We want to cause a 'set-cookie' header with a comma in the cookie to be able to test
// correct parsing on the client side.
app.get('/set-multiple', (req, res) => {
  res.cookie('foo', 'bar', { expires: new Date(2000, 0, 1) }) // The date will contain a comma. eg: Mon, 17-Jul-2017 16:06:00 GMT
  res.cookie('tuna', 'can')
  res.end()
})

// Returns all cookies that the client sent via req as a string array
app.get('/get', (req, res) => {
  // Get cookies
  let cookies = req.headers.cookie
  if (!Array.isArray(cookies)) { cookies = [cookies] }

  res.json(cookies)
})

app.get('/ok-if-empty', (req, res) => {
  // Get cookies
  let response = req.headers.cookie === undefined  ? {"status": "ok"} : {"status": "not-ok"}
  res.json(response)
})

app.get('/redirect', (req, res) => {
  res.redirect('http://localhost:9998/get') // FIXME: There is nothing at this port ...
})

app.get('/cookie', (req, res) => {
  res.setHeader(
    'set-cookie',
    'my_cookie=HelloWorld; path=/; domain=www.example.com; secure; HttpOnly; SameSite=Lax'
  )
  res.cookie('tuna', 'can')
  res.end()
})

module.exports = app
