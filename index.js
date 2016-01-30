'use strict'
const magicHook = require('magic-hook')

module.exports = remi

function remi(target) {
  let internals = {
    register(target, plugin, cb) {
      plugin.register(target, plugin.options, cb)
    },
  }

  magicHook(internals, ['register'])

  function registerNext(plugins, cb) {
    let plugin = plugins.shift()

    if (!plugin) return cb()

    function wrapError(err) {
      let wrapperErr = new Error('Failed to register ' + plugin.name +
        '. ' + err)
      wrapperErr.internalError = err
      return wrapperErr
    }

    internals.register(
      Object.assign({}, { root: target }, target),
      plugin,
      function(err) {
        if (err) return cb(wrapError(err))

        target.registrations[plugin.name] = plugin
        registerNext(plugins, cb)
      }
    )
  }

  function getRegister(plugin) {
    if (typeof plugin !== 'function' && !plugin.register) {
      throw new Error('Plugin missing a register method')
    }

    // plugin is register() function
    if (typeof plugin === 'function' && !plugin.register) return plugin

    // Required plugin
    if (plugin.register.register) return plugin.register.register

    return plugin.register
  }

  function pluginToRegistration(plugin) {
    let register = getRegister(plugin)

    let attributes = register.attributes
    return Object.assign(attributes, {
      register,
      name: attributes.name || attributes.pkg.name,
      version: attributes.version || attributes.pkg && attributes.pkg.version,
      options: Object.assign({}, plugin.options),
    })
  }

  return {
    hook() {
      let args = Array.prototype.slice.call(arguments)
      args.unshift('register')
      internals.pre.apply(null, args)
    },
    register(plugins) {
      try {
        plugins = [].concat(plugins)
        target.registrations = target.registrations || {}

        let newRegistrations = plugins
          .map(pluginToRegistration)
          .filter(reg => !target.registrations[reg.name])

        return new Promise((resolve, reject) => {
          let cb = err => err ? reject(err) : resolve()
          registerNext(newRegistrations, cb)
        })
      } catch (err) {
        return Promise.reject(err)
      }
    },
  }
}
