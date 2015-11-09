'use strict';

var TopoSort = require('topo-sort');

function registerPlugin(target, plugin) {
  plugin.register.register(target, plugin.options);
}

function register(target, plugins) {
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

  var sortedPlugins = tsort.sort();
  sortedPlugins.reverse();
  sortedPlugins.forEach(function(pluginName) {
    registerPlugin(target, pluginDict[pluginName]);
  });
}

module.exports = register;
