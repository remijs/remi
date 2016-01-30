'use strict'
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const plugiator = require('plugiator')
const remi = require('..')

chai.use(sinonChai)

describe('remi', function() {
  let app
  let registrator

  beforeEach(function() {
    app = {}
    registrator = remi(app)
  })

  it('should register plugin with no version', function() {
    let plugin = plugiator.anonymous((app, options, next) => next())

    return registrator
      .register({ register: plugin })
      .then(() => expect(app.registrations[plugin.attributes.name]).to.exist)
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

    return registrator
      .register({ register: plugin })
      .then(() => {
        expect(app.registrations[name]).to.exist
        expect(app.registrations[name].name).to.eq(name)
        expect(app.registrations[name].version).to.eq(version)
      })
  })

  it('should pass all the attributes to the registrations object', function() {
    let plugin = plugiator.noop({
      name: 'some-name',
      foo: 'foo',
    })

    return registrator
      .register({ register: plugin })
      .then(() => {
        expect(app.registrations[plugin.attributes.name].foo).to.eq('foo')
      })
  })

  it('should register plugin that is passed as an object', function() {
    let register = sinon.spy(plugiator.noop())
    let plugin = { register }

    return registrator
      .register({ register: plugin })
      .then(() => {
        expect(register).to.have.been.calledOnce
      })
  })

  it('should register plugin with options', function() {
    let register = sinon.spy(plugiator.noop())
    let pluginOpts = { something: true }

    return registrator
      .register({ register: register, options: pluginOpts })
      .then(() => {
        expect(register).to.have.been.calledOnce
        expect(register.args[0][1]).to.eql(pluginOpts)
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
    return registrator.register(plugins).then(() => {
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

    return registrator.register([plugin])
      .then(() => registrator.register([plugin]))
      .then(() => expect(plugin).to.have.been.calledOnce)
  })

  it('should throw error if no register method passed', function(done) {
    registrator
      .register({ attributes: {name: 'foo'} })
      .catch(err => {
        expect(err).to.be.an.instanceof(Error, 'Plugin missing a register method')
        done()
      })
  })

  it('should throw error if one of the register methods has thrown one', function(done) {
    registrator
      .register({
        register: plugiator.create('foo', (app, opts, next) => next(new Error('Some error'))),
      })
      .catch(err => {
        expect(err).to.be.an.instanceof(Error, 'Failed to register foo. Error: Some error')
        done()
      })
  })
})

describe('plugin context', function() {
  it('should not share properties assigned by another plugin', function() {
    let plugin1 = plugiator.anonymous((app, opts, next) => {
      app.foo = 1
      next()
    })
    let plugin2 = plugiator.anonymous((app, opts, next) => {
      expect(app.foo).to.be.undefined
      next()
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
    let registrator = remi(app)
    return registrator.register(plugins)
  })

  it('should pass all the enumerable app props to the plugin', function() {
    let plugin = plugiator.anonymous((app, options, next) => {
      expect(app.foo).to.exist
      expect(app.bar).to.exist
      expect(app.root.foo).to.exist
      expect(app.root.bar).to.exist
      next()
    })

    let app = {
      foo: 1,
      bar() {},
    }
    let registrator = remi(app)
    return registrator.register(plugin)
  })

  it('should share the value in root', function() {
    let plugin1 = plugiator.anonymous((app, options, next) => {
      app.root.foo = 1
      next()
    })
    let plugin2 = plugiator.anonymous((app, options, next) => {
      expect(app.foo).to.eq(1)
      expect(app.root.foo).to.eq(1)
      next()
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

    let registrator = remi(app)
    return registrator.register(plugins)
  })
})

describe('remi hooks', function() {
  it('should get options', function() {
    let app = {}
    let registrator = remi(app)
    registrator.hook((next, target, plugin, cb) => {
      next(Object.assign({}, { foo: 1 }, target), plugin, cb)
    })
    return registrator.register(plugiator.anonymous((target, server, next) => {
      expect(target.foo).to.eq(1)
      next()
    }))
  })
})
