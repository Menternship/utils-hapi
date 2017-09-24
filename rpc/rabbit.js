'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RPC = exports.getPlugin = exports.connect = exports.types = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _callback_api = require('amqplib/callback_api');

var _callback_api2 = _interopRequireDefault(_callback_api);

var _v = require('uuid/v1');

var _v2 = _interopRequireDefault(_v);

var _keymirrorFlow = require('keymirror-flow');

var _keymirrorFlow2 = _interopRequireDefault(_keymirrorFlow);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// $FlowFixMe
var pkg = require(process.env.PWD + '/package.json');

var types = exports.types = (0, _keymirrorFlow2.default)({
  CREATE_USER: 1,
  GET_LOGIN_TOKEN: 1
});

var channel = { active: false };

var connect = exports.connect = function connect(connection) {
  return new Promise(function (resolve, reject) {
    _callback_api2.default.connect('' + connection, function (err, conn) {
      if (err) {
        console.log(err);
        return reject(err);
      }
      conn.createChannel(function (chErr, ch) {
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
};

var getPlugin = exports.getPlugin = function getPlugin(connection) {
  var register = function register(server, options, next) {
    console.log('ATTEMPTING TO CONNECT TO RABBIT');
    connect(connection).then(function () {
      console.log('RABBIT CONNECTED');
      next();
    }).catch(function (err) {
      console.log(err);
      throw err;
    });
  };
  register.attributes = {
    name: 'RPC_PLUGIN',
    version: pkg.version
  };
  return register;
};

var RPC = exports.RPC = function RPC(cha) {
  var _this = this;

  _classCallCheck(this, RPC);

  this.processServers = function (servers) {
    Object.keys(servers).map(function (type) {
      return _this.createServer(type, servers[type][0], servers[type][1]);
    });
  };

  this.createServer = function (name, callbackProm) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _this.ch.active.assertQueue(name, _extends({ durable: true }, options));
    _this.ch.active.consume(name, function (msg) {
      return callbackProm(JSON.parse(msg.content.toString()), msg.properties.error).then(function (resp) {
        console.log('resp', resp, msg.properties.replyTo);
        _this.ch.active.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(resp)), {
          correlationId: msg.properties.correlationId
        });
        _this.ch.active.ack(msg);
      });
    });
  };

  this.createClient = function (name, sendMsg) {
    return new Promise(function (resolve, reject) {
      _this.ch.active.assertQueue('', { exclusive: true }, function (err, q) {
        if (err) {
          reject(err);
        }
        var corr = (0, _v2.default)();
        console.log('q', q.queue);
        _this.ch.active.consume(q.queue, function (msg) {
          console.log('CORR', corr, msg.properties.correlationId, JSON.parse(msg.content.toString()));
          if (msg.properties.correlationId === corr) {
            return resolve(JSON.parse(msg.content.toString()));
          }
        }, { noAck: true });
        console.log('RABBIT SENDING', name, sendMsg);
        _this.ch.active.sendToQueue(name, new Buffer(JSON.stringify(sendMsg)), { correlationId: corr, replyTo: q.queue });
      });
    });
  };

  this.ch = cha || channel;
};

var checkConnected = function checkConnected() {
  var attempt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var resolve = arguments[1];
  var reject = arguments[2];

  if (channel.active) {
    return resolve(new RPC());
  }
  if (attempt > 200) {
    return reject(new Error('Could not connect to rabbitmq'));
  }
  return setTimeout(function () {
    return checkConnected(attempt + 1, resolve);
  }, 500);
};

var startRPC = function startRPC() {
  return new Promise(function (resolve, reject) {
    checkConnected(0, resolve, reject);
  });
};

exports.default = startRPC;