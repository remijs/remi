'use strict'

const TopoSort = require('topo-sort')
const merge = require('merge')
const magicHook = require('magic-hook')
const thenify = require('thenify').withCallback

function Remi(opts) {
  opts = opts || {}

  this._main = opts.main
  this._corePlugins = opts.corePlugins || []
  this._extensions = opts.extensions || []

  magicHook(this, ['createPlugin'])
}

Remi.prototype.createPlugin = function(target) {
  return target
}

Remi.prototype._registerNext = function(target, plugins, cb, prevPluginTarget) {
  let plugin = plugins.shift()
  if (!plugin) {
    return cb(null, prevPluginTarget)
  }

  let pluginTarget = this.createPlugin(merge({}, target), plugin)

  plugin.register(merge({}, pluginTarget), plugin.options, err => {
    if (err) {
      return cb(err)
    }
    this._registerNext(target, plugins, cb, pluginTarget)
  })
}

Remi.prototype.register = thenify(function(target, plugins/*, extOpts, cb*/) {
  let cb
  let extOpts
  if (arguments.length === 3) {
    cb = arguments[2]
    extOpts = {}
  } else {
    cb = arguments[3]
    extOpts = arguments[2]
  }
  plugins = this._corePlugins.concat(plugins)

  target.registrations = target.registrations || {}

  let registrations = []
  for (let i = 0; i < plugins.length; ++i) {
    let plugin = plugins[i]

    if (typeof plugin === 'function' && !plugin.register) {
      /* plugin is register() function */
      plugin = { register: plugin }
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
      return cb(new Error('main plugin called `' + this._main +
        '` is missing'))
    }
    if (mainPlugin.dependencies.length > 0) {
      return cb(new Error('main plugin cannot have dependencies'))
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
      return cb(new Error('Plugin called ' + pluginName +
        ' required by dependencies but wasn\'t registered'))
    }
    sortedPlugins.push(target.registrations[pluginName])
  }

  this._extensions.forEach(ext => ext(this, extOpts))
  this._registerNext(target, sortedPlugins, cb)
})

module.exports = Remi
