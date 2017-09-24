// @flow
import qs from 'qs';

export default function createFlash(name: string, error?: boolean, params?: Object) {
  return `${process.env.CLIENT_URL || ''}/?${qs.stringify({
    flash: {
      name,
      error,
      params,
    },
  })}`;
}
