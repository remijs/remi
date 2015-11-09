'use strict';

module.exports.register = function(hub, options) {
  for (var i = 0; i < options.sayTimes; i++) {
    console.log('Foo says: ' + hub.fooSays);
  }
};

module.exports.attributes = {
  name: 'bar',
  dependencies: ['foo']
};
