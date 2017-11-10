'use strict';

const jsosort = require('jsosort');
const sha1 = require('sha1');

module.exports = function init(obj) {
  obj = jsosort(obj);
  obj = JSON.stringify(obj, (key, val) => {
    return val instanceof RegExp ? String(val) : val;
  });

  return sha1(obj);
};
