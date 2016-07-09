'use strict'
function plugin (hub, options, next) {
  for (let i = 0; i < options.sayTimes; i++) {
    console.log('Foo says: ' + hub.fooSays)
  }
  next()
}

plugin.attributes = {
  name: 'bar',
  version: '0.0.0'
}

module.exports = plugin
