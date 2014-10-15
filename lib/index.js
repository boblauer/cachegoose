var mongoose = require('mongoose');
var cache = require('./cache');

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

  var self = this;
  var key = this.getCacheKey();
  var ttl = this._ttl;
  var model = this.model.modelName;

  var promise = new mongoose.Promise();
  promise.onResolve(callback);

  cache.get(key, function(err, cachedResults) {
    if (cachedResults) {
      if (cachedResults.needsInflation) {
        var constructor = mongoose.model(model);
        cachedResults.records = cachedResults.records.map(inflateModel(constructor));
      }

      cachedResults.records._fromCache = true;
      promise.resolve(null, cachedResults.records);
    } else {
      exec.call(self).onResolve(function(err, results) {
        if (err) return promise.resolve(err);

        var needsInflation = results && results[0] && results[0].constructor.name === 'model';
        cache.set(key, { records: results, needsInflation: needsInflation }, ttl, function() {
          promise.resolve(null, results);
        });
      });
    }
  });

  return promise;
};

mongoose.Query.prototype.cache = function(ttl) {
  this._ttl = ttl;
  if (!ttl) {
    cache.del(this.getCacheKey());
  }

  return this;
};

mongoose.Query.prototype.getCacheKey = function() {
  return JSON.stringify({
    model: this.model.modelName,
    op: this.op,
    _conditions: this._conditions,
    _fields: this._fields,
    _path: this._path,
    _distinct: this._distinct,
  });
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

// function inflate()
