import express from 'express'

const app = express()

// Responds with a `set-cookie` header with a single cookie with only a name
// and value created by the URL params.
app.get('/set', (req, res) => {
  const { name, value } = req.query
  res.setHeader('Set-Cookie', `${name}=${value}`)
  res.end()
})

app.get('/set-redirect', (req, res) => {
  const { name, value } = req.query
  res.setHeader('Set-Cookie', `${name}=${value}`)
  res.redirect('http://localhost:9999/get')
})

app.get('/set-relative-redirect', (req, res) => {
  const { name, value } = req.query
  res.set('set-cookie', `${name}=${value}`)
  res.redirect('/get')
})

app.get('/set-other-host-redirect', (req, res) => {
  const { name, value } = req.query
  res.setHeader('Set-Cookie', `${name}=${value}`)
  res.redirect('http://127.0.0.1:9999/get')
})

// Responds with two cookies. We want to cause a `set-cookie` header with a
// comma in the cookie to be able to test correct parsing on the client side.
app.get('/set-multiple', (req, res) => {
  res.cookie('foo', 'bar', { expires: new Date(2000, 0, 1) }) // The date will contain a comma. eg: `Mon, 17-Jul-2017 16:06:00 GMT`.
  res.cookie('tuna', 'can')
  res.end()
})

// Returns all cookies that the client sent via `req` as a string array.
app.get('/get', (req, res) => {
  let cookies = req.headers.cookie

  if (typeof cookies === 'string') {
    cookies = [cookies]
  } else if (!cookies) {
    cookies = []
  }

  res.json({
    headers: req.headers,
    cookies
  })
})

app.get('/ok-if-empty', (req, res) => {
  if (req.headers.cookie !== undefined) {
    res.status(400)
  }

  res.end()
})

app.get('/cookie', (req, res) => {
  res.setHeader(
    'set-cookie',
    'my_cookie=HelloWorld; path=/; domain=www.example.com; secure; HttpOnly; SameSite=Lax'
  )
  res.cookie('tuna', 'can')
  res.end()
})

export default app
