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

  it('passes an error to the callback if error in plugin', function(done) {
    function test(app, options, next) {
      throw 'error';
    }
    test.attributes = {
      name: 'test',
      version: '0.0.0'
    };

    registerPlugin({}, test, function(err) {
      expect(err).to.eq('error');
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
    var plugin1 = sinon.spy(function(app, options, next) {
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

  it('exposes the registrations object', function(done) {
    function plugin1(app, options, next) {
      return next();
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0'
    };
    function plugin2(app, options, next) {
      return next();
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.1.0'
    };

    var app = {};
    var plugins = [{
      register: plugin1,
      options: {foo: 1}
    }, {
      register: plugin2
    }];
    registerPlugin(app, plugins, function(err) {
      expect(err).to.be.undefined;

      expect(app.registrations).to.not.be.undefined;
      expect(app.registrations.plugin1).to.not.be.undefined;
      expect(app.registrations.plugin1.name).to.eq('plugin1');
      expect(app.registrations.plugin1.version).to.eq('0.0.0');
      expect(app.registrations.plugin1.options.foo).to.eq(1);

      expect(app.registrations.plugin2).to.not.be.undefined;
      expect(app.registrations.plugin2.name).to.eq('plugin2');
      expect(app.registrations.plugin2.version).to.eq('0.1.0');

      done();
    });
  });
});

describe('main plugin', function() {
  it('should be registered first', function(done) {
    var plugin = sinon.spy(function(app, options, next) {
      return next();
    });
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0'
    };
    var mainPlugin = sinon.spy(function(app, options, next) {
      return next();
    });
    mainPlugin.attributes = {
      name: 'main',
      version: '0.0.0'
    };

    registerPlugin({}, [plugin, mainPlugin], {main: 'main'}, function(err) {
      expect(err).to.be.undefined;
      expect(mainPlugin).to.have.been.calledOnce;
      expect(mainPlugin).to.have.been.calledBefore(plugin);
      done();
    });
  });

  it('should throw exception if has dependencies', function(done) {
    var plugin = sinon.spy(function(app, options, next) {
      return next();
    });
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0'
    };
    var mainPlugin = sinon.spy(function(app, options, next) {
      return next();
    });
    mainPlugin.attributes = {
      name: 'main',
      version: '0.0.0',
      dependencies: ['plugin']
    };

    registerPlugin({}, [plugin, mainPlugin], {main: 'main'}, function(err) {
      expect(err).to.be.not.undefined;
      done();
    });
  });

  it('should throw exception if main plugin not passed', function(done) {
    var plugin = function(app, options, next) {
      return next();
    };
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0'
    };

    registerPlugin({}, [plugin], {main: 'main'}, function(err) {
      expect(err).to.be.not.undefined;
      done();
    });
  });
});

describe('plugin context', function() {
  it('should not share properties assigned by another plugin', function(done) {
    function plugin1(app, options, next) {
      app.foo = 1;
      return next();
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0'
    };
    function plugin2(app, options, next) {
      expect(app.foo).to.be.undefined;
      return next();
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.1.0'
    };

    var app = {};
    var plugins = [{
      register: plugin1,
      options: {foo: 1}
    }, {
      register: plugin2
    }];
    registerPlugin(app, plugins, function(err) {
      expect(err).to.be.undefined;

      done();
    });
  });

  it('should have a plugin namespace in plugins', function(done) {
    function plugin(app, options, next) {
      expect(app.plugins['foo-plugin']).to.be.not.undefined;
      return next();
    }
    plugin.attributes = {
      name: 'foo-plugin',
      version: '0.0.0'
    };

    var app = {};
    registerPlugin(app, plugin, function(err) {
      expect(err).to.be.undefined;

      done();
    });
  });

  it('should share the value in root', function(done) {
    function plugin1(app, options, next) {
      app.root.foo = 1;
      return next();
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0'
    };
    function plugin2(app, options, next) {
      expect(app.foo).to.eq(1);
      expect(app.root.foo).to.eq(1);
      return next();
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.1.0'
    };

    var app = {};
    var plugins = [{
      register: plugin1,
      options: {foo: 1}
    }, {
      register: plugin2
    }];
    registerPlugin(app, plugins, function(err) {
      expect(err).to.be.undefined;

      done();
    });
  });
});

describe('plugin expose', function() {
  it('should expose property', function(done) {
    function plugin(app, options, next) {
      app.expose('foo', 1);
      return next();
    }
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0'
    };

    var app = {};
    registerPlugin(app, plugin, function(err) {
      expect(err).to.be.undefined;
      expect(app.plugins.plugin.foo).to.eq(1);

      done();
    });
  });

  it('should expose object', function(done) {
    function plugin(app, options, next) {
      app.expose({
        foo: 1,
        bar: 3
      });
      return next();
    }
    plugin.attributes = {
      name: 'plugin',
      version: '0.0.0'
    };

    var app = {};
    registerPlugin(app, plugin, function(err) {
      expect(err).to.be.undefined;
      expect(app.plugins.plugin.foo).to.eq(1);
      expect(app.plugins.plugin.bar).to.eq(3);

      done();
    });
  });
});

describe('decorate', function() {
  it('should decorate with a single property', function(done) {
    function plugin1(app, options, next) {
      app.decorate('foo', 1);
      expect(app.foo).to.eq(1);
      expect(app.root.foo).to.eq(1);
      return next();
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0'
    };
    function plugin2(app, options, next) {
      expect(app.foo).to.eq(1);
      expect(app.root.foo).to.eq(1);
      return next();
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.1.0'
    };

    var app = {};
    var plugins = [{
      register: plugin1,
      options: {foo: 1}
    }, {
      register: plugin2
    }];
    registerPlugin(app, plugins, function(err) {
      expect(err).to.be.undefined;

      expect(app.foo).to.eq(1);

      done();
    });
  });

  it('should decorate with a single property', function(done) {
    function plugin1(app, options, next) {
      app.decorate({
        foo: 1
      });
      expect(app.foo).to.eq(1);
      expect(app.root.foo).to.eq(1);
      return next();
    }
    plugin1.attributes = {
      name: 'plugin1',
      version: '0.0.0'
    };
    function plugin2(app, options, next) {
      expect(app.foo).to.eq(1);
      expect(app.root.foo).to.eq(1);
      return next();
    }
    plugin2.attributes = {
      name: 'plugin2',
      version: '0.1.0'
    };

    var app = {};
    var plugins = [{
      register: plugin1,
      options: {foo: 1}
    }, {
      register: plugin2
    }];
    registerPlugin(app, plugins, function(err) {
      expect(err).to.be.undefined;

      expect(app.foo).to.eq(1);

      done();
    });
  });
});
