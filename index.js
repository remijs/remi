import hook from 'magic-hook/es5'

export default function remi (target) {
  const register = hook((target, plugin, cb) => {
    plugin.register(target, plugin.options, cb)
  })

  function registerNext (plugins, cb) {
    const plugin = plugins.shift()

    if (!plugin) return cb()

    function wrapError (err) {
      const wrapperErr = new Error('Failed to register ' + plugin.name +
        '. ' + err)
      wrapperErr.internalError = err
      return wrapperErr
    }

    register(
      {
        ...target,
        root: target
      },
      plugin,
      (err) => {
        if (err) return cb(wrapError(err))

        target.registrations[plugin.name] = plugin
        registerNext(plugins, cb)
      }
    )
  }

  function getRegister (plugin) {
    if (typeof plugin !== 'function' && !plugin.register) {
      throw new Error('Plugin missing a register method')
    }

    // plugin is register() function
    if (typeof plugin === 'function' && !plugin.register) return plugin

    // Required plugin
    if (plugin.register.register) return plugin.register.register

    return plugin.register
  }

  function pluginToRegistration (plugin) {
    const register = getRegister(plugin)

    const attributes = register.attributes
    return {
      ...attributes,
      register,
      name: attributes.name || attributes.pkg.name,
      version: attributes.version || attributes.pkg && attributes.pkg.version,
      options: {...plugin.options}
    }
  }

  return {
    hook: register.pre,
    register (plugins) {
      try {
        plugins = [].concat(plugins)
        target.registrations = target.registrations || {}

        const newRegistrations = plugins
          .map(pluginToRegistration)
          .filter((reg) => !target.registrations[reg.name])

        return new Promise((resolve, reject) => {
          const cb = (err) => err ? reject(err) : resolve()
          registerNext(newRegistrations, cb)
        })
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
