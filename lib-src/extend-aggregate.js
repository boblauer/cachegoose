let jsosort         = require('jsosort')
  , sha1            = require('sha1')
  , hasBeenExtended = false
  ;

module.exports = function(mongoose, cache) {
  let aggregate = mongoose.Model.aggregate;

  mongoose.Model.aggregate = function() {
    let res = aggregate.apply(this, arguments);

    if (!hasBeenExtended && res.constructor && res.constructor.name === 'Aggregate') {
      extend(res.constructor);
      hasBeenExtended = true;
    }

    return res;
  };

  function extend(Aggregate) {
    let exec = Aggregate.prototype.exec;

    Aggregate.prototype.exec = function(callback) {
      if (!this.hasOwnProperty('_ttl')) return exec.apply(this, arguments);

      let key     = this._key || this.getCacheKey()
        , ttl     = this._ttl
        , promise = new mongoose.Promise()
        ;

      promise.onResolve(callback);

      cache.get(key, (err, cachedResults) => {
        if (cachedResults) {
          cachedResults._fromCache = true;
          promise.resolve(null, cachedResults);
        } else {
          exec.call(this).onResolve((err, results) => {
            if (err) return promise.resolve(err);
            cache.set(key, results, ttl, () => {
              promise.resolve(null, results);
            });
          });
        }
      });

      return promise;
    };

    Aggregate.prototype.cache = function(ttl = 60, customKey = '') {
      if (typeof ttl === 'string') {
        customKey = ttl;
        ttl = 60;
      }

      this._ttl = ttl;
      this._key = customKey;
      return this;
    };

    Aggregate.prototype.getCacheKey = function() {
      let key = jsosort(this._pipeline);
      key = JSON.stringify(key);
      return sha1(key);
    };
  }
};
