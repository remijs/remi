'use strict'
const describe = require('mocha').describe
const beforeEach = require('mocha').beforeEach
const it = require('mocha').it
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const plugiator = require('plugiator')
const remi = require('..')

chai.use(require('sinon-chai'))

describe('remi', function() {
  let app
  let registrator

  beforeEach(function() {
    app = {}
    registrator = remi(app)
  })

  it('should register plugin with no version', function() {
    const plugin = plugiator.anonymous((app, options, next) => next())

    return registrator
      .register({ register: plugin })
      .then(() => expect(app.registrations[plugin.attributes.name]).to.exist)
  })

  it('should register plugin with attributes from a package.json', function() {
    const name = 'foo'
    const version = '2.4.0'
    const plugin = plugiator.create({
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
    const plugin = plugiator.noop({
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
    const register = sinon.spy(plugiator.noop())
    const plugin = { register }

    return registrator
      .register({ register: plugin })
      .then(() => {
        expect(register).to.have.been.calledOnce
      })
  })

  it('should register plugin with options', function() {
    const register = sinon.spy(plugiator.noop())
    const pluginOpts = { something: true }

    return registrator
      .register({ register: register, options: pluginOpts })
      .then(() => {
        expect(register).to.have.been.calledOnce
        expect(register.args[0][1]).to.eql(pluginOpts)
      })
  })

  it('should expose the registrations object', function() {
    const plugin1 = plugiator.noop({
      name: 'plugin1',
      version: '0.0.0',
    })
    const plugin2 = plugiator.noop({
      name: 'plugin2',
      version: '0.1.0',
    })

    const plugins = [
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
    const plugin = sinon.spy(plugiator.noop())

    return registrator.register([plugin])
      .then(() => registrator.register([plugin]))
      .then(() => expect(plugin).to.have.been.calledOnce)
  })

  it('should throw error if no register method passed', function(done) {
    registrator
      .register({ attributes: {name: 'foo'} })
      .catch(err => {
        expect(err).to.be.an
          .instanceof(Error, 'Plugin missing a register method')
        done()
      })
  })

  it('should throw error if one of the register methods has thrown one',
    function(done) {
      registrator
        .register({
          register: plugiator
            .create('foo', (app, opts, next) => next(new Error('Some error'))),
        })
        .catch(err => {
          expect(err).to.be.an
            .instanceof(Error, 'Failed to register foo. Error: Some error')
          done()
        })
    }
  )

  describe('plugin context', function() {
    it('should not share properties assigned by another plugin', function() {
      const plugin1 = plugiator.anonymous((app, opts, next) => {
        app.foo = 1
        next()
      })
      const plugin2 = plugiator.anonymous((app, opts, next) => {
        expect(app.foo).to.be.undefined
        next()
      })

      const plugins = [
        {
          register: plugin1,
          options: {foo: 1},
        },
        {
          register: plugin2,
        },
      ]
      return registrator.register(plugins)
    })

    it('should pass all the enumerable app props to the plugin', function() {
      const plugin = plugiator.anonymous((app, options, next) => {
        expect(app.foo).to.exist
        expect(app.bar).to.exist
        expect(app.root.foo).to.exist
        expect(app.root.bar).to.exist
        next()
      })

      app.foo = 1
      app.bar = function() {}
      return registrator.register(plugin)
    })

    it('should share the value in root', function() {
      const plugin1 = plugiator.anonymous((app, options, next) => {
        app.root.foo = 1
        next()
      })
      const plugin2 = plugiator.anonymous((app, options, next) => {
        expect(app.foo).to.eq(1)
        expect(app.root.foo).to.eq(1)
        next()
      })

      const plugins = [
        {
          register: plugin1,
          options: {foo: 1},
        },
        {
          register: plugin2,
        },
      ]

      return registrator.register(plugins)
    })
  })

  describe('remi hooks', function() {
    it('should get options', function() {
      registrator.hook((next, target, plugin, cb) => {
        next(Object.assign({}, { foo: 1 }, target), plugin, cb)
      })
      return registrator
        .register(plugiator.anonymous((target, server, next) => {
          expect(target.foo).to.eq(1)
          next()
        }))
    })

    it('should add several hooks passed as arguments', function() {
      function noopHook(next, target, plugin, cb) {
        next(target, plugin, cb)
      }
      const hook1 = sinon.spy(noopHook)
      const hook2 = sinon.spy(noopHook)
      registrator.hook(hook1, hook2)
      return registrator
        .register(plugiator.anonymous((target, server, next) => {
          expect(hook1).to.have.been.calledOnce
          expect(hook2).to.have.been.calledOnce
          next()
        }))
    })

    it('should add several hooks passed in an array', function() {
      function noopHook(next, target, plugin, cb) {
        next(target, plugin, cb)
      }
      const hook1 = sinon.spy(noopHook)
      const hook2 = sinon.spy(noopHook)
      registrator.hook([hook1, hook2])
      return registrator
        .register(plugiator.anonymous((target, server, next) => {
          expect(hook1).to.have.been.calledOnce
          expect(hook2).to.have.been.calledOnce
          next()
        }))
    })
  })
})
