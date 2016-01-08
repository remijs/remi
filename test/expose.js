'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)

const Remi = require('../')
const expose = require('../lib/expose')

describe('plugin expose', function() {
  it('should expose property', function(done) {
    function plugin(app, options, next) {
      app.expose('foo', 1)
      return next()
    }
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0',
    }

    let app = {}
    new Remi({
      extensions: [expose],
    }).register(app, plugin, function(err, app) {
      expect(err).to.be.undefined
      expect(app.plugins.plugin.foo).to.eq(1)

      done()
    })
  })

  it('should expose object', function(done) {
    function plugin(app, options, next) {
      app.expose({
        foo: 1,
        bar: 3,
      })
      return next()
    }
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0',
    }

    let app = {}
    new Remi({
      extensions: [expose],
    }).register(app, plugin, function(err, app) {
      expect(err).to.be.undefined
      expect(app.plugins.plugin.foo).to.eq(1)
      expect(app.plugins.plugin.bar).to.eq(3)

      done()
    })
  })
})
