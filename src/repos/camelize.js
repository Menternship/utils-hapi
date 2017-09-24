// @flow
import pgp from 'pg-promise';


export function recursiveCamelize(val) {
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      val.forEach((v, i) => {
        val[i] = recursiveCamelize(v);
      });
    }
    Object.keys(val).forEach((k) => {
      val[pgp.utils.camelize(k)] = recursiveCamelize(val[k]);
      delete val[k];
    });
  }
  return val;
}

export function camelizeColumns(data) {
  const tmp = data[0];
  Object.keys(tmp).forEach((prop) => {
    const camel = pgp.utils.camelize(prop);
    if (!(camel in tmp)) {
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        d[camel] = recursiveCamelize(d[prop]);
        delete d[prop];
      }
    }
  });
}
