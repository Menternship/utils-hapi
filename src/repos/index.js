// @flow
import pgp from 'pg-promise';
import blandSquel from 'squel';
import { decamelizeKeys } from 'humps';
import camelizeColumns from './camelize';

const getWhere = (params: Object, key: string) => {
  let operator;
  let displayKey = key;
  const firstCharacter = key[0];
  if (firstCharacter === '!') {
    displayKey = key.slice(1);
    if (Array.isArray(params[key])) {
      operator = ' NOT IN ';
    } else {
      operator = ' <> ';
    }
  } else if (firstCharacter === '>') {
    displayKey = key.slice(1);
    operator = ' > ';
  } else if (firstCharacter === '>=') {
    displayKey = key.slice(1);
    operator = ' >= ';
  } else if (firstCharacter === '<') {
    displayKey = key.slice(1);
    operator = ' < ';
  } else if (firstCharacter === '<=') {
    displayKey = key.slice(1);
    operator = ' <= ';
  } else {
    operator = Array.isArray(params[key]) ? ' in ' : ' = ';
  }
  const text = `${displayKey}${operator}?`;
  const value = params[key];
  return {
    text,
    value,
  };
};

const applyWhere = (query, filters) => {
  Object.keys(filters).forEach((key) => {
    const { text, value } = getWhere(filters, key);
    query.where(text, value);
  });
};

const applyOptions = (query, options = {}) => {
  if (options.order) {
    Object.keys(options.order).forEach((key) => {
      query.order(key, options.order[key] || 'DESC');
    });
  }
};

const initOptions = {
  receive: (data) => {
    camelizeColumns(data);
  },
};

export const squel = blandSquel.useFlavour('postgres');
export const predb = pgp(initOptions)(process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL);

const consoleMessage = (...args) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(...args);
  }
};

export const db = {
  none(query: string, values?: any[], t?: any) {
    consoleMessage('none', query, values);
    return (t || predb).none(query, values);
  },
  one(query: string, values?: any[], t?: any) {
    consoleMessage('one', query, values);
    return (t || predb).one(query, values);
  },
  oneOrNone(query: string, values?: any[], t?: any) {
    consoleMessage('oneOrNone', query, values);
    return (t || predb).oneOrNone(query, values);
  },
  many(query: string, values?: any[], t?: any) {
    consoleMessage('many', query, values);
    return (t || predb).many(query, values);
  },
  manyOrNone(query: string, values?: any[], t?: any) {
    consoleMessage('manyOrNone', query, values);
    return (t || predb).manyOrNone(query, values);
  },
};

const insertValue = (value: *) => {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return value;
};

export default class Repo <X: any> {
  tableName: string;
  db: Object;
  Model: ?Class<X>;
  options: Object;
  constructor(tableName: string, Model?: Class<X>, options?: Object = {}) {
    this.tableName = tableName;
    this.db = db;
    this.Model = Model;
    this.options = options;
  }
  modelTransform = (obj: Object) => {
    if (this.Model && obj) {
      return new this.Model(obj);
    }
    return obj;
  }
  massModelTransformMap = (obj: Object) => {
    if (obj) {
      // $FlowFixMe
      return new this.Model(obj);
    }
    return obj;
  }
  massModelTransform = (objs: Object[]) => {
    if (this.Model) {
      return objs.map(this.massModelTransformMap);
    }
    return objs;
  }
  insert = (preparams?: Object = {}, insertOptions?: Object, t?: any) => {
    const preoptions = { ...this.options, ...insertOptions };
    const params = decamelizeKeys(preparams);
    const options = decamelizeKeys(preoptions);
    const initialQuery = squel.insert()
    .into(this.tableName);
    Object.keys(params).forEach((key) => {
      initialQuery
      .set(
        key,
        insertValue(params[key]),
      );
    });
    if (!options || !(preoptions.skipTime || preoptions.justCreate)) {
      ['created_at', 'updated_at'].forEach((key) => {
        initialQuery
        .set(key, squel.str('NOW()'));
      });
    }
    if (preoptions && preoptions.justCreate) {
      initialQuery.set('created_at', squel.str('NOW()'));
    }
    const { text, values } = initialQuery.toParam();
    return db.one(`${text} RETURNING id`, values, t)
    .then(r => r.id);
  };

