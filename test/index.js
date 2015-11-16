'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var registerPlugin = require('../');

describe('register-plugin', function() {
  it('registers plugin with options', function(done) {
    function test(app, options, next) {
      expect(options.something).to.be.true;
      return next();
    }
    test.attributes = {
      name: 'test',
      version: '0.0.0'
    };

    registerPlugin({}, { register: test, options: { something: true } }, function(err) {
      expect(err).to.not.exist;
      done();
    });
  });

  it('registers plugin with plugin and shared options', function(done) {
    function test(app, options, next) {
      expect(options.something).to.be.true;
      expect(options.somethingShared).to.be.true;
      return next();
    }
    test.attributes = {
      name: 'test',
      version: '0.0.0'
    };

    var sharedOpts = {somethingShared: true};
    registerPlugin({}, { register: test, options: { something: true } }, sharedOpts, function(err) {
      expect(err).to.not.exist;
      done();
    });
  });

  it('throws error if dependent plugin not present', function(done) {
    function test(app, options, next) {
      expect(options.something).to.be.true;
      return next();
    }
    test.attributes = {
      name: 'plugin1',
      version: '0.0.0',
      dependencies: ['foo']
    };

    registerPlugin({}, test, function(err) {
      expect(err).to.be.an.instanceof(Error);
      done();
    });
  });

  it('register plugins in correct order when `before` specified', function(done) {
    var plugin2 = sinon.spy(function(app, options, next) {
      return next();
    });
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.0.0'
    };
    var plugin1 = sinon.spy(function plugin1(app, options, next) {
      return next();
    });
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0',
      before: ['plugin2']
    };

    registerPlugin({}, [plugin2, plugin1], function(err) {
      expect(err).to.be.undefined;
      expect(plugin1).to.have.been.calledBefore(plugin2);
      done();
    });
  });
});
