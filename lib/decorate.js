'use strict'

const merge = require('merge')

module.exports = function(remi) {
  let extension = {
    decorate(prop, method) {
      if (typeof prop === 'string') {
        extension[prop] = method
      } else if (typeof prop === 'object') {
        merge(extension, prop)
      } else {
        throw new Error('invalid arguments passed to decorate')
      }

      merge(this, extension)
    },
  }

  remi.pre('createPlugin', function(next, target, plugin) {
    next(merge(target, extension), plugin)
  })
}
