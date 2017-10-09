'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.truncate = truncate;

var _repos = require('../repos');

function truncate(table) {
  return _repos.db.none('TRUNCATE TABLE ' + table);
}