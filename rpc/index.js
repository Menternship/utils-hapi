'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RPC = exports.getPlugin = exports.types = undefined;

var _v = require('uuid/v1');

var _v2 = _interopRequireDefault(_v);

var _keymirrorFlow = require('keymirror-flow');

var _keymirrorFlow2 = _interopRequireDefault(_keymirrorFlow);

var _pubsubJs = require('pubsub-js');

var _pubsubJs2 = _interopRequireDefault(_pubsubJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// $FlowFixMe
var pkg = require(process.env.PWD + '/package.json');

var types = exports.types = (0, _keymirrorFlow2.default)({
  CREATE_USER: 1,
  GET_LOGIN_TOKEN: 1
});

var getPlugin = exports.getPlugin = function getPlugin() {
  var register = function register(server, options, next) {
    next();
  };
  register.attributes = {
    name: 'RPC_PLUGIN',
    version: pkg.version
  };
  return register;
};

var RPC = exports.RPC = function RPC() {
  var _this = this;

  _classCallCheck(this, RPC);

  this.processServers = function (servers) {
    Object.keys(servers).map(function (type) {
      return _this.createServer(type, servers[type][0], servers[type][1]);
    });
  };

  this.createServer = function (name, callbackProm) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var consume = function consume(type, msg) {
      return callbackProm(msg.content, msg.properties.error).then(function (resp) {
        _pubsubJs2.default.publish(msg.properties.replyTo, {
          content: resp
        });
      });
    };
    _pubsubJs2.default.subscribe(name, consume);
  };

  this.createClient = function (name, sendMsg) {
    return new Promise(function (resolve, reject) {
      var corr = (0, _v2.default)();
      var subscribe = _pubsubJs2.default.subscribe(corr, function (data, msg) {
        resolve(msg.content);
        _pubsubJs2.default.unsubscribe(subscribe);
      });
      _pubsubJs2.default.publish(name, {
        content: sendMsg,
        properties: {
          replyTo: corr
        }
      });
    });
  };
};

var startRPC = function startRPC() {
  return new Promise(function (resolve, reject) {
    return resolve(new RPC());
  });
};

exports.default = startRPC;