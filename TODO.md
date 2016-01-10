* if there's an error during a plugin initialization, include the plugin's name to the throw error

* add `debug` to print the sequence of plugins registrations

* limit the time a plugin can initialize with a ttl using `kamikaze`

* add the possibility to return promises in methods and plugins.
Make it possible just to synchronously return results
