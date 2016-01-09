# remi

A plugin registrator inspired by [hapi's plugins](http://hapijs.com/tutorials/plugins).

Plugins allow you to very easily break your application up into isolated pieces of
business logic, and reusable utilities.

[![Dependency Status](https://david-dm.org/zkochan/remi/status.svg?style=flat)](https://david-dm.org/zkochan/remi)
[![Build Status](https://travis-ci.org/zkochan/remi.svg?branch=master)](https://travis-ci.org/zkochan/remi)
[![npm version](https://badge.fury.io/js/remi.svg)](http://badge.fury.io/js/remi)


## Installation

```
npm install --save remi
```


## Creating a plugin

Plugins are very simple to write. At their core they are an object with a register
function that has the signature function `(server, options, next)`. That `register`
function then has an `attributes` object attached to it to provide some
additional information about the plugin, such as name and version.

A very simple plugin looks like:

```js
let myPlugin = {
  register: function(app, options, next) {
    next()
  }
}

myPlugin.register.attributes = {
  name: 'myPlugin',
  version: '1.0.0',
}
```

Or when written as an external module:

```js
module.exports = function(app, options, next) {
  next()
}

module.exports.attributes = {
  pkg: require('./package.json'),
}
```

Note that in the first example, we set the `name` and `version` attributes specifically,
however in the second we set a `pkg` parameter with the contents of package.json as
its value. Either method is acceptable.


## The register method

As we've seen above, the register method accepts three parameters, `app`, `options`, and `next`.

The `options` parameter is simply whatever options the user passes to your plugin.
No changes are made and the object is passed directly to your register method.

`next` is a method to be called when your plugin has completed whatever steps are
necessary for it to be registered. This method accepts only one parameter, `err`,
that should only be defined if an error occurred while registering your plugin.

The `app` object is a reference to the `app` your plugin is being loaded in.


## Loading a plugin

Plugins can be loaded one at a time, or as a group in an array, by the
`register()` method of a `Remi` object, for example:

```js
const Remi = require('remi')

// load one plugin
let remi = new Remi()
remi.register(app, require('myplugin'), function(err) {
  if (err) {
    console.error('Failed to load plugin:', err);
  }
});

// load multiple plugins
remi.register(app, [require('myplugin'), require('yourplugin')], function(err) {
  if (err) {
    console.error('Failed to load a plugin:', err);
  }
});
```

To pass options to your plugin, we instead create an object with `register` and `options` keys, such as:

```js
remi.register(app, {
  register: require('myplugin'),
  options: {
    message: 'hello'
  }
}, function(err) {
})
```

These objects can also be passed in an array:

```js
remi.register(app, [{
  register: require('plugin1'),
  options: {}
}, {
  register: require('plugin2'),
  options: {}
}], function(err) {
})
```


## Decorating the API

The `.decorate` method can be used to extend the app's API.

```js
function plugin(app, opts, next) {
  /* The app can be decorated by one property at once */
  app.decorate('foo', function() {
    console.log('foo')
  });

  /* or by several properties at once */
  app.decorate({
    bar: 23,
    qax: 54,
  });

  next()
}
```


## app.expose(key, value)

Used within a plugin to expose a property via app.plugins[name] where:

* `key` - the key assigned (`server.plugins[name][key]`).
* `value` - the value assigned.

```js
exports.register = function(app, opts, next) {
  app.expose('util', function() { console.log('something'); })
  return next()
}
```


## server.expose(obj)

Merges a shallow copy of an object into to the existing content of `server.plugins[name]` where:

* `obj` - the object merged into the exposed properties container.

```js
exports.register = function(app, opts, next) {
  app.expose({ util: function() { console.log('something') } })
  return next()
}
```


## Options can be shared

You can pass a third optional `shared options` parameter. The shared options are
merge with the plugin's options and passed to the register method.

```js
function plugin(app, opts, next) {
  /* opts will equal {bar: 'bar', foo: 'foo'} */

  next()
}

plugin.attributes = {
  name: 'plugin',
  version: '1.0.0',
}

remi.register(app, [{
  register: plugin,
  options: {
    bar: 'bar',
  },
}], {
  foo: 'foo',
}, function (err) {
})
```


## Main plugin

You can specify the plugin that should be registered first by passing its name
through the `main` option of the shared options. The main plugin can't have any
dependencies.

```js
function barPlugin(app, opts, next) {
  console.log('Hello world!')

  next()
}

barPlugin.attributes = {
  name: 'bar-plugin',
  version: '1.0.0',
};

remi.register(app, [fooPlugin, barPlugin, qazPlugin], {
  main: 'bar-plugin' /* the bar-plugin will be registered first */
}, function (err) {
})
```


## Example

You can find a working example in the [example folder](example).

And on RequireBin.

[![view on requirebin](http://requirebin.com/badge.png)](http://requirebin.com/?gist=27ea2b9d6dc72abea03c)


## License

The MIT License (MIT)
