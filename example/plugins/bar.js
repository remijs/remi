'use strict';

module.exports.register = function(hub, options, next) {
  for (var i = 0; i < options.sayTimes; i++) {
    console.log('Foo says: ' + hub.fooSays);
  }
  next();
};

module.exports.register.attributes = {
  name: 'bar',
  version: '0.0.0',
  dependencies: ['foo']
};
