'use strict';

const compareVersions = require('compare-versions');

let hasRun = false;
let cache;

module.exports = function init(mongoose, cacheOptions = {}) {
  if (compareVersions(mongoose.version, '3.7') === -1) throw new Error('Cachegoose is only compatible with mongoose 3.7+');
  if (hasRun) return;
  hasRun = true;

  init._cache = cache = require('./cache')(cacheOptions);

  require('./extend-query')(mongoose, cache);
  require('./extend-aggregate')(mongoose, cache);
};

module.exports.clearCache = function(customKey, cb = () => { }) {
  if (!customKey) {
    cache.clear(cb);
    return;
  }
  cache.del(customKey, cb);
};
