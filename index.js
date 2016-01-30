'use strict'
const TopoSort = require('topo-sort')
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
    let plugin = plugins.next().value

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
    return {
      register,
      name: attributes.name || attributes.pkg.name,
      version: attributes.version || attributes.pkg && attributes.pkg.version,
      options: Object.assign({}, plugin.options),
      dependencies: attributes.dependencies || [],
    }
  }

  function* sortPlugins(plugins) {
    let tsort = new TopoSort()

    Object.keys(plugins)
      .map(key => plugins[key])
      .forEach(reg => tsort.add(reg.name, reg.dependencies))

    let sortedPluginNames = tsort.sort()
    sortedPluginNames.reverse()

    for (let pluginName of sortedPluginNames) {
      if (!target.registrations[pluginName] && !plugins[pluginName]) {
        throw new Error('Plugin called ' + pluginName +
          ' required by dependencies but wasn\'t registered')
      }

      if (!target.registrations[pluginName]) yield plugins[pluginName]
    }
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

        let newRegistrations = {}
        plugins
          .map(pluginToRegistration)
          .filter(reg => !target.registrations[reg.name])
          .forEach(reg => newRegistrations[reg.name] = reg)

        let sortedPlugins = sortPlugins(newRegistrations)

        return new Promise((resolve, reject) => {
          let cb = err => err ? reject(err) : resolve()
          registerNext(sortedPlugins, cb)
        })
      } catch (err) {
        return Promise.reject(err)
      }
    },
  }
}
