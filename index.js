'use strict';

var TopoSort = require('topo-sort');

function registerNext(target, plugins, cb) {
  var plugin = plugins.shift();
  if (!plugin) {
    return cb();
  }
  plugin.register(target, plugin.pluginOptions, function(err) {
    if (err) {
      return cb(err);
    }
    registerNext(target, plugins, cb);
  });
}

function register(target, plugins, cb) {
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
      pluginOptions: plugin.options,
      dependencies: attributes.dependencies
    };

    registrations.push(registration);
  }

  var registrationDict = {};
  var tsort = new TopoSort();
  registrations.forEach(function(registration) {
    registrationDict[registration.name] = registration;
    var deps = registration.dependencies || [];
    tsort.add(registration.name, [].concat(deps));
  });

  var sortedPluginNames = tsort.sort();
  sortedPluginNames.reverse();
  var sortedPlugins = [];
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
