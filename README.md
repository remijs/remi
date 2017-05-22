# remi

[![Greenkeeper badge](https://badges.greenkeeper.io/remijs/remi.svg)](https://greenkeeper.io/)

> A plugin registrator.

<!--@shields('npm', 'travis', 'coveralls')-->
[![npm version](https://img.shields.io/npm/v/remi.svg)](https://www.npmjs.com/package/remi) [![Build Status](https://img.shields.io/travis/remijs/remi/master.svg)](https://travis-ci.org/remijs/remi) [![Coverage Status](https://img.shields.io/coveralls/remijs/remi/master.svg)](https://coveralls.io/r/remijs/remi?branch=master)
<!--/@-->

Plugins allow you to very easily break your application up into isolated pieces of
business logic, and reusable utilities.

Inspired by [hapi's plugins](http://hapijs.com/tutorials/plugins).

## Installation

```sh
npm install --save remi
```

## Creating a plugin

Plugins are very simple to write. At their core they are an object with a register
function that has the signature function `(server, options, next)`. That `register`
function then has an `attributes` object attached to it to provide some
additional information about the plugin, such as name and version.

A very simple plugin looks like:

```js
function myPlugin (app, options, next) {
  next()
}

myPlugin.attributes = {
  name: 'myPlugin',
  version: '1.0.0',
}
```

Or when written as an external module:

```js
function plugin (app, options, next) {
  next()
}

plugin.attributes = {
  pkg: require('./package.json'),
}

module.exports = plugin
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
const remi = require('remi')

// load one plugin
let registrator = remi(app)
registrator
  .register([{ register: require('myplugin') }])
  .then(() => console.log('myplugin was successfully registered'))
  .catch(err => console.error('Failed to load plugin:', err))

// load multiple plugins
registrator
  .register([{ register: require('myplugin') }, { register: require('yourplugin') }])
  .catch(err => console.error('Failed to load plugin:', err))
```

To pass options to your plugin, we create an object with `register` and `options` keys, such as:

```js
registrator.register({
  register: require('myplugin'),
  options: {
    message: 'hello'
  }
})
```

These objects can also be passed in an array:

```js
registrator.register([{
  register: require('plugin1'),
  options: {}
}, {
  register: require('plugin2'),
  options: {}
}])
```

## License

[MIT](./LICENSE) © [Zoltan Kochan](http://kochan.io)
