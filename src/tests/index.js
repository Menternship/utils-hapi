// @flow
import { db } from '../repos';

export function truncate(table: string) {
  return db.none(`TRUNCATE TABLE ${table}`);
}
