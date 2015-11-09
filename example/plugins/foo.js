'use strict';

module.exports.register = function(hub, options, next) {
  hub.fooSays = 'Hello world!';
  next();
};

module.exports.attributes = {
  name: 'foo'
};
