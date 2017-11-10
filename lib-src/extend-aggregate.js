let generateKey     = require('./generate-key')
  , hasBeenExtended = false
  ;

module.exports = function(mongoose, cache, debug) {
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

    Aggregate.prototype.exec = function(callback = function() { }) {
      if (!this.hasOwnProperty('_ttl')) return exec.apply(this, arguments);

      let key     = this._key || this.getCacheKey()
        , ttl     = this._ttl
        , Promise = mongoose.Promise
        ;

      return new Promise.ES6((resolve, reject) => {
        cache.get(key, (err, cachedResults) => {
          if (cachedResults) {
            if (debug) cachedResults._fromCache = true;
            callback(null, cachedResults);
            return resolve(cachedResults);
          }

          exec
            .call(this)
            .then(results => {
              cache.set(key, results, ttl, () => {
                callback(null, results);
                resolve(results);
              });
            })
            .catch(err => {
              callback(err);
              reject(err);
            });
        });
      });

      promise.onResolve(callback);

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
      return generateKey(this._pipeline);
    };
  }
};
