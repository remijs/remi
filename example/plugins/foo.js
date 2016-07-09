'use strict'
function plugin (hub, options, next) {
  hub.root.fooSays = 'Hello world!'
  next()
}

plugin.attributes = {
  name: 'foo',
  version: '0.0.0'
}

module.exports = plugin
