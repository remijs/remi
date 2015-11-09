'use strict';

var TopoSort = require('topo-sort');

function registerPlugin(target, plugin) {
  plugin.register(target);
}

function register(target, plugins) {
  var pluginDict = {};
  var tsort = new TopoSort();

  plugins.forEach(function(plugin) {
    pluginDict[plugin.attributes.name] = plugin;
    tsort.add(plugin.attributes.name, plugin.attributes.dependencies || []);
  });

  var sortedPlugins = tsort.sort();
  sortedPlugins.reverse();
  sortedPlugins.forEach(function(pluginName) {
    registerPlugin(target, pluginDict[pluginName]);
  });
}

module.exports = register;
