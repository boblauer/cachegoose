'use strict';

let hasRun = false;
let cache;

module.exports = function init(mongoose, cacheOptions = {}) {
  if (typeof mongoose.Model.hydrate !== 'function') throw new Error('Cachegoose is only compatible with versions of mongoose that implement the `model.hydrate` method');
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
