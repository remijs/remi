'use strict'

const registerPlugins = require('../')

function Hub() {
}

Hub.prototype.register = function(plugins, cb) {
  registerPlugins(this, plugins, cb)
}

let hub = new Hub()
hub.register([
  {
    register: require('./plugins/bar'),
    options: { sayTimes: 4 },
  },
  require('./plugins/foo'),
], function() {
  console.log('done')
})
