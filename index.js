'use strict';

var TopoSort = require('topo-sort');

function registerNext(target, plugins, cb) {
  var plugin = plugins.shift();
  if (!plugin) {
    return cb();
  }
  plugin.register.register(target, plugin.options, function(err) {
    if (err) {
      return cb(err);
    }
    registerNext(target, plugins, cb);
  });
}

function register(target, plugins, cb) {
  var pluginDict = {};
  var tsort = new TopoSort();

  plugins.forEach(function(plugin) {
    plugin = plugin.attributes ? {
      register: plugin,
      options: {}
    } : plugin;
    pluginDict[plugin.register.attributes.name] = plugin;
    tsort.add(plugin.register.attributes.name, plugin.register.attributes.dependencies || []);
  });

  var sortedPluginNames = tsort.sort();
  sortedPluginNames.reverse();
  var sortedPlugins = sortedPluginNames.map(function(pluginName) {
    return pluginDict[pluginName];
  });
  registerNext(target, sortedPlugins, cb);
}

module.exports = register;
