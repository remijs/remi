'use strict';

module.exports.register = function(hub, options, next) {
  for (var i = 0; i < options.sayTimes; i++) {
    console.log('Foo says: ' + hub.fooSays);
  }
  next();
};

module.exports.attributes = {
  name: 'bar',
  dependencies: ['foo']
};
