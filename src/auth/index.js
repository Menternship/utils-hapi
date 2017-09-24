// @flow
import hapiAuthJWT from 'hapi-auth-jwt2';

export const { JWT_SECRET } = process.env;
const validateFunc = function validateFunc(decoded, request, callback) {
  request.decoded = decoded;
  callback(null, true, decoded);
};

const register = (server: Object, options: Object, next: Function) => {
  server.register(hapiAuthJWT, (err) => {
    if (err) {
      console.log(err);
      throw err;
    }
    server.auth.strategy(
      'jwt',
      'jwt',
      {
        key: JWT_SECRET,
        validateFunc,
        verifyOptions: { algorithms: ['HS256'] },
      });
    server.auth.default('jwt');
  });
  next();
};

register.attributes = {
  name: 'hapi-utils-auth',
  version: '1.0',
};

export default register;
