import hook, {PreHook, FuncReturns} from 'magic-hook'

export type Plugin = {
  (target: Object, options: Object, next?: Function): Promise<any> | void
  attributes: any
}
export type PluginRegistrator = { register: Plugin, options?: any }
export type NormalizedPlugin = {
  register: Plugin
  name: string
  version: string
  options: any
}
export type ErrorCallback = (err?: Error) => void

export type RemiHook<T> = {
  (target: T, plugin: NormalizedPlugin, cb: ErrorCallback): void
}

export {PreHook, FuncReturns}

export default function remi<T extends {registrations?: any}>(target: T): {
  hook(...hooks: PreHook<FuncReturns<T>, void>[]): void,
  register(plugins: PluginRegistrator[]): Promise<void>
} {
  const register = hook(function(target: T, plugin: NormalizedPlugin, cb: ErrorCallback): void {
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

  function pluginToRegistration(plugin: PluginRegistrator): NormalizedPlugin {
    const attributes = plugin.register.attributes
    return Object.assign(attributes, {
      register: plugin.register,
      name: attributes.name || attributes.pkg.name,
      version: attributes.version || attributes.pkg && attributes.pkg.version,
      options: Object.assign({}, plugin.options),
    })
  }

  return {
    hook: register.pre,
    register(plugins: PluginRegistrator[]): Promise<void> {
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
