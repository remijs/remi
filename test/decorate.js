'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)

const Remi = require('../')
const decorate = require('../lib/decorate')

describe('decorate', function() {
  it('should decorate with a single property', function(done) {
    function plugin1(app, options, next) {
      app.decorate('foo', 1)
      expect(app.foo).to.eq(1)
      return next()
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
    }
    function plugin2(app, options, next) {
      expect(app.foo).to.eq(1)
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
    new Remi({
      extensions: [decorate],
    }).register(app, plugins, function(err) {
      expect(err).to.be.undefined
      done()
    })
  })

  it('should decorate with with multiple properties', function(done) {
    function plugin1(app, options, next) {
      app.decorate({
        foo: 1,
      })
      expect(app.foo).to.eq(1)
      return next()
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
    }
    function plugin2(app, options, next) {
      expect(app.foo).to.eq(1)
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
    new Remi({
      extensions: [decorate],
    }).register(app, plugins, function(err) {
      expect(err).to.be.undefined
      done()
    })
  })
})
