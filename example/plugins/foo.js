'use strict';

module.exports.register = function(hub, options, next) {
  hub.fooSays = 'Hello world!';
  next();
};

module.exports.register.attributes = {
  name: 'foo',
  version: '0.0.0'
};
