// @flow
import jwt from 'jsonwebtoken';
import hapiAuthJWT from 'hapi-auth-jwt2';

export const { JWT_SECRET } = process.env;
const validateFunc = function validateFunc(decoded, request, callback) {
  request.decoded = decoded;
  if (decoded.exp < ((Date.now() / 1000) - 900)) {
    jwt.sign({ id: decoded.id, email: decoded.email }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' }, (err, token) => {
      request.newToken = token;
      callback(null, true, decoded);
    });
  } else {
    callback(null, true, decoded);
  }
};

export default function (server: Object) {
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
}
