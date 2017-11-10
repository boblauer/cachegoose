'use strict';

require('should');

const async = require('async');
const mongoose = require('mongoose');
const cachegoose = require('../');
const Schema = mongoose.Schema;

let RecordSchema;
let Record;
let cache;
let db;

describe('cachegoose', () => {
  before((done) => {
    cachegoose(mongoose, {}, true);

    cache = cachegoose._cache;

    mongoose.connect('mongodb://127.0.0.1/mongoose-cachegoose-testing');
    db = mongoose.connection;

    db.on('error', done);
    db.on('open', done);

    RecordSchema = new Schema({
      num: Number,
      str: String,
      date: {
        type: Date,
        default: Date.now
      }
    });

    Record = mongoose.model('Record', RecordSchema);
  });

  beforeEach((done) => {
    generate(10, done);
  });

  afterEach((done) => {
    Record.remove(() => {
      cache.clear(done);
    });
  });

  it('should have cache method after initialization', () => {
    Record.find({}).cache.should.be.a.Function;
  });

  it('should cache a simple query that uses callbacks', (done) => {
    getAll(60, (err, res) => {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      getAll(60, (err, res) => {
        res.length.should.equal(10);
        Boolean(res._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should cache a simple query that uses promises', (done) => {
    getAll(60).then((res) => {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      getAll(60).then((res) => {
        res.length.should.equal(10);
        Boolean(res._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should not cache the same query w/out a ttl defined', (done) => {
    getAll(60).then((res) => {
      getAllNoCache((err, res) => {
        Boolean(res._fromCache).should.be.false;
        done();
      });
    });
  });

  it('should return a Mongoose model from cached and non-cached results', (done) => {
    getAll(60, (err, res) => {
      const first = res[0];

      getAll(60, (err2, res2) => {
        const cachedFirst = res2[0];
        first.constructor.name.should.equal('model');
        cachedFirst.constructor.name.should.equal('model');

        res[0].isNew.should.be.false;
        res2[0].isNew.should.be.false;

        done();
      });
    });
  });

  it('should return lean models from cached and non-cached results', (done) => {
    getAllLean(10, (err, res) => {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      getAllLean(10, (err, res2) => {
        res2.length.should.equal(10);
        Boolean(res2._fromCache).should.be.true;
        res[0].constructor.name.should.not.equal('model');
        res2[0].constructor.name.should.not.equal('model');
        done();
      });
    });
  });

  it('should cache a query that returns no results', (done) => {
    getNone(10, (err, res) => {
      res.length.should.equal(0);
      Boolean(res._fromCache).should.be.false;

      getNone(10, (err, res2) => {
        res2.length.should.equal(0);
        Boolean(res2._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should distinguish between lean and non lean for the same conditions', (done) => {
    getAll(10, (err, res) => {
      getAll(10, (err, res2) => {
        res2.length.should.equal(10);
        Boolean(res2._fromCache).should.be.true;
        res2[0].constructor.name.should.equal('model');

        getAllLean((err, res3) => {
          Boolean(res3._fromCache).should.be.false;
          res3[0].constructor.name.should.not.equal('model');
          done();
        });
      });
    });
  });

  it('should correctly cache queries using skip', (done) => {
    getWithSkip(1, 10, (err, res) => {
      Boolean(res._fromCache).should.be.false;
      res.length.should.equal(9);

      getWithSkip(1, 10, (err, res2) => {
        Boolean(res2._fromCache).should.be.true;
        res2.length.should.equal(9);

        getWithSkip(2, 10, (err, res3) => {
          Boolean(res3._fromCache).should.be.false;
          res3.length.should.equal(8);
          done();
        });
      });
    });
  });

  it('should correctly cache queries using limit', (done) => {
    getWithLimit(5, 10, (err, res) => {
      Boolean(res._fromCache).should.be.false;
      res.length.should.equal(5);

      getWithLimit(5, 10, (err, res2) => {
        Boolean(res2._fromCache).should.be.true;
        res2.length.should.equal(5);

        getWithLimit(4, 10, (err, res3) => {
          Boolean(res3._fromCache).should.be.false;
          res3.length.should.equal(4);
          done();
        });
      });
    });
  });

  it('should correctly cache the same query with different condition orders', (done) => {
    getWithUnorderedQuery(10, (err, res) => {
      Boolean(res._fromCache).should.be.false;
      getWithUnorderedQuery(10, (err, res2) => {
        Boolean(res2._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should cache a findOne query', (done) => {
    getOne(10, (err, res) => {
      res.constructor.name.should.equal('model');

      getOne(10, (err, res2) => {
        res2.constructor.name.should.equal('model');
        Boolean(res2._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should cache a regex condition properly', (done) => {
    getAllWithRegex(10, (err, res) => {
      Boolean(res._fromCache).should.be.false;

      getAllWithRegex(10, (err, res) => {
        Boolean(res._fromCache).should.be.true;

        getNoneWithRegex(10, (err, res) => {
          Boolean(res._fromCache).should.be.false;
          done();
        });
      });
    });
  });

  it('should cache a query rerun many times', (done) => {
    getAll(60).then((res) => {
      res.length.should.equal(10);
      Boolean(res._fromCache).should.be.false;

      async.series(
        new Array(20).join('.').split('').map(() => {
          return function(done) {
            getAll(60, done);
          };
        })
        , () => {
          getAll(60, (err, res) => {
            res.length.should.equal(10);
            Boolean(res._fromCache).should.be.true;
            done();
          });
        });
    });
  });

  it('should expire the cache', (done) => {
    getAll(1, () => {
      setTimeout(() => {
        getAll(1, (err, res) => {
          Boolean(res._fromCache).should.be.false;
          done();
        });
      }, 1200);
    });
  });

  it('should cache aggregate queries', (done) => {
    aggregate(60, (err, res) => {
      Boolean(res._fromCache).should.be.false;
      aggregate(60, (err, res2) => {
        Boolean(res2._fromCache).should.be.true;
        done();
      });
    });
  });

  it('should cache aggregate queries that use Promises', (done) => {
    aggregate(60)
      .then((res) => {
        Boolean(res._fromCache).should.be.false;
      })
      .then(() => {
        return aggregate(60);
      })
      .then((res) => {
        Boolean(res._fromCache).should.be.true;
      })
      .then(() => done())
      .catch(done);
  });

  it('should clear a custom cache key', (done) => {
    getAllCustomKey(60, 'custom-key', (err, res) => {
      Boolean(res._fromCache).should.be.false;
      getAllCustomKey(60, 'custom-key', (err, res2) => {
        Boolean(res2._fromCache).should.be.true;
        cachegoose.clearCache('custom-key');
        getAllCustomKey(60, 'custom-key', (err, res3) => {
          Boolean(res3._fromCache).should.be.false;
          done();
        });
      });
    });
  });

  it('should cache a `count` query', (done) => {
    Record.find({}).cache(60).count().exec((err, res) => {
      Boolean(res._fromCache).should.be.false;

      Record.find({}).cache(60).count().exec((err, res) => {
        Boolean(res._fromCache).should.be.true;
        done();
      });
    });
  });
});

function getAll(ttl, cb) {
  return Record.find({}).cache(ttl).exec(cb);
}

function getAllCustomKey(ttl, key, cb) {
  return Record.find({}).cache(ttl, key).exec(cb);
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

function getWithSkip(skip, ttl, cb) {
  return Record.find({}).skip(skip).cache(ttl).exec(cb);
}

function getWithLimit(limit, ttl, cb) {
  return Record.find({}).limit(limit).cache(ttl).exec(cb);
}

function getNone(ttl, cb) {
  return Record.find({ notFound: true }).cache(ttl).exec(cb);
}

function getAllWithRegex(ttl, cb) {
  return Record.find({ str: { $regex: /\d/ } }).cache(ttl).exec(cb);
}

function getNoneWithRegex(ttl, cb) {
  return Record.find({ str: { $regex: /\d\d/ } }).cache(ttl).exec(cb);
}

let flag = true;
function getWithUnorderedQuery(ttl, cb) {
  flag = !flag;
  if (flag) {
    return Record.find({ a: true, b: false }).cache(ttl).exec(cb);
  } else {
    return Record.find({ b: false, a: true }).cache(ttl).exec(cb);
  }
}

function aggregate(ttl, cb) {
  return Record.aggregate()
    .group({ _id: null, total: { $sum: '$num' } })
    .cache(ttl)
    .exec(cb);
}

function generate(amount, cb) {
  const records = [];
  let count = 0;
  while (count < amount) {
    records.push({
      num: count,
      str: count.toString()
    });
    count++;
  }

  Record.create(records, cb);
}
