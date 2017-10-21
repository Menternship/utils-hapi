// @flow
import uuid from 'uuid/v1';
import mirror from 'keymirror-flow';
import PubSub from 'pubsub-js';

// $FlowFixMe
const pkg = require(process.env.PWD + '/package.json');

export const types = mirror({
  CREATE_USER: 1,
  GET_LOGIN_TOKEN: 1,
  SEND_EMAIL: 1,
  GET_USERS: 1,
});

export const getPlugin = () => {
  const register = (server: Object, options: Object, next: Function) => {
    next();
  };
  register.attributes = {
    name: 'RPC_PLUGIN',
    version: pkg.version,
  };
  return register;
};

type $serverObject = {
  [key: string]: [(arg: any) => Promise<any>, ?Object];
};

export class RPC {
  processServers = (servers: $serverObject) => {
    Object.keys(servers).map((type) => {
      return this.createServer(type, servers[type][0], servers[type][1]);
    });
  }
  createServer = (name: string, callbackProm: any, options?: Object = {}) => {
    const consume = (type, msg) => {
      return (callbackProm(msg.content, msg.properties.error))
      .then((resp) => {
        PubSub.publish(msg.properties.replyTo, {
          content: resp,
        });
      });
    };
    PubSub.subscribe(name, consume);
  }
  createClient = (name: string, sendMsg: any) => {
    return new Promise((resolve, reject) => {
      const corr = uuid();
      const subscribe = PubSub.subscribe(corr, (data, msg) => {
        resolve(msg.content);
        PubSub.unsubscribe(subscribe);
      });
      PubSub.publish(name, {
        content: sendMsg,
        properties: {
          replyTo: corr,
        },
      });
    });
  }
}

const startRPC = () => new Promise((resolve, reject) => {
  return resolve(new RPC());
});

export default startRPC;
