'use strict';

var TopoSort = require('topo-sort');
var merge = require('merge');

function registerNext(target, plugins, cb) {
  var plugin = plugins.shift();
  if (!plugin) {
    return cb();
  }
  target.plugins = target.plugins || {};
  target.plugins[plugin.name] = {};
  var pluginTarget = merge({}, target);
  pluginTarget.root = target;
  pluginTarget.expose = function(key, value) {
    if (typeof key === 'string') {
      target.plugins[plugin.name][key] = value;
      return;
    }
    merge(target.plugins[plugin.name], key);
  };
  pluginTarget.decorate = function(prop, method) {
    var extention;
    if (typeof prop === 'string') {
      extention = {};
      extention[prop] = method;
    } else if (typeof prop === 'object') {
      extention = prop;
    } else {
      throw new Error('invalid arguments passed to decorate');
    }

    merge(pluginTarget, extention);
    merge(target, extention);
  };
  plugin.register(pluginTarget, plugin.options, function(err) {
    if (err) {
      return cb(err);
    }
    registerNext(target, plugins, cb);
  });
}

function register(target, plugins/*, sharedOpts, cb*/) {
  var cb, sharedOpts;
  if (arguments.length === 3) {
    cb = arguments[2];
    sharedOpts = {};
  } else {
    cb = arguments[3];
    sharedOpts = arguments[2];
  }
  plugins = [].concat(plugins);

  var registrations = [];
  for (var i = 0; i < plugins.length; ++i) {
    var plugin = plugins[i];

    if (typeof plugin === 'function' && !plugin.register) {
      /* plugin is register() function */
      plugin = { register: plugin };
    }

    if (plugin.register.register) { /* Required plugin */
      plugin.register = plugin.register.register;
    }

    var attributes = plugin.register.attributes;
    var registration = {
      register: plugin.register,
      name: attributes.name || attributes.pkg.name,
      version: attributes.version || attributes.pkg.version,
      options: merge({}, plugin.options, sharedOpts),
      dependencies: attributes.dependencies || [],
      before: attributes.before || []
    };

    registrations.push(registration);
  }

  var registrationDict = {};
  target.registrations = registrationDict;
  registrations.forEach(function(registration) {
    registrationDict[registration.name] = registration;
  });

  var mainPlugin = registrationDict[sharedOpts.main];
  if (sharedOpts.main) {
    if (!mainPlugin) {
      return cb(new Error('main plugin called `' + sharedOpts.main +
        '` is missing'));
    }
    if (mainPlugin.dependencies.length > 0) {
      return cb(new Error('main plugin cannot have dependencies'));
    }
  }

  /* extend dependencies with values before */
  registrations.forEach(function(registration) {
    registration.before.forEach(function(beforeDep) {
      registrationDict[beforeDep].dependencies.push(registration.name);
    });
  });

  var tsort = new TopoSort();
  registrations.forEach(function(registration) {
    if (registration.name !== sharedOpts.main) {
      tsort.add(registration.name, registration.dependencies);
    }
  });

  var sortedPluginNames = tsort.sort();
  sortedPluginNames.reverse();
  var sortedPlugins = [];
  if (mainPlugin) {
    sortedPlugins.push(mainPlugin);
  }
  for (var i = 0; i < sortedPluginNames.length; i++) {
    var pluginName = sortedPluginNames[i];
    if (!registrationDict[pluginName]) {
      return cb(new Error('Plugin called ' + pluginName +
        ' required by dependencies but wasn\'t registered'));
    }
    sortedPlugins.push(registrationDict[pluginName]);
  }
  registerNext(target, sortedPlugins, cb);
}

module.exports = register;
