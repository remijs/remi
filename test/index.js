'use strict'
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const plugiator = require('plugiator')
const Remi = require('../')

chai.use(sinonChai)

describe('Remi', function() {
  let app
  let remi

  beforeEach(function() {
    app = {}
    remi = new Remi()
  })

  it('should register plugin with no version', function() {
    let plugin = plugiator.anonymous((app, options, next) => next())

    return remi
      .register(app, { register: plugin })
      .then(() => {
        expect(app.registrations[plugin.attributes.name]).to.exist
      })
  })

  it('should register synchronous plugin', function() {
    let plugin = plugiator.anonymous((app, opts) => {})

    return remi
      .register(app, { register: plugin })
      .then(() => {
        expect(app.registrations[plugin.attributes.name]).to.exist
      })
  })

  it('should register plugin that returns a promise', function() {
    let plugin = plugiator.anonymous((app, opts) => Promise.resolve())

    return remi.register(app, { register: plugin })
      .then(() => {
        expect(app.registrations[plugin.attributes.name]).to.exist
      })
  })

  it('should register plugin with options', function() {
    let register = sinon.spy()
    let plugin = plugiator.anonymous(register)
    let pluginOpts = { something: true }

    return remi
      .register(app, { register: plugin, options: pluginOpts })
      .then(() => {
        expect(register).to.have.been.calledOnce
        expect(register.args[0][1]).to.eql(pluginOpts)
      })
  })

  it('should throw error if dependent plugin not present', function(done) {
    let plugin = plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
      dependencies: ['foo'],
    })

    remi.register({}, plugin, function(err) {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })

  it('should throw error if one the plugins didn\'t finished registering in time', function(done) {
    let remi = new Remi({
      registrationTimeout: 10,
    })
    remi.register({}, [
      {
        register: plugiator.anonymous((server, opts, next) => undefined),
      },
    ], err => {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })

  it('should register plugins in correct order when `before` specified', function() {
    let plugin2 = sinon.spy(plugiator.noop('plugin2'))
    let plugin1 = sinon.spy(plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
      before: ['plugin2'],
    }))

    return remi
      .register(app, [plugin2, plugin1])
      .then(() => {
        expect(plugin1).to.have.been.calledBefore(plugin2)
      })
  })

  it('should expose the registrations object', function(done) {
    let plugin1 = plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
    })
    let plugin2 = plugiator.noop({
      name: 'plugin2',
      version: '0.1.0',
    })

    let plugins = [
      {
        register: plugin1,
        options: {foo: 1},
      },
      {
        register: plugin2,
      },
    ]
    remi.register(app, plugins, function(err) {
      expect(err).to.not.exist

      expect(app.registrations).to.not.be.undefined
      expect(app.registrations.plugin1).to.not.be.undefined
      expect(app.registrations.plugin1.name).to.eq('plugin1')
      expect(app.registrations.plugin1.version).to.eq('0.0.0')
      expect(app.registrations.plugin1.options.foo).to.eq(1)

      expect(app.registrations.plugin2).to.not.be.undefined
      expect(app.registrations.plugin2.name).to.eq('plugin2')
      expect(app.registrations.plugin2.version).to.eq('0.1.0')

      done()
    })
  })

  it('should register plugin only once', function() {
    let plugin = sinon.spy(plugiator.noop())

    let remi = new Remi({
      corePlugins: [plugin],
    })

    return remi.register(app, [plugin])
      .then(() => remi.register(app, [plugin]))
      .then(() => expect(plugin).to.have.been.calledOnce)
  })

  it('should return a promise', function() {
    let plugin = sinon.spy(plugiator.noop())

    let remi = new Remi({
      corePlugins: [plugin],
    })

    return remi
      .register(app, [plugin])
      .then(() => remi.register(app, [plugin]))
      .then(() => expect(plugin).to.have.been.calledOnce)
  })

  it('should not return an error if dependency was already registered', function(done) {
    let plugin1 = plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
    })
    let plugin2 = plugiator.noop({
      name: 'plugin2',
      version: '0.0.0',
      dependencies: ['plugin1'],
    })

    remi.register(app, [plugin1], function(err) {
      expect(err).to.not.exist

      remi.register(app, [plugin2], function(err) {
        expect(err).to.not.exist
        done()
      })
    })
  })
})

describe('main plugin', function() {
  it('should be registered first', function(done) {
    let plugin = sinon.spy(plugiator.noop())
    let mainPlugin = sinon.spy(plugiator.noop('main'))

    let remi = new Remi({
      main: 'main',
      corePlugins: [mainPlugin],
    })

    remi.register({}, [plugin], function(err) {
      expect(err).to.not.exist
      expect(mainPlugin).to.have.been.calledOnce
      expect(mainPlugin).to.have.been.calledBefore(plugin)
      done()
    })
  })

  it('should throw exception if has dependencies', function(done) {
    let plugin = sinon.spy(plugiator.noop('plugin'))
    let mainPlugin = sinon.spy(plugiator.noop({
      name: 'main',
      version: '0.0.0',
      dependencies: ['plugin'],
    }))

    let remi = new Remi({
      main: 'main',
      corePlugins: [mainPlugin],
    })

    remi.register({}, [plugin], function(err) {
      expect(err).to.be.not.undefined
      done()
    })
  })

  it('should throw exception if main plugin not passed', function(done) {
    let plugin = plugiator.noop()

    let remi = new Remi({
      main: 'main',
    })

    remi.register({}, [plugin], function(err) {
      expect(err).to.be.not.undefined
      done()
    })
  })
})

describe('plugin context', function() {
  it('should not share properties assigned by another plugin', function() {
    let plugin1 = plugiator.anonymous((app, opts) => {
      app.foo = 1
    })
    let plugin2 = plugiator.anonymous((app, opts) => {
      expect(app.foo).to.be.undefined
    })

    let app = {}
    let plugins = [
      {
        register: plugin1,
        options: {foo: 1},
      },
      {
        register: plugin2,
      },
    ]
    let remi = new Remi()
    return remi.register(app, plugins)
  })

  it('should pass all the app props to the plugin', function() {
    let plugin = plugiator.anonymous((app, options) => {
      expect(app.foo).to.exist
      expect(app.bar).to.exist
      expect(app.protoFn).to.exist
      expect(app.root.foo).to.exist
      expect(app.root.bar).to.exist
      expect(app.root.protoFn).to.exist
    })

    function App() {}
    App.prototype.protoFn = function() {}
    let app = new App()
    app.foo = 1
    app.bar = function() {
      return 2
    }
    let remi = new Remi()
    return remi.register(app, plugin)
  })

  it('should share the value in root', function() {
    let plugin1 = plugiator.anonymous((app, options) => {
      app.root.foo = 1
    })
    let plugin2 = plugiator.anonymous((app, options) => {
      expect(app.foo).to.eq(1)
      expect(app.root.foo).to.eq(1)
    })

    let app = {}
    let plugins = [
      {
        register: plugin1,
        options: {foo: 1},
      },
      {
        register: plugin2,
      },
    ]

    let remi = new Remi()
    return remi.register(app, plugins)
  })
})

describe('remi extensions', function() {
  it('should get options', function() {
    function extension(remi, options) {
      expect(options.foo).to.eq('bar')
    }

    let sharedOpts = {somethingShared: true}
    let remi = new Remi({
      extensions: [extension],
    })
    return remi.register({}, [], {foo: 'bar'})
  })
})
