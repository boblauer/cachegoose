# cachegoose #

#### Mongoose caching that actually works. ####

[![Build Status](https://travis-ci.org/boblauer/cachegoose.svg)](https://travis-ci.org/boblauer/cachegoose)

## About ##

A Mongoose caching module that works exactly how you would expect it to, with the latest version of Mongoose.

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

That's pretty much it.  Just insert `.cache()` into the queries you want to cache, and they will be cached.  Works with `select`, `lean`, `sort`, and anything else that will modify the results of a query.

## Test ##
npm test
