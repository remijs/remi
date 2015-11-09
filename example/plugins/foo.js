'use strict';

module.exports.register = function(hub) {
  hub.fooSays = 'Hello world!';
};

module.exports.attributes = {
  name: 'foo'
};
