#cachegoose

####Mongoose caching that actually works.

[![Build Status](https://travis-ci.org/boblauer/cachegoose.svg)](https://travis-ci.org/boblauer/cachegoose)

##About

While looking for a Mongoose caching solution, I grew tired of packages that didn't work with the latest version of Mongoose, or that returned POJO's instead of Mongoose models.  This inspired me to write cachegoose, A Mongoose caching module that works exactly how you would expect it to, with the latest version of Mongoose.

##Usage

```javascript
var mongoose = require('mongoose');
var cachegoose = require('cachegoose');

cachegoose(mongoose, {
  engine: 'redis',    // If you don't specify the redis engine,
  port: 6379,         // the query results will be cached in memory.
  host: 'localhost'
});

Record
  .find({ some_condition: true })
  .ttl(30) // The number of seconds to cache the query in Redis.  Defaults to 1 minute.
  .exec(function(err, records) {
    ...
  });
```

That's pretty much it.  Just insert `.ttl()` into the queries you want to cache, and they will be cached.  Works with `select`, `lean`, `sort`, and anything else that will modify the results of a query.

##Test
npm test
