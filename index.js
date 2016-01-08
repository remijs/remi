'use strict'

const TopoSort = require('topo-sort')
const merge = require('merge')

function registerNext(target, plugins, cb) {
  let plugin = plugins.shift()
  if (!plugin) {
    return cb()
  }
  target.plugins = target.plugins || {}
  target.plugins[plugin.name] = {}
  let pluginTarget = merge({}, target)
  pluginTarget.root = target
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
  }
  plugin.register(pluginTarget, plugin.options, function(err) {
    if (err) {
      return cb(err)
    }
    registerNext(target, plugins, cb)
  })
}

function register(target, plugins/*, sharedOpts, cb*/) {
  let cb, sharedOpts
  if (arguments.length === 3) {
    cb = arguments[2]
    sharedOpts = {}
  } else {
    cb = arguments[3]
    sharedOpts = arguments[2]
  }
  plugins = [].concat(plugins)

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

    registrations.push(registration)
  }

  let registrationDict = {}
  target.registrations = registrationDict
  registrations.forEach(function(registration) {
    registrationDict[registration.name] = registration
  })

  let mainPlugin = registrationDict[sharedOpts.main]
  if (sharedOpts.main) {
    if (!mainPlugin) {
      return cb(new Error('main plugin called `' + sharedOpts.main +
        '` is missing'))
    }
    if (mainPlugin.dependencies.length > 0) {
      return cb(new Error('main plugin cannot have dependencies'))
    }
  }

  /* extend dependencies with values before */
  registrations.forEach(function(registration) {
    registration.before.forEach(function(beforeDep) {
      registrationDict[beforeDep].dependencies.push(registration.name)
    })
  })

  let tsort = new TopoSort()
  registrations.forEach(function(registration) {
    if (registration.name !== sharedOpts.main) {
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
    if (!registrationDict[pluginName]) {
      return cb(new Error('Plugin called ' + pluginName +
        ' required by dependencies but wasn\'t registered'))
    }
    sortedPlugins.push(registrationDict[pluginName])
  }
  registerNext(target, sortedPlugins, cb)
}

module.exports = register
