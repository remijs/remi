'use strict'

const Remi = require('../')

function Hub() {
  this._remi = new Remi()
}

Hub.prototype.register = function(plugins, cb) {
  this._remi.register(this, plugins, cb)
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
