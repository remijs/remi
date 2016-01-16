'use strict'
const merge = require('merge')

module.exports = function(remi, opts) {
  remi.pre('createPlugin', function(next, target, plugin) {
    let realm = {
      plugin: plugin.name,
      pluginOptions: target.registrations[plugin.name].options,
    }

    next(merge(target, {
      realm,
    }), plugin)
  })
}
