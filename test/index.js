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

  it('should register plugin with attributes from a package.json', function() {
    let name = 'foo'
    let version = '2.4.0'
    let plugin = plugiator.create({
      pkg: {
        name,
        version,
      },
    }, (app, options, next) => next())

    return remi
      .register(app, { register: plugin })
      .then(() => {
        expect(app.registrations[name]).to.exist
        expect(app.registrations[name].name).to.eq(name)
        expect(app.registrations[name].version).to.eq(version)
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

  it('should register plugin that is passed as an object', function() {
    let register = sinon.spy()
    let plugin = {
      register: plugiator.anonymous(register),
    }

    return remi
      .register(app, { register: plugin })
      .then(() => {
        expect(register).to.have.been.calledOnce
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

    remi.register({}, plugin).catch(err => {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })

  it('should throw error if one the plugins didn\'t finished registering in time', function(done) {
    let remi = new Remi({
      registrationTimeout: 10,
    })
    remi
      .register({}, [
        {
          register: plugiator.anonymous((server, opts, next) => undefined),
        },
      ])
      .catch(err => {
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

  it('should expose the registrations object', function() {
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
    return remi.register(app, plugins).then(() => {
      expect(app.registrations).to.not.be.undefined
      expect(app.registrations.plugin1).to.not.be.undefined
      expect(app.registrations.plugin1.name).to.eq('plugin1')
      expect(app.registrations.plugin1.version).to.eq('0.0.0')
      expect(app.registrations.plugin1.options.foo).to.eq(1)

      expect(app.registrations.plugin2).to.not.be.undefined
      expect(app.registrations.plugin2.name).to.eq('plugin2')
      expect(app.registrations.plugin2.version).to.eq('0.1.0')
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

  it('should not return an error if dependency was already registered', function() {
    let plugin1 = plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
    })
    let plugin2 = plugiator.noop({
      name: 'plugin2',
      version: '0.0.0',
      dependencies: ['plugin1'],
    })

    return remi.register(app, [plugin1])
      .then(() => remi.register(app, [plugin2]))
  })

  it('should throw error if no register method passed', function(done) {
    remi
      .register(app, { attributes: {name: 'foo'} })
      .catch(err => {
        expect(err).to.be.an.instanceof(Error, 'Plugin missing a register method')
        done()
      })
  })
})

describe('main plugin', function() {
  it('should be registered first', function() {
    let plugin = sinon.spy(plugiator.noop())
    let mainPlugin = sinon.spy(plugiator.noop('main'))

    let remi = new Remi({
      main: 'main',
      corePlugins: [mainPlugin],
    })

    return remi.register({}, [plugin])
      .then(() => {
        expect(mainPlugin).to.have.been.calledOnce
        expect(mainPlugin).to.have.been.calledBefore(plugin)
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

    remi.register({}, [plugin]).catch(err => {
      expect(err).to.be.not.undefined
      done()
    })
  })

  it('should throw exception if main plugin not passed', function(done) {
    let plugin = plugiator.noop()

    let remi = new Remi({
      main: 'main',
    })

    remi.register({}, [plugin]).catch(err => {
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
    let extension = sinon.spy((remi, opts) => {
      expect(opts.foo).to.eq('bar')
    })

    let remi = new Remi({
      extensions: [{
        extension,
        options: { foo: 'bar' },
      },],
    })
    expect(extension).to.be.calledOnce
  })

  it('should never pass no options', function() {
    let extension = sinon.spy((remi, opts) => {
      expect(opts).to.eql({})
    })

    let remi = new Remi({
      extensions: [{
        extension,
      },],
    })
    expect(extension).to.be.calledOnce
  })
})
