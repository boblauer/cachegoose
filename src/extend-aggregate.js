'use strict';

const generateKey = require('./generate-key');
const recoverObjectId = require('./recover-objectid');
let hasBeenExtended = false;

module.exports = function(mongoose, cache) {
  const aggregate = mongoose.Model.aggregate;

  mongoose.Model.aggregate = function() {
    const res = aggregate.apply(this, arguments);

    if (!hasBeenExtended && res.constructor && res.constructor.name === 'Aggregate') {
      extend(res.constructor);
      hasBeenExtended = true;
    }

    return res;
  };

  function extend(Aggregate) {
    const exec = Aggregate.prototype.exec;

    Aggregate.prototype.exec = function(callback = function() { }) {
      if (!this.hasOwnProperty('_ttl')) return exec.apply(this, arguments);

      const key = this._key || this.getCacheKey();
      const ttl = this._ttl;

      return new Promise((resolve, reject) => {
        cache.get(key, (err, cachedResults) => { //eslint-disable-line handle-callback-err
          if (cachedResults != null) {
            cachedResults = recoverObjectId(mongoose, cachedResults);

            callback(null, cachedResults);
            return resolve(cachedResults);
          }

          exec
            .call(this)
            .then((results) => {
              cache.set(key, results, ttl, () => {
                callback(null, results);
                resolve(results);
              });
            })
            .catch((err) => {
              callback(err);
              reject(err);
            });
        });
      });
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
