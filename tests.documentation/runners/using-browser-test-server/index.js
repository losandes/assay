module.exports = require('supposed')
  .configure({ name: 'foo', inject: { foo: 'bar' } }) // optional
  .runner({ cwd: __dirname, port: 42005 })
  .startServer()
