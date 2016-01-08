'use strict'

const merge = require('merge')

module.exports = function(remi, opts) {
  let plugins = {}

  remi.pre('createPlugin', function(next, target, plugin) {
    plugins[plugin.name] = plugins[plugin.name] || {}

    next(merge(target, {
      plugins,
      expose(key, value) {
        if (typeof key === 'string') {
          plugins[plugin.name][key] = value
          return
        }
        merge(plugins[plugin.name], key)
        merge(this, {
          plugins,
        })
      },
    }), plugin)
  })
}
