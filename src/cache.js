'use strict';

const Cacheman = require('cacheman');
const noop = () => {};

function Cache(options) {
  this._cache = new Cacheman('cachegoose-cache', options);
}

Cache.prototype.get = function(key, cb = noop) {
  return this._cache.get(key, cb);
};

Cache.prototype.set = function(key, value, ttl, cb = noop) {
  if (ttl === null) return cb();
  if (ttl === 0) ttl = -1;
  return this._cache.set(key, value, ttl, cb);
};

Cache.prototype.del = function(key, cb = noop) {
  return this._cache.del(key, cb);
};

Cache.prototype.clear = function(cb = noop) {
  return this._cache.clear(cb);
};

module.exports = function(options) {
  return new Cache(options);
};
