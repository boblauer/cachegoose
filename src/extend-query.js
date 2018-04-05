'use strict';

const generateKey = require('./generate-key');

module.exports = function(mongoose, cache) {
  const exec = mongoose.Query.prototype.exec;

  mongoose.Query.prototype.exec = function(op, callback = function() { }) {
    if (!this.hasOwnProperty('_ttl')) return exec.apply(this, arguments);

    if (typeof op === 'function') {
      callback = op;
      op = null;
    } else if (typeof op === 'string') {
      this.op = op;
    }

    const key = this._key || this.getCacheKey();
    const ttl = this._ttl;
    const isCount = this.op === 'count';
    const isLean = this._mongooseOptions.lean;
    const model = this.model.modelName;

    return new Promise((resolve, reject) => {
      cache.get(key, (err, cachedResults) => { //eslint-disable-line handle-callback-err
        if (cachedResults !== undefined && cachedResults !== null) {
          if (isCount) {
            callback(null, cachedResults);
            return resolve(cachedResults);
          }

          if (!isLean) {
            const constructor = mongoose.model(model);
            cachedResults = Array.isArray(cachedResults) ?
              cachedResults.map(inflateModel(constructor)) :
              inflateModel(constructor)(cachedResults);
          }

          callback(null, cachedResults);
          return resolve(cachedResults);
        }

        exec
          .call(this)
          .then((results) => {
            cache.set(key, results, ttl, () => {
              callback(null, results);
              return resolve(results);
            });
          })
          .catch((err) => {
            callback(err);
            reject(err);
          });
      });
    });
  };

  mongoose.Query.prototype.cache = function(ttl = 60, customKey = '') {
    if (typeof ttl === 'string') {
      customKey = ttl;
      ttl = 60;
    }

    this._ttl = ttl;
    this._key = customKey;
    return this;
  };

  mongoose.Query.prototype.getCacheKey = function() {
    const key = {
      model: this.model.modelName,
      op: this.op,
      skip: this.options.skip,
      limit: this.options.limit,
      sort: this.options.sort,
      _options: this._mongooseOptions,
      _conditions: this._conditions,
      _fields: this._fields,
      _path: this._path,
      _distinct: this._distinct
    };

    return generateKey(key);
  };
};

function inflateModel(constructor) {
  return (data) => {
    if (constructor.inflate) {
      return constructor.inflate(data);
    } else {
      const model = constructor(data);
      model.$__reset();
      model.isNew = false;
      return model;
    }
  };
}
