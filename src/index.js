'use strict';

const mongoose = require('mongoose');

let hasRun = false;
let cache;

module.exports = function init(cacheOptions = {}) {
  if (hasRun) return;
  hasRun = true;

  init._cache = cache = require('./cache')(cacheOptions);

  require('./extend-query')(mongoose, cache);
  require('./extend-aggregate')(mongoose, cache);
};

module.exports.clearCache = function(customKey, cb = () => { }) {
  if (!customKey) return cb();
  cache.del(customKey, cb);
};
