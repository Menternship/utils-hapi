// @flow
import defaultPlugins from '../plugins';

// $FlowFixMe
const pkg = require(process.env.PWD + '/package.json');

export default function getRegister(routes: Array<Object>, plugins?: Array<Object> = []) {
  const routesRegister = (server: Object, options: Object, ready: Function) => {
    server.dependency('hapi-utils-plugins', (plugin, next) => {
      routes.forEach(route => plugin.route(route));
      next();
    });
    ready();
  };
  routesRegister.attributes = {
    name: 'hapi-utils-routes-plugin',
    version: pkg.version,
  };
  function register(server: Object, options: Object, ready: Function) {
    server.register([defaultPlugins, ...plugins]);
    server.register([routesRegister]);
    ready();
  }
  register.attributes = {
    pkg,
  };
  return register;
}
