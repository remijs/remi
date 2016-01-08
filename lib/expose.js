'use strict'

const merge = require('merge')

module.exports = function(remi) {
  let plugins = {}

  remi.pre('createPlugin', function(next, target, plugin) {
    target.expose = function(key, value) {
      if (typeof key === 'string') {
        plugins[plugin.name][key] = value
        return
      }
      merge(plugins[plugin.name], key)
      merge(this, {
        plugins,
      })
    }

    next(merge(target, {
      plugins,
    }), plugin)
  })
}
