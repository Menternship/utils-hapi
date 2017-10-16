'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getId = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.truncate = truncate;
exports.decorateRequestWithUser = decorateRequestWithUser;
exports.mockReply = mockReply;

var _repos = require('../repos');

function truncate(table) {
  return _repos.db.none('TRUNCATE TABLE ' + table);
}

function decorateRequestWithUser(request, user) {
  return _extends({}, request, {
    auth: {
      credentials: user
    }
  });
}

function mockReply(resp) {
  return resp;
}

var getId = exports.getId = function getId() {
  return Math.floor(Math.random() * 10000000);
};