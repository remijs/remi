'use strict'
const remi = require('..')

function Hub () {
  this._registrator = remi(this)
}

Hub.prototype.register = function (plugins) {
  return this._registrator.register(plugins)
}

let hub = new Hub()
hub
  .register([
    require('./plugins/foo'),
    {
      register: require('./plugins/bar'),
      options: { sayTimes: 4 }
    }
  ])
  .then(() => console.log('done'))
  .catch((err) => console.error(err))
