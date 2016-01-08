'use strict'

const TopoSort = require('topo-sort')
const merge = require('merge')
const magicHook = require('magic-hook')

function Remi(opts) {
  opts = opts || {}

  this._main = opts.main
  this._corePlugins = opts.corePlugins || []
  this._extensions = opts.extensions || []

  magicHook(this, ['createPlugin'])

  this._extensions.forEach(ext => ext(this))
}

Remi.prototype.createPlugin = function(target) {
  return target
}

Remi.prototype._registerNext = function(target, plugins, cb) {
  let plugin = plugins.shift()
  if (!plugin) {
    return cb()
  }
/*
  target.plugins = target.plugins || {}
  target.plugins[plugin.name] = {}*/
  let pluginTarget = this.createPlugin(merge({}, target), plugin)
/*  pluginTarget.root = target

  pluginTarget.expose = function(key, value) {
    if (typeof key === 'string') {
      target.plugins[plugin.name][key] = value
      return
    }
    merge(target.plugins[plugin.name], key)
  }

  pluginTarget.decorate = function(prop, method) {
    let extention
    if (typeof prop === 'string') {
      extention = {}
      extention[prop] = method
    } else if (typeof prop === 'object') {
      extention = prop
    } else {
      throw new Error('invalid arguments passed to decorate')
    }

    merge(pluginTarget, extention)
    merge(target, extention)
  }*/

  plugin.register(pluginTarget, plugin.options, err => {
    if (err) {
      return cb(err)
    }
    this._registerNext(target, plugins, cb)
  })
}

Remi.prototype.register = function(target, plugins/*, sharedOpts, cb*/) {
  let cb
  let sharedOpts
  if (arguments.length === 3) {
    cb = arguments[2]
    sharedOpts = {}
  } else {
    cb = arguments[3]
    sharedOpts = arguments[2]
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
      options: merge({}, plugin.options, sharedOpts),
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
  this._registerNext(target, sortedPlugins, cb)
}

module.exports = Remi
