'use strict';

var expect = require('chai').expect;
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
});