  update = (prefilters: Object, preparams: Object, t?: any) => {
    const params = decamelizeKeys(preparams);
    const filters = decamelizeKeys(prefilters);
    const initialQuery = squel.update()
        .table(this.tableName);
    Object.keys(params).forEach((key) => {
      initialQuery.set(key, insertValue(params[key]));
    });

    applyWhere(initialQuery, filters);
    const { text, values } = initialQuery.toParam();
    return db.none(text, values, t);
  }
  _retrieve = (preparams: Object = {}, retrieveOptions?: Object = {}) => {
    const preoptions = { ...this.options, ...retrieveOptions };
    const params = decamelizeKeys(preparams);
    const options = decamelizeKeys(preoptions);
    const initialQuery = squel.select()
    .from(this.tableName).limit(1);
    applyWhere(initialQuery, params);
    applyOptions(initialQuery, options);
    return initialQuery.toParam();
  };
  retrieve = (params: Object, options?: Object, t?: any) => {
    const { text, values } = this._retrieve(params, options);
    return db.oneOrNone(text, values, t).then(this.modelTransform);
  }
  retrieveOne = (params: Object, options?: Object, t?: any) => {
    const { text, values } = this._retrieve(params, options);
    return db.one(text, values, t).then(this.modelTransform);
  }
  retrieveNone = (params: Object, options?: Object, t?: any) => {
    const { text, values } = this._retrieve(params, options);
    return db.none(text, values, t).then(this.modelTransform);
  }
  retrieveAll = (preparams: Object = {}, options?: Object = {}, t?: any) => {
    const params = decamelizeKeys(preparams);
    const initialQuery = squel.select()
    .from(this.tableName);
    applyWhere(initialQuery, params);
    applyOptions(initialQuery, { ...this.options, ...options });
    const { text, values } = initialQuery.toParam();
    return db.manyOrNone(text, values, t).then(options.transform || this.massModelTransform);
  };

  count = (preparams: Object = {}, t?: any) => {
    const params = decamelizeKeys(preparams);
    const initialQuery = squel.select()
    .from(this.tableName)
    .field('count(*)');
    applyWhere(initialQuery, params);
    const { text, values } = initialQuery.toParam();
    return db.one(text, values, t).then(({ count }) => count);
  };
  remove = (prefilters: Object = {}, t?: any) => {
    const filters = decamelizeKeys(prefilters);

    const initialQuery = squel.delete()
    .from(this.tableName);
    applyWhere(initialQuery, filters);
    const { text, values } = initialQuery.toParam();
    return db.none(text, values, t);
  }

  reorder = (prefilters: Object, { rawOriginal, rawNext }: {rawOriginal: number, rawNext: number}, ordinalField: string = 'ordinal', t?: any) => {
    const filters = decamelizeKeys(prefilters);
    if (rawOriginal > rawNext) {
      return this.reorderForwards(filters, { rawOriginal, rawNext }, ordinalField, t);
    }
    if (rawOriginal < rawNext) {
      return this.reorderBackwards(filters, { rawOriginal, rawNext }, ordinalField);
    }
    return Promise.resolve();
  }

  reorderBackwards = (filters: Object, { rawOriginal, rawNext }: Object, ordinalField: string = 'ordinal', t?: any) => {
    const original = parseInt(rawOriginal, 10);
    const next = parseInt(rawNext, 10);
    const initialQuery = squel.update()
        .table(this.tableName)
        .set(`${ordinalField} = (CASE
        WHEN ${ordinalField} BETWEEN (${original} + 1) AND (${next}) THEN ${ordinalField} - 1
          WHEN ${ordinalField} = ${original} THEN ${next}
      END
    )`);
    Object.keys(filters).forEach((key) => {
      const operator = Array.isArray(filters[key]) ? ' in ' : ' = ';
      initialQuery.where(`${key}${operator}?`, filters[key]);
    });
    return db.none(initialQuery.toString(), undefined, t);
  }
  reorderForwards = (filters: Object, { rawOriginal, rawNext }: Object, ordinalField: string = 'ordinal', t?: any) => {
    const original = parseInt(rawOriginal, 10);
    const next = parseInt(rawNext, 10);
    const initialQuery = squel.update()
        .table(this.tableName)
        .set(`${ordinalField} = (CASE
        WHEN ${ordinalField} BETWEEN ${next} AND (${original - 1}) THEN ${ordinalField} + 1
          WHEN ${ordinalField} = ${original} THEN ${next}
      END
    )`);
    Object.keys(filters).forEach((key) => {
      const operator = Array.isArray(filters[key]) ? ' in ' : ' = ';
      initialQuery.where(`${key}${operator}?`, filters[key]);
    });
    return db.none(initialQuery.toString(), undefined, t);
  }
}

export const createTransaction = (promise: Function) => {
  return predb.tx((t) => {
    return promise(t);
  });
};
