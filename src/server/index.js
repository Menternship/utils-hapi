// @flow
import defaultPlugins from './plugins';
import pkg from '../package.json';

export default function getRegister(routes, plugins) {
  function register(server: Object, options: Object, ready: Function) {
    routes.forEach(route => server.route(route));
    server.register([defaultPlugins, ...plugins]);
    ready();
  }
  register.attributes = {
    pkg,
  };
  return register;
}
