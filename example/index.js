'use strict';

var registerPlugins = require('../');

function Hub() {
}

Hub.prototype.register = function(plugins) {
  registerPlugins(this, plugins);
};

var hub = new Hub();
hub.register([
  { register: require('./plugins/bar'), options: { sayTimes: 4 } },
  require('./plugins/foo')
]);
