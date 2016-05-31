# remi

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
let myPlugin = {
  register(app, options, next) {
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
const remi = require('remi')

// load one plugin
let registrator = remi(app)
registrator
  .register(require('myplugin'))
  .then(() => console.log('myplugin was successfully registered'))
  .catch(err => console.error('Failed to load plugin:', err))

// load multiple plugins
registrator
  .register([require('myplugin'), require('yourplugin')])
  .catch(err => console.error('Failed to load plugin:', err))
```

To pass options to your plugin, we instead create an object with `register` and `options` keys, such as:

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

* * *

<!--@dependencies({ shield: true })-->
## <a name="dependencies">Dependencies</a> [![dependency status](https://img.shields.io/david/remijs/remi/master.svg)](https://david-dm.org/remijs/remi/master)

- [babel-runtime](https://github.com/babel/babel/blob/master/packages): babel selfContained runtime
- [magic-hook](https://github.com/zkochan/magic-hook): Extends functions with pre hooks.

<!--/@-->

<!--@devDependencies({ shield: true })-->
## <a name="dev-dependencies">Dev Dependencies</a> [![devDependency status](https://img.shields.io/david/dev/remijs/remi/master.svg)](https://david-dm.org/remijs/remi/master#info=devDependencies)

- [babel-cli](https://github.com/babel/babel/blob/master/packages): Babel command line.
- [babel-plugin-add-module-exports](https://github.com/59naga/babel-plugin-add-module-exports): Fix babel/babel#2212
- [babel-plugin-transform-runtime](https://github.com/babel/babel/blob/master/packages): Externalise references to helpers and builtins, automatically polyfilling your code without polluting globals
- [babel-preset-es2015](https://github.com/babel/babel/blob/master/packages): Babel preset for all es2015 plugins.
- [babel-preset-stage-0](https://github.com/babel/babel/blob/master/packages): Babel preset for stage 0 plugins
- [babel-register](https://github.com/babel/babel/blob/master/packages): babel require hook
- [chai](https://github.com/chaijs/chai): BDD/TDD assertion library for node.js and the browser. Test framework agnostic.
- [istanbul](https://github.com/gotwarlost/istanbul): Yet another JS code coverage tool that computes statement, line, function and branch coverage with module loader hooks to transparently add coverage when running tests. Supports all JS coverage use cases including unit tests, server side functional tests
- [mocha](https://github.com/mochajs/mocha): simple, flexible, fun test framework
- [mos](https://github.com/mosjs/mos): A pluggable module that injects content into your markdown files via hidden JavaScript snippets
- [mos-plugin-readme](https://github.com/mosjs/mos-plugin-readme): A mos plugin for generating README
- [plugiator](https://github.com/zkochan/plugiator): hapi plugins creator
- [sinon](https://github.com/cjohansen/Sinon.JS): JavaScript test spies, stubs and mocks.
- [sinon-chai](https://github.com/domenic/sinon-chai): Extends Chai with assertions for the Sinon.JS mocking framework.
- [standard](https://github.com/feross/standard): JavaScript Standard Style

<!--/@-->
