'use strict';

let hasRun = false;
let cache;

module.exports = function init(mongoose, cacheOptions = {}) {
  if (mongoose.version < '3.7') throw new Error('Cachegoose is only compatible with mongoose 3.7+');
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
