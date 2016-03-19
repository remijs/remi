import hook from 'magic-hook'

export type Plugin = {
  (target: Object, options: Object, next?: Function): Promise<any> | void
  attributes: any
}
export type RegisterPlugin = { register: Plugin }
export type WrappedRegisterPlugin = { register: { register: Plugin } }
export type AnyPlugin = (Plugin | RegisterPlugin | WrappedRegisterPlugin) & { options?: any }
export type NormalizedPlugin = {
  register: Plugin
  name: string
  version: string
  options: any
}
export type ErrorCallback = (err?: Error) => void

export default function remi(target: any) {
  const register = hook(function(target: any, plugin: NormalizedPlugin, cb: ErrorCallback): void {
    plugin.register(target, plugin.options, cb)
  })

  function registerNext(plugins: NormalizedPlugin[], cb: ErrorCallback) {
    const plugin = plugins.shift()

    if (!plugin) return cb()

    type WrappedError = Error & {internalError?: Error}

    function wrapError(err: Error): WrappedError {
      const wrapperErr: WrappedError = new Error('Failed to register ' + plugin.name +
        '. ' + err)
      wrapperErr.internalError = err
      return wrapperErr
    }

    register(
      Object.assign({}, { root: target }, target),
      plugin,
      function(err: Error) {
        if (err) return cb(wrapError(err))

        target.registrations[plugin.name] = plugin
        registerNext(plugins, cb)
      }
    )
  }

  function getRegister(plugin: AnyPlugin): Plugin {
    if (typeof plugin !== 'function' && !plugin['register']) {
      throw new Error('Plugin missing a register method')
    }

    // plugin is register() function
    if (typeof plugin === 'function' && !(<RegisterPlugin>plugin).register) {
      return <Plugin>plugin
    }

    // Required plugin
    if ((<WrappedRegisterPlugin>plugin).register.register) {
      return (<WrappedRegisterPlugin>plugin).register.register
    }

    return (<RegisterPlugin>plugin).register
  }

  function pluginToRegistration(plugin: AnyPlugin): NormalizedPlugin {
    const register: Plugin = getRegister(plugin)

    const attributes = register.attributes
    return Object.assign(attributes, {
      register,
      name: attributes.name || attributes.pkg.name,
      version: attributes.version || attributes.pkg && attributes.pkg.version,
      options: Object.assign({}, plugin.options),
    })
  }

  return {
    hook: register.pre,
    register(plugins: AnyPlugin[]): Promise<void> {
      try {
        plugins = [].concat(plugins)
        target.registrations = target.registrations || {}

        const newRegistrations = plugins
          .map(pluginToRegistration)
          .filter(reg => !target.registrations[reg.name])

        return new Promise<void>((resolve, reject) => {
          const cb = (err: Error) => err ? reject(err) : resolve()
          registerNext(newRegistrations, cb)
        })
      } catch (err) {
        return Promise.reject(err)
      }
    },
  }
}
