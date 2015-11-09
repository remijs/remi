'use strict';

module.exports.register = function(hub) {
  console.log('Foo says: ' + hub.fooSays);
};

module.exports.attributes = {
  name: 'bar',
  dependencies: ['foo']
};
