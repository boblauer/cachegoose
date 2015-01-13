'use strict';

module.exports = function(mongoose, cache) {
  var exec = mongoose.Query.prototype.exec;

  mongoose.Query.prototype.exec = function(op, callback) {
    if (!this._ttl) return exec.apply(this, arguments);

    if (typeof op === 'function') {
      callback = op;
      op = null;
    } else if (typeof op === 'string') {
      this.op = op;
    }

    callback = callback || function() { };

    var self    = this
      , key     = this.getCacheKey()
      , ttl     = this._ttl
      , isLean  = this._mongooseOptions.lean
      , model   = this.model.modelName
      , promise = new mongoose.Promise()
      ;

    promise.onResolve(callback);

    cache.get(key, function(err, cachedResults) {
      if (cachedResults) {
        if (!isLean) {
          var constructor = mongoose.model(model);
          cachedResults = Array.isArray(cachedResults) ?
            cachedResults.map(inflateModel(constructor)) :
            inflateModel(constructor)(cachedResults);
        }

        cachedResults._fromCache = true;
        promise.resolve(null, cachedResults);
      } else {
        exec.call(self).onResolve(function(err, results) {
          if (err) return promise.resolve(err);
          cache.set(key, results, ttl, function() {
            promise.resolve(null, results);
          });
        });
      }
    });

    return promise;
  };

  mongoose.Query.prototype.cache = function(ttl) {
    if (ttl === false) {
      cache.del(this.getCacheKey());
    } else {
      this._ttl = ttl || 60;
    }

    return this;
  };

  mongoose.Query.prototype.getCacheKey = function() {
    return JSON.stringify({
      model: this.model.modelName,
      op: this.op,
      skip: this.options.skip,
      limit: this.options.limit,
      _options: this._mongooseOptions,
      _conditions: this._conditions,
      _fields: this._fields,
      _path: this._path,
      _distinct: this._distinct,
    });
  };
};

function inflateModel(constructor) {
  return function(data) {
    if (constructor.inflate) {
      return constructor.inflate(data);
    } else {
      var model = constructor(data);
      model.$__reset();
      model.isNew = false;
      return model;
    }
  };
}
