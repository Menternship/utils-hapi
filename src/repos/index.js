// @flow
import pgp from 'pg-promise';
import blandSquel from 'squel';
import { camelizeKeys as ck, decamelizeKeys } from 'humps';

const {
  PG_DATABASE: database,
  PG_USER: user,
  PG_PASSWORD: password,
  PG_HOST: host,
  PG_PORT: port,
} = process.env;
const camelizeKeys = (values) => {
  return ck(values);
};

const getWhere = (params: Object, key: string) => {
  let operator;
  let displayKey = key;
  const firstCharacter = key[0];
  if (firstCharacter === '!') {
    displayKey = key.slice(1);
    operator = ' <> ';
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

export const connection = { database, user, password, host, port };
export const squel = blandSquel.useFlavour('postgres');
export const predb = pgp()(connection);

export const db = {
  none(query: string, values?: any[]) {
    console.log('none', query, values);
    return predb.none(query, values);
  },
  one(query: string, values?: any[]) {
    console.log('one', query, values);
    return predb.one(query, values).then(camelizeKeys);
  },
  oneOrNone(query: string, values?: any[]) {
    console.log('oneOrNone', query, values);
    return predb.oneOrNone(query, values).then(camelizeKeys);
  },
  many(query: string, values?: any[]) {
    console.log('many', query, values);
    return predb.many(query, values).then(camelizeKeys);
  },
  manyOrNone(query: string, values?: any[]) {
    console.log('manyOrNone', query, values);
    return predb.manyOrNone(query, values).then(camelizeKeys);
  },
};

const insertValue = (value: *) => {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return value;
};

export default class Repo <X> {
  tableName: string;
  db: Object;
  Model: ?X;
  constructor(tableName: string, Model?: Class<X>) {
    this.tableName = tableName;
    this.db = db;
    this.Model = Model;
  }
  modelTransform = (obj)=>{
    if (this.Model) {
      return new Model(obj);
    }
    return obj;
  }
  massModelTransform = (objs)=>{
    if (this.Model) {
      return objs.map((obj)=>new Model(obj));
    }
    return objs;
  }
  insert = (preparams?: Object = {}, preoptions?: Object) => {
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
    return db.one(`${text} RETURNING id`, values)
    .then((r)=>r.id);
  };

  update = (prefilters: Object, preparams: Object) => {
    const params = decamelizeKeys(preparams);
    const filters = decamelizeKeys(prefilters);
    const initialQuery = squel.update()
        .table(this.tableName);
    Object.keys(params).forEach((key) => {
      initialQuery.set(key, insertValue(params[key]));
    });

    applyWhere(initialQuery, filters);
    const { text, values } = initialQuery.toParam();
    return db.none(text, values);
  }
  _retrieve = (preparams: Object = {}, preoptions?: Object = {}) => {
    const params = decamelizeKeys(preparams);
    const options = decamelizeKeys(preoptions);
    const initialQuery = squel.select()
    .from(this.tableName).limit(1);
    applyWhere(initialQuery, params);
    applyOptions(initialQuery, options);
    return initialQuery.toParam();
  };
  retrieve = (params: Object, options?: Object) => {
    const { text, values } = this._retrieve(params, options);
    return db.oneOrNone(text, values).then(this.modelTransform);
  }
  retrieveOne = (params: Object, options?: Object) => {
    const { text, values } = this._retrieve(params, options);
    return db.one(text, values).then(this.modelTransform);
  }
  retrieveAll = (preparams: Object = {}, options?: Object) => {
    const params = decamelizeKeys(preparams);
    const initialQuery = squel.select()
    .from(this.tableName);
    applyWhere(initialQuery, params);
    applyOptions(initialQuery, options);
    const { text, values } = initialQuery.toParam();
    return db.manyOrNone(text, values).then(this.massModelTransform);
  };

  count = (preparams: Object = {}) => {
    const params = decamelizeKeys(preparams);
    const initialQuery = squel.select()
    .from(this.tableName)
    .field('count(*)');
    applyWhere(initialQuery, params);
    const { text, values } = initialQuery.toParam();
    return db.one(text, values).then(({ count }) => count);
  };
  remove = (prefilters: Object = {}) => {
    const filters = decamelizeKeys(prefilters);

    const initialQuery = squel.delete()
    .from(this.tableName);
    applyWhere(initialQuery, filters);
    const { text, values } = initialQuery.toParam();
    return db.none(text, values);
  }

  reorder = (prefilters: Object, { rawOriginal, rawNext }: {rawOriginal: number, rawNext: number}, ordinalField: string = 'ordinal') => {
    const filters = decamelizeKeys(prefilters);
    if (rawOriginal > rawNext) {
      return this.reorderForwards(filters, { rawOriginal, rawNext }, ordinalField);
    }
    if (rawOriginal < rawNext) {
      return this.reorderBackwards(filters, { rawOriginal, rawNext }, ordinalField);
    }
    return Promise.resolve();
  }

  reorderBackwards = (filters: Object, { rawOriginal, rawNext }: Object, ordinalField: string = 'ordinal') => {
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
    return db.none(initialQuery.toString());
  }
  reorderForwards = (filters: Object, { rawOriginal, rawNext }: Object, ordinalField: string = 'ordinal') => {
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
    return db.none(initialQuery.toString());
  }

}
