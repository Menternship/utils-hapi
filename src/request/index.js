// @flow
import { get } from 'lodash';

export function getUser(request: Object, property?: string = '') {
  return get(request, `auth.credentials${property ? '.' : ''}${property}`);
}
