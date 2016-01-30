'use strict'
module.exports = function(hub, options, next) {
  for (let i = 0; i < options.sayTimes; i++) {
    console.log('Foo says: ' + hub.fooSays)
  }
  next()
}

module.exports.attributes = {
  name: 'bar',
  version: '0.0.0',
}
