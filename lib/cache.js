var Cacheman = require('cacheman');

function Cache(options) {
  this._cache = new Cacheman('cachegoose-cache', options);
}

Cache.prototype.get = function(key, cb) {
  return this._cache.get(key, cb);
};

Cache.prototype.set = function(key, value, ttl, cb) {
  return this._cache.set(key, value, ttl, cb);
};

Cache.prototype.del = function(key, cb) {
  return this._cache.del(key, cb);
};

Cache.prototype.clear = function(cb) {
  return this._cache.clear(cb);
};

module.exports = function(options) {
  return new Cache(options);
};
