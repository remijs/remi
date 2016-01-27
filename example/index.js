'use strict'
const remi = require('..')

function Hub() {
  this._registrator = remi(this)
}

Hub.prototype.register = function(plugins) {
  return this._registrator.register(plugins)
}

let hub = new Hub()
hub
  .register([
    {
      register: require('./plugins/bar'),
      options: { sayTimes: 4 },
    },
    require('./plugins/foo'),
  ])
  .then(() => console.log('done'))
