# cachegoose #

#### Mongoose caching that actually works. ####

[![Build Status](https://travis-ci.org/boblauer/cachegoose.svg)](https://travis-ci.org/boblauer/cachegoose)

## About ##

A Mongoose caching module that works exactly how you would expect it to, with the latest version of Mongoose.

```
Important:

If you are using Mongoose 4.x or below, you need to use version 4.1 of this library.
```

## Usage ##

```javascript
var mongoose = require('mongoose');
var cachegoose = require('cachegoose');

cachegoose(mongoose, {
  engine: 'redis',    /* If you don't specify the redis engine,      */
  port: 6379,         /* the query results will be cached in memory. */
  host: 'localhost'
});

Record
  .find({ some_condition: true })
  .cache(30) // The number of seconds to cache the query.  Defaults to 60 seconds.
  .exec(function(err, records) {
    ...
  });

Record
  .aggregate()
  .group({ total: { $sum: '$some_field' } })
  .cache(0) // Explicitly passing in 0 will cache the results indefinitely.
  .exec(function(err, aggResults) {
    ...
  });

Record
  .find({})
  .cache(null) // Explicitly passing in null will not cache the results.
  .exec(function(err, records) {
    ...
  });
```

You can also pass a custom key into the `.cache()` method, which you can then use later to clear the cached content.

```javascript
var mongoose = require('mongoose');
var cachegoose = require('cachegoose');

cachegoose(mongoose, {
  engine: 'redis',
  port: 6379,
  host: 'localhost'
});

var userId = '1234567890';

Children
  .find({ parentId: userId })
  .cache(0, userId + '-children') /* Will create a redis entry          */
  .exec(function(err, records) {  /* with the key '1234567890-children' */
    ...
  });

ChildrenSchema.post('save', function(child) {
  // Clear the parent's cache, since a new child has been added.
  cachegoose.clearCache(child.parentId + '-children');
});
```

Insert `.cache()` into the queries you want to cache, and they will be cached.  Works with `select`, `lean`, `sort`, and anything else that will modify the results of a query.

## Clearing the cache ##

If you want to clear the cache for a specific query, you must specify the cache key yourself:

```js
function getChildrenByParentId(parentId, cb) {
  Children
    .find({ parentId })
    .cache(0, `${parentId}_children`)
    .exec(cb);
}

function clearChildrenByParentIdCache(parentId, cb) {
  cachegoose.clearCache(`${parentId}_children`, cb);
}
```

If you call `cachegoose.clearCache(null, cb)` without passing a cache key as the first parameter, the entire cache will be cleared for all queries.

## Caching populated documents ##

When a document is returned from the cache, cachegoose will [hydrate](http://mongoosejs.com/docs/api.html#model_Model.hydrate) it, which initializes it's virtuals/methods. Hydrating a populated document will discard any populated fields (see [Automattic/mongoose#4727](https://github.com/Automattic/mongoose/issues/4727)). To cache populated documents without losing child documents, you must use `.lean()`, however if you do this you will not be able to use any virtuals/methods (it will be a plain object).

## Test ##
npm test
