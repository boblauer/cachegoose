let generateKey = require('./generate-key');

module.exports = function(mongoose, cache, debug) {
  let exec = mongoose.Query.prototype.exec;

  mongoose.Query.prototype.exec = function(op, callback = function() { }) {
    if (!this.hasOwnProperty('_ttl')) return exec.apply(this, arguments);

    if (typeof op === 'function') {
      callback = op;
      op = null;
    } else if (typeof op === 'string') {
      this.op = op;
    }

    let key     = this._key || this.getCacheKey()
      , ttl     = this._ttl
      , isCount = this.op === 'count'
      , isLean  = this._mongooseOptions.lean
      , model   = this.model.modelName
      , Promise = mongoose.Promise
      ;

    return new Promise.ES6((resolve, reject) => {
      cache.get(key, (err, cachedResults) => {
        if (cachedResults) {
          if (isCount) {
            if (debug) cachedResults = { count: cachedResults, _fromCache: true };

            callback(null, cachedResults);
            return resolve(cachedResults);
          }

          if (!isLean) {
            let constructor = mongoose.model(model);
            cachedResults = Array.isArray(cachedResults) ?
              cachedResults.map(inflateModel(constructor)) :
              inflateModel(constructor)(cachedResults);
          }

          if (debug) cachedResults._fromCache = true;
          callback(null, cachedResults);
          return resolve(cachedResults);
        }

        exec
          .call(this)
          .then(results => {
            cache.set(key, results, ttl, () => {
              callback(null, results);
              return resolve(results);
            })
          })
          .catch(err => {
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
    let key = {
      model: this.model.modelName,
      op: this.op,
      skip: this.options.skip,
      limit: this.options.limit,
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
      let model = constructor(data);
      model.$__reset();
      model.isNew = false;
      return model;
    }
  };
}
