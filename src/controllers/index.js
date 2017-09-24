// @flow
import joi from 'joi';

type $method = 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';

type $request<$payload, $query, $params> = {
  payload: $payload,
  query: $query,
  params: $params,
};

type $options<$payload, $query, $params> = {
  method: $method,
  path: string,
  handler: (request: $request<$payload, $query, $params>, reply: Function)=>any,
  config?: {
    description?: string,
    notes?: string,
    tags?: string[],
    validate?: {
      payload?: $payload,
      query?: $query,
      params?: $params,
    }
  },
};

export function controller<$payload, $query, $params>(
  options: $options<$payload, $query, $params>,
  defaultOptions?: {[key: string]: Function} = {}): Object {
  const result = Object.keys(defaultOptions).reduce((finalResult, key) => {
    finalResult[key] = defaultOptions[key](options[key]);
    return finalResult;
  },
  options);
  return result;
}


export function defaultController<$payload, $query, $params>(
  pathPrefix: string, options: $options<$payload, $query, $params>) {
  return controller(
    options,
    {
      path(path) {
        return `${process.env.API_PREFIX || ''}/${pathPrefix}${path}`;
      },
      config(config = {}) {
        let validate;
        if (config.validate) {
          validate = Object.keys(config.validate).reduce((finalResult, validationType) => {
            finalResult[validationType] = joi.object().keys(config.validate[validationType]);
            return finalResult;
          }, {});
        }
        return { ...config, validate, tags: ['api'].concat(config.tags || []) };
      },
      handler(handler) {
        return (request, reply) => handler(request, (data) => {
          if (data instanceof Error) {
            return reply(data);
          }
          return reply({ data });
        });
      },
    },
  );
}

export default function massDefaultController(pathPrefix: string, controllers: Array<*>){
  return controllers.map(controllerOptions => defaultController(pathPrefix, controllerOptions));
}
