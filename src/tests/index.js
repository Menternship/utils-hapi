// @flow
import { db } from '../repos';

export function truncate(table: string) {
  return db.none(`TRUNCATE TABLE ${table}`);
}

export function decorateRequestWithUser(request: Object, user: Object) {
  return {
    ...request,
    auth: {
      credentials: user,
    },
  };
}

export function mockReply(resp: any) {
  return resp;
}

export const getId = () => Math.floor(Math.random() * 10000000);
