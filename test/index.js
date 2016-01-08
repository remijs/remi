'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)

const Remi = require('../')

describe('register-plugin', function() {
  it('should register plugin with no version', function(done) {
    function test(app, options, next) {
      return next()
    }
    test.attributes = {
      name: 'test',
    }

    new Remi().register({}, { register: test }, function(err) {
      expect(err).to.not.exist
      done()
    })
  })

  it('registers plugin with options', function(done) {
    function test(app, options, next) {
      expect(options.something).to.be.true
      return next()
    }
    test.attributes = {
      name: 'test',
      version: '0.0.0',
    }

    new Remi().register({}, { register: test, options: { something: true } }, function(err) {
      expect(err).to.not.exist
      done()
    })
  })

  it('registers plugin with plugin and shared options', function(done) {
    function test(app, options, next) {
      expect(options.something).to.be.true
      expect(options.somethingShared).to.be.true
      return next()
    }
    test.attributes = {
      name: 'test',
      version: '0.0.0',
    }

    let sharedOpts = {somethingShared: true}
    new Remi().register({}, { register: test, options: { something: true } }, sharedOpts, function(err) {
      expect(err).to.not.exist
      done()
    })
  })

  it('throws error if dependent plugin not present', function(done) {
    function test(app, options, next) {
      expect(options.something).to.be.true
      return next()
    }
    test.attributes = {
      name: 'plugin1',
      version: '0.0.0',
      dependencies: ['foo'],
    }

    new Remi().register({}, test, function(err) {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })

  it('register plugins in correct order when `before` specified', function(done) {
    let plugin2 = sinon.spy(function(app, options, next) {
      return next()
    })
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.0.0',
    }
    let plugin1 = sinon.spy(function(app, options, next) {
      return next()
    })
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
      before: ['plugin2'],
    }

    new Remi().register({}, [plugin2, plugin1], function(err) {
      expect(err).to.be.undefined
      expect(plugin1).to.have.been.calledBefore(plugin2)
      done()
    })
  })

  it('exposes the registrations object', function(done) {
    function plugin1(app, options, next) {
      return next()
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
    }
    function plugin2(app, options, next) {
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
      expect(err).to.be.undefined

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
    let plugin = sinon.spy(function(app, options, next) {
      return next()
    })
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0',
    }

    let remi = new Remi({
      corePlugins: [plugin],
    })

    let target = {}
    remi.register(target, [plugin], function(err) {
      expect(err).to.be.undefined

      remi.register(target, [plugin], function(err) {
        expect(err).to.be.undefined
        expect(plugin).to.have.been.calledOnce
        done()
      })
    })
  })

  it('should not return an error if dependency was already registered', function(done) {
    function plugin1(app, options, next) {
      return next()
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
    }
    function plugin2(app, options, next) {
      return next()
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.0.0',
      dependencies: ['plugin1'],
    }

    let remi = new Remi({})

    let target = {}
    remi.register(target, [plugin1], function(err) {
      expect(err).to.be.undefined

      remi.register(target, [plugin2], function(err) {
        expect(err).to.be.undefined
        done()
      })
    })
  })
})

describe('main plugin', function() {
  it('should be registered first', function(done) {
    let plugin = sinon.spy(function(app, options, next) {
      return next()
    })
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0',
    }
    let mainPlugin = sinon.spy(function(app, options, next) {
      return next()
    })
    mainPlugin.attributes = {
      name: 'main',
      version: '0.0.0',
    }

    let remi = new Remi({
      main: 'main',
      corePlugins: [mainPlugin],
    })

    remi.register({}, [plugin], function(err) {
      expect(err).to.be.undefined
      expect(mainPlugin).to.have.been.calledOnce
      expect(mainPlugin).to.have.been.calledBefore(plugin)
      done()
    })
  })

  it('should throw exception if has dependencies', function(done) {
    let plugin = sinon.spy(function(app, options, next) {
      return next()
    })
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0',
    }
    let mainPlugin = sinon.spy(function(app, options, next) {
      return next()
    })
    mainPlugin.attributes = {
      name: 'main',
      version: '0.0.0',
      dependencies: ['plugin'],
    }

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
      expect(err).to.be.undefined

      done()
    })
  })

  it('should have a plugin namespace in plugins', function(done) {
    function plugin(app, options, next) {
      expect(app.plugins['foo-plugin']).to.be.not.undefined
      return next()
    }
    plugin.attributes = {
      name: 'foo-plugin',
      version: '0.0.0',
    }

    let app = {}
    new Remi().register(app, plugin, function(err) {
      expect(err).to.be.undefined

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
    let plugins = [{
      register: plugin1,
      options: {foo: 1},
    }, {
      register: plugin2,
    },]
    new Remi().register(app, plugins, function(err) {
      expect(err).to.be.undefined

      done()
    })
  })

  it('should pass all the app props to the plugin', function(done) {
    function plugin(app, options, next) {
      expect(app.foo).to.exist
      expect(app.bar).to.exist
      expect(app.protoFn).to.exist
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
      expect(err).to.be.undefined
      done()
    })
  })
})
