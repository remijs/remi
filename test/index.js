'use strict'
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const plugiator = require('plugiator')
chai.use(sinonChai)

const Remi = require('../')

describe('Remi', function() {
  it('should register plugin with no version', function(done) {
    let plugin = plugiator.anonymous((app, options, next) => next())

    let remi = new Remi()
    remi.register({}, { register: plugin }, err => {
      expect(err).to.not.exist
      done()
    })
  })

  it('should register synchronous plugin', function(done) {
    let plugin = plugiator.anonymous((app, opts) => {})

    let remi = new Remi()
    remi.register({}, { register: plugin }, err => {
      expect(err).to.not.exist
      done()
    })
  })

  it('should register plugin that returns a promise', function(done) {
    let plugin = plugiator.anonymous((app, opts) => Promise.resolve())

    let remi = new Remi()
    remi.register({}, { register: plugin }, err => {
      expect(err).to.not.exist
      done()
    })
  })

  it('registers plugin with options', function() {
    let register = sinon.spy()
    let plugin = plugiator.anonymous(register)
    let pluginOpts = { something: true }

    let remi = new Remi()
    return remi
      .register({}, { register: plugin, options: pluginOpts })
      .then(() => {
        expect(register).to.have.been.calledOnce
        expect(register.args[0][1]).to.eql(pluginOpts)
      })
  })

  it('throws error if dependent plugin not present', function(done) {
    let plugin = plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
      dependencies: ['foo'],
    })

    let remi = new Remi()
    remi.register({}, plugin, function(err) {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })

  it('register plugins in correct order when `before` specified', function(done) {
    let plugin2 = sinon.spy(plugiator.noop('plugin2'))
    let plugin1 = sinon.spy(plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
      before: ['plugin2'],
    }))

    let remi = new Remi()
    remi.register({}, [plugin2, plugin1], function(err) {
      expect(err).to.not.exist
      expect(plugin1).to.have.been.calledBefore(plugin2)
      done()
    })
  })

  it('exposes the registrations object', function(done) {
    let plugin1 = plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
    })
    let plugin2 = plugiator.noop({
      name: 'plugin2',
      version: '0.1.0',
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
    new Remi().register(app, plugins, function(err) {
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

  it('should register plugin only once', function(done) {
    let plugin = sinon.spy(plugiator.noop())

    let remi = new Remi({
      corePlugins: [plugin],
    })

    let target = {}
    remi.register(target, [plugin], function(err) {
      expect(err).to.not.exist

      remi.register(target, [plugin], function(err) {
        expect(err).to.not.exist
        expect(plugin).to.have.been.calledOnce
        done()
      })
    })
  })

  it('should return a promise', function() {
    let plugin = sinon.spy(plugiator.noop())

    let remi = new Remi({
      corePlugins: [plugin],
    })

    let target = {}
    return remi
      .register(target, [plugin])
      .then(() => remi.register(target, [plugin]))
      .then(() => {
        expect(plugin).to.have.been.calledOnce
      })
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

    let remi = new Remi({})

    let target = {}
    remi.register(target, [plugin1], function(err) {
      expect(err).to.not.exist

      remi.register(target, [plugin2], function(err) {
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
    function plugin(app, options, next) {
      return next()
    }
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0',
    }

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
  it('should not share properties assigned by another plugin', function(done) {
    function plugin1(app, options, next) {
      app.foo = 1
      return next()
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
    }
    function plugin2(app, options, next) {
      expect(app.foo).to.be.undefined
      return next()
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.1.0',
    }

    let app = {}
    let plugins = [{
      register: plugin1,
      options: {foo: 1},
    }, {
      register: plugin2,
    },]
    new Remi().register(app, plugins, function(err) {
      expect(err).to.not.exist

      done()
    })
  })

  it('should pass all the app props to the plugin', function(done) {
    function plugin(app, options, next) {
      expect(app.foo).to.exist
      expect(app.bar).to.exist
      expect(app.protoFn).to.exist
      expect(app.root.foo).to.exist
      expect(app.root.bar).to.exist
      expect(app.root.protoFn).to.exist
      return next()
    }
    plugin.attributes = {
      name: 'foo-plugin',
      version: '0.0.0',
    }

    function App() {}
    App.prototype.protoFn = function() {}
    let app = new App()
    app.foo = 1
    app.bar = function() {
      return 2
    }
    new Remi().register(app, plugin, function(err) {
      expect(err).to.not.exist
      done()
    })
  })

  it('should share the value in root', function(done) {
    function plugin1(app, options, next) {
      app.root.foo = 1
      return next()
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
    }
    function plugin2(app, options, next) {
      expect(app.foo).to.eq(1)
      expect(app.root.foo).to.eq(1)
      return next()
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.1.0',
    }

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

    new Remi().register(app, plugins, function(err) {
      expect(err).to.not.exist
      done()
    })
  })
})

describe('remi extensions', function() {
  it('should get options', function(done) {
    function extension(remi, options) {
      expect(options.foo).to.eq('bar')
    }

    let sharedOpts = {somethingShared: true}
    new Remi({
      extensions: [extension],
    }).register({}, [], {foo: 'bar'}, function(err) {
      expect(err).to.not.exist
      done()
    })
  })
})
