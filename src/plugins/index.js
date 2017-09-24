// @flow
import hapiPino from 'hapi-pino';
import hapiSwagger from 'hapi-swagger';
import inert from 'inert';
import vision from 'vision';
import addCorsHeaders from 'hapi-cors-headers';
import auth from '../auth';

function register(server: Object, options: Object, next: Function) {
  server.register([
    auth,
    {
      register: hapiSwagger,
      options: {
        schemes: ['http', 'https'],
        securityDefinitions: {
          jwt: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
          },
        },
      },
    },
    // hapiPino,
    vision,
    inert,
  ]);
  server.ext('onPreResponse', addCorsHeaders);
  next();
}
register.attributes = {
  name: 'hapi-utils-plugins',
  version: '1.0.0',
};

module.exports = register;
