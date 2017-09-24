// @flow
import amqp from 'amqplib/callback_api';
import uuid from 'uuid/v1';
import mirror from 'keymirror-flow';
// $FlowFixMe
const pkg = require(process.env.PWD + '/package.json');

export const types = mirror({
  CREATE_USER: 1,
  GET_LOGIN_TOKEN: 1,
});

const channel = { active: false };

export const connect = (connection: string) => new Promise((resolve, reject) => {
  amqp.connect(`${connection}`, (err, conn) => {
    if (err) {
      console.log(err);
      return reject(err);
    }
    conn.createChannel((chErr, ch) => {
      if (chErr) {
        console.log(chErr);
        return reject(chErr);
      }
      ch.prefetch(1);
      channel.active = ch;
      return resolve(ch);
    });
  });
});

export const getPlugin = (connection: string) => {
  const register = (server: Object, options: Object, next: Function) => {
    console.log('ATTEMPTING TO CONNECT TO RABBIT');
    connect(connection)
    .then(() => {
      console.log('RABBIT CONNECTED');
      next();
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
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
  constructor(cha: any) {

    this.ch = cha || channel;
  }
  processServers = (servers: $serverObject[]) => {
    Object.keys(servers).map((type) => {
      return this.createServer(type, servers[type][0], servers[type][1]);
    });
  }
  createServer = (name: string, callbackProm: any, options?: Object = {}) => {
    this.ch.active.assertQueue(name, { durable: true, ...options });
    this.ch.active.consume(
      name,
      msg => (callbackProm(JSON.parse(msg.content.toString()), msg.properties.error))
      .then((resp) => {
        console.log('resp', resp, msg.properties.replyTo);
        this.ch.active.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(resp)), {
          correlationId: msg.properties.correlationId,
        });
        this.ch.active.ack(msg);
      }),
    );
  }
  createClient = (name: string, sendMsg: any) => {
    return new Promise((resolve, reject) => {
      this.ch.active.assertQueue('', { exclusive: true }, (err, q) => {
        if (err) {
          reject(err);
        }
        const corr = uuid();
        console.log('q', q.queue);
        this.ch.active.consume(q.queue, (msg) => {
          console.log('CORR', corr, msg.properties.correlationId, JSON.parse(msg.content.toString()));
          if (msg.properties.correlationId === corr) {
            return resolve(JSON.parse(msg.content.toString()));
          }
        }, { noAck: true });
        console.log('RABBIT SENDING', name, sendMsg);
        this.ch.active.sendToQueue(name,
          new Buffer(JSON.stringify(sendMsg)),
        { correlationId: corr, replyTo: q.queue });
      });
    });
  }
}

const checkConnected = (attempt = 0, resolve, reject) => {
  if (channel.active) {
    return resolve(new RPC());
  }
  if (attempt > 200) {
    return reject(new Error('Could not connect to rabbitmq'));
  }
  return setTimeout(() => checkConnected(attempt + 1, resolve), 500);
};

const startRPC = () => new Promise((resolve, reject) => {
  checkConnected(0, resolve, reject);
});

export default startRPC;
