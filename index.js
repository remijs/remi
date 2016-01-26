'use strict'
const TopoSort = require('topo-sort')
const magicHook = require('magic-hook')
const runAsync = require('run-async')
const kamikaze = require('kamikaze')
const promiseResolver = require('promise-resolver')
const merge = require('merge')

module.exports = class Remi {
  constructor(opts) {
    opts = opts || {}

    this._main = opts.main
    this._registrationTimeout = opts.registrationTimeout || 5000 // 5 seconds
    this._corePlugins = opts.corePlugins || []

    magicHook(this, ['createPlugin'])

    let extensions = opts.extensions || []
    extensions
      .forEach(ext => ext.extension(this, ext.options || {}))
  }
  createPlugin(target) {
    return target
  }
  _registerNext(target, plugins, cb) {
    let plugin = plugins.shift()

    if (!plugin) return cb(null)

    let pluginTarget = this.createPlugin(
      merge({}, { root: target }, target),
      plugin
    )
    pluginTarget.root = target

    runAsync.cb(plugin.register, kamikaze(this._registrationTimeout, err => {
      if (err) {
        let wrapperErr = new Error('error during registering ' + plugin.name +
          '. ' + err)
        wrapperErr.internalError = err
        return cb(wrapperErr)
      }

      this._registerNext(target, plugins, cb)
    }))(merge({}, pluginTarget), plugin.options)
  }
  register(target, plugins) {
    plugins = this._corePlugins.concat(plugins)

    target.registrations = target.registrations || {}

    let registrations = []
    for (let i = 0; i < plugins.length; ++i) {
      let plugin = plugins[i]

      if (typeof plugin === 'function' && !plugin.register) {
        /* plugin is register() function */
        plugin = { register: plugin }
      } else if (!plugin.register) {
        return Promise.reject(new Error('Plugin missing a register method'))
      }

      if (plugin.register.register) { /* Required plugin */
        plugin.register = plugin.register.register
      }

      let attributes = plugin.register.attributes
      let registration = {
        register: plugin.register,
        name: attributes.name || attributes.pkg.name,
        version: attributes.version || attributes.pkg && attributes.pkg.version,
        options: merge({}, plugin.options),
        dependencies: attributes.dependencies || [],
        before: attributes.before || [],
      }

      if (!target.registrations[registration.name]) {
        registrations.push(registration)
        target.registrations[registration.name] = registration
      }
    }

    let mainPlugin = target.registrations[this._main]
    if (this._main) {
      if (!mainPlugin) {
        return Promise.reject(new Error('main plugin called `' + this._main +
          '` is missing'))
      }
      if (mainPlugin.dependencies.length > 0) {
        return Promise.reject(new Error('main plugin cannot have dependencies'))
      }
    }

    /* extend dependencies with values before */
    registrations.forEach(function(registration) {
      registration.before.forEach(function(beforeDep) {
        target.registrations[beforeDep].dependencies.push(registration.name)
      })
    })

    let tsort = new TopoSort()
    registrations.forEach(registration => {
      if (registration.name !== this._main) {
        tsort.add(registration.name, registration.dependencies)
      }
    })

    let sortedPluginNames = tsort.sort()
    sortedPluginNames.reverse()
    let sortedPlugins = []
    if (mainPlugin) {
      sortedPlugins.push(mainPlugin)
    }
    for (let i = 0; i < sortedPluginNames.length; i++) {
      let pluginName = sortedPluginNames[i]
      if (!target.registrations[pluginName]) {
        return Promise.reject(new Error('Plugin called ' + pluginName +
          ' required by dependencies but wasn\'t registered'))
      }
      sortedPlugins.push(target.registrations[pluginName])
    }

    let deferred = promiseResolver.defer()
    this._registerNext(target, sortedPlugins, deferred.cb)
    return deferred.promise
  }
}
