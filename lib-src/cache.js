let Cacheman = require('cacheman')
  , prefix   = 'cachegoose:'
  , noop     = function() { }
  ;

function Cache(options) {
  this._cache = new Cacheman('cachegoose-cache', options);
}

Cache.prototype.get = function(key, cb = noop) {
  return this._cache.get(prefix + key, cb);
};

Cache.prototype.set = function(key, value, ttl, cb = noop) {
  return this._cache.set(prefix + key, value, ttl, cb);
};

Cache.prototype.del = function(key, cb = noop) {
  return this._cache.del(prefix + key, cb);
};

Cache.prototype.clear = function(cb = noop) {
  return this._cache.clear(cb);
};

module.exports = function(options) {
  return new Cache(options);
};
