'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)

const Remi = require('../')
const realm = require('../lib/realm')

describe('realm', function() {
  it('should path realm property', function(done) {
    function plugin1(app, options, next) {
      expect(app.realm.plugin).to.eq('plugin1')
      expect(app.realm.pluginOptions.foo).to.eq(1)
      return next()
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
    }

    let app = {}
    let plugins = [{
      register: plugin1,
      options: {foo: 1},
    },]
    new Remi({
      extensions: [realm],
    }).register(app, plugins, function(err) {
      expect(err).to.not.exist
      done()
    })
  })
})
