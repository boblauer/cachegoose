/* jshint expr: true, unused: false */
/* global describe, it, before, after, beforeEach, afterEach */

var async      = require('async')
  , mongoose   = require('mongoose')
  , cachegoose = require('../')
  , should     = require('should')
  , mongoose   = require('mongoose')
  , Schema     = mongoose.Schema
  , RecordSchema
  , Record
  , cache
  , db
  ;

describe('cachegoose', function() {
  before(function(done) {
    cachegoose(mongoose);

    cache = cachegoose._cache;

    mongoose.connect('mongodb://127.0.0.1/mongoose-cachegoose-testing');
    db = mongoose.connection;

    db.on('error', done);
    db.on('open', done);

    RecordSchema = new Schema({
      num: Number,
      date: {
        type: Date,
        default: Date.now
      }
    });

    Record = mongoose.model('Record', RecordSchema);
  });

  beforeEach(function(done) {
    generate(10, done);
  });

  afterEach(function(done) {
    Record.remove(function() {
      cache.clear(done);
    });
  });

  it('should have cache method after initialization', function () {
    Record.find({}).cache.should.be.a.Function;
  });

  it('should cache a simple query that uses callbacks', function(done) {
    getAll(60e3, function(err, res) {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      getAll(60e3, function(err, res) {
        res.length.should.equal(10);
        Boolean(res._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should cache a simple query that uses promises', function(done) {
    getAll(60e3).then(function(res) {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      getAll(60e3).then(function(res) {
        res.length.should.equal(10);
        Boolean(res._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should not cache the same query w/out a ttl defined', function(done) {
    getAll(60e3).then(function(res) {
      getAllNoCache(function(err, res) {
        Boolean(res._fromCache).should.be.false;
        done();
      });
    });
  });

  it('should return a Mongoose model from cached and non-cached results', function(done) {
    getAll(60e3, function(err, res) {
      var first = res[0];

      getAll(60e3, function(err2, res2) {
        var cachedFirst = res2[0];
        first.constructor.name.should.equal('model');
        cachedFirst.constructor.name.should.equal('model');

        res[0].isNew.should.be.false;
        res2[0].isNew.should.be.false;

        done();
      });
    });
  });

  it('should return lean models from cached and non-cached results', function(done) {
    getAllLean(10e3, function(err, res) {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      getAllLean(10e3, function(err, res2) {
        res2.length.should.equal(10);
        Boolean(res2._fromCache).should.be.true;
        res[0].constructor.name.should.not.equal('model');
        res2[0].constructor.name.should.not.equal('model');
        done();
      });
    });
  });

  it('should distinguish between lean and non lean for the same conditions', function(done) {
    getAll(10e3, function(err, res) {
      getAll(10e3, function(err, res2) {
        res2.length.should.equal(10);
        Boolean(res2._fromCache).should.be.true;
        res2[0].constructor.name.should.equal('model');

        getAllLean(function(err, res3) {
          Boolean(res3._fromCache).should.be.false;
          res3[0].constructor.name.should.not.equal('model');
          done();
        });
      });
    });
  });

  it('should cache a findOne query', function(done) {
    getOne(10e3, function(err, res) {
      res.constructor.name.should.equal('model');

      getOne(10e3, function(err, res2) {
        res2.constructor.name.should.equal('model');
        Boolean(res2._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should cache a query rerun many times', function(done) {
    getAll(60e3).then(function(res) {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      async.series(
        new Array(20).join('.').split('').map(function() {
          return function(done) {
            getAll(60e3, done);
          };
        })
      , function() {
        getAll(60e3, function(err, res) {
          res.length.should.equal(10);
          Boolean(res._fromCache).should.be.true;
          done();
        });
      });
    });
  });

  it('should expire the cache', function(done) {
    getAll(1, function() {
      setTimeout(function() {
        getAll(1, function(err, res) {
          Boolean(res._fromCache).should.be.false;
          done();
        });
      }, 1200);
    });
  });
});

function getAll(ttl, cb) {
  return Record.find({}).cache(ttl).exec(cb);
}

function getAllNoCache(cb) {
  return Record.find({}).exec(cb);
}

function getAllLean(ttl, cb) {
  return Record.find({}).lean().cache(ttl).exec(cb);
}

function getOne(ttl, cb) {
  return Record.findOne({ num: { $gt: 2 } }).cache(ttl).exec(cb);
}

function generate (amount, cb) {
  var records = [];
  var count = 0;
  while (count < amount) {
    records.push({
      num: count
    });
    count++;
  }

  Record.create(records, cb);
}

