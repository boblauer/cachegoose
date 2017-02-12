let hasRun = false
  , cache
  ;

module.exports = function init(mongoose, cacheOptions, debug) {
  if (mongoose.version < '3.7') throw new Error('Cachegoose is only compatible with mongoose 3.7+');
  if (hasRun) return;
  hasRun = true;

  init._cache = cache = require('./cache')(cacheOptions);

  // Ensure we're playing around with an object
  var opts = typeof cacheOptions === 'object' ? cacheOptions : { url: cacheOptions };

  // Default to caching empty things
  opts.cacheEmpty = 'cacheEmpty' in opts ? !!opts.cacheEmpty : true;

  require('./extend-query')(opts, mongoose, cache, debug);
  require('./extend-aggregate')(opts, mongoose, cache, debug);
};

module.exports.clearCache = function(customKey, cb = function() { }) {
  if (!customKey) return cb();
  cache.del(customKey, cb);
};
