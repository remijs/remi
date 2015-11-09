'use strict';

var registerPlugins = require('../');

function Hub() {
}

Hub.prototype.register = function(plugins) {
  registerPlugins(this, plugins);
};

var hub = new Hub();
hub.register([
  require('./plugins/bar'),
  require('./plugins/foo')
]);
