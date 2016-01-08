'use strict';

module.exports = function(hub, options, next) {
  hub.fooSays = 'Hello world!'
  next()
}

module.exports.attributes = {
  name: 'foo',
  version: '0.0.0',
}
