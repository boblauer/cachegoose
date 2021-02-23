'use strict';

require('should');

const mongoose = require('mongoose');
const cachegoose = require('../out');
const Schema = mongoose.Schema;

let RecordSchema;
let Record;
let db;

describe('cachegoose', () => {
  before((done) => {
    cachegoose(mongoose);

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

  beforeEach(() => {
    return generate(10);
  });

  afterEach((done) => {
    Record.remove(() => {
      cachegoose.clearCache(null, done);
    });
  });

  it('should throw an error if the hydrate method exists', () => {
    const mongoose = { Model: { hydrate: undefined } };
    (() => cachegoose(mongoose)).should.throw();
  });

  it('should not an error if the hydrage method exists', () => {
    (() => cachegoose(mongoose)).should.not.throw();
  });

  it('should have cache method after initialization', () => {
    Record.find({}).cache.should.be.a.Function;
  });

  it('should cache a simple query that uses callbacks', (done) => {
    getAll(60, (err, res) => {
      if (err) return done(err);

      res.length.should.equal(10);

      generate(10).then(() => {
        getAll(60, (err, res) => {
          if (err) return done(err);
          res.length.should.equal(10);
          done();
        });
      });
    });
  });

  it('should cache a simple query that uses promises', async () => {
    const res = await getAll(60);
    res.length.should.equal(10);

    await generate(10);
    const cachedRes = await getAll(60);
    cachedRes.length.should.equal(10);
  });

  it('should not cache the same query w/out a ttl defined', async () => {
    const res = await getAll(60);
    res.length.should.equal(10);

    await generate(10);

    const nonCachedResponse = await getAllNoCache();
    nonCachedResponse.length.should.equal(20);
  });

  it('should return a Mongoose model from cached and non-cached results', (done) => {
    getAll(60, (err, res) => {
      if (err) return done(err);

      const first = res[0];

      getAll(60, (err, res2) => {
        if (err) return done(err);

        const cachedFirst = res2[0];
        first.constructor.name.should.equal('model');
        cachedFirst.constructor.name.should.equal('model');

        res[0].isNew.should.be.false;
        res2[0].isNew.should.be.false;

        done();
      });
    });
  });

  it('should return lean models from cached and non-cached results', async () => {
    const lean = await getAllLean(10);
    lean.length.should.equal(10);

    await generate(10);

    const cachedLean = await getAllLean(10);
    cachedLean.length.should.equal(10);

    lean[0].constructor.name.should.not.equal('model');
    cachedLean[0].constructor.name.should.not.equal('model');
  });

  it('should cache a query that returns no results', async () => {
    const empty = await getNone(60);
    empty.length.should.equal(0);

    await generate(10);

    const cachedEmpty = await getNone(60);
    cachedEmpty.length.should.equal(0);
  });

  it('should distinguish between lean and non lean for the same conditions', async () => {
    const res = await getAll(60);
    res.length.should.equal(10);

    await generate(10);

    const cachedRes = await getAll(60);
    cachedRes.length.should.equal(10);

    const nonCachedLean = await getAllLean(60);
    nonCachedLean[0].constructor.name.should.not.equal('model');
  });

  it('should correctly cache queries using skip', async () => {
    const res = await getWithSkip(1, 60);
    res.length.should.equal(9);

    await generate(10);

    const cachedRes = await getWithSkip(1, 60);
    cachedRes.length.should.equal(9);

    const nonCached = await getWithSkip(2, 60);
    nonCached.length.should.equal(18);
  });

  it('should correctly cache queries using limit', async () => {
    const res = await getWithLimit(5, 60);
    res.length.should.equal(5);

    await Record.remove();

    const cached = await getWithLimit(5, 60);
    cached.length.should.equal(5);

    await generate(10);

    const nonCached = await getWithLimit(4, 60);
    nonCached.length.should.equal(4);
  });

  it('should correctly cache the same query with different condition orders', async () => {
    const res = await getWithUnorderedQuery(60);
    res.length.should.equal(10);

    await generate(10);

    const cached = await getWithUnorderedQuery(60);
    cached.length.should.equal(10);
  });

  it('should cache a findOne query', async () => {
    const one = await getOne(60);
    Boolean(one).should.be.true;

    await Record.remove();

    const cachedOne = await getOne(60);
    Boolean(cachedOne).should.be.true;
  });

  it('should cache a regex condition properly', async () => {
    const res = await getAllWithRegex(60);
    res.length.should.equal(10);

    await generate(10);

    const cached = await getAllWithRegex(60);
    cached.length.should.equal(10);

    const nonCached = await getNoneWithRegex(60);
    nonCached.length.should.equal(0);
  });

  it('should cache a query rerun many times', async () => {
    const res = await getAll(60);
    res.length.should.equal(10);

    await generate(10);

    await Promise.all(new Array(20).join('.').split('').map(() => getAll(60)));

    const cached = await getAll(60);
    cached.length.should.equal(10);
  });

  it('should expire the cache', (done) => {
    getAll(1, () => {
      setTimeout(() => {
        getAll(1, (err, res) => {
          if (err) return done(err);

          Boolean(res._fromCache).should.be.false;
          done();
        });
      }, 1200);
    });
  });

  it('should cache aggregate queries that use callbacks', (done) => {
    aggregate(60, (err, res) => {
      if (err) return done(err);

      res[0].total.should.equal(45);

      generate(10).then(() => {
        aggregate(60, (err, cached) => {
          if (err) return done(err);

          cached[0].total.should.equal(45);
          done();
        });
      });
    });
  });

  it('should cache aggregate queries that use Promises', async () => {
    const [res] = await aggregate(60);
    res.total.should.equal(45);

    await generate(10);

    const [cached] = await aggregate(60);
    cached.total.should.equal(45);
  });

  it('should clear a custom cache key', async () => {
    const res = await getAllCustomKey(60, 'custom-key');
    res.length.should.equal(10);

    await generate(10);

    const cached = await getAllCustomKey(60, 'custom-key');
    cached.length.should.equal(10);

    cachegoose.clearCache('custom-key');

    const notCached = await getAllCustomKey(60, 'custom-key');
    notCached.length.should.equal(20);
  });

  it('should cache a count query', async () => {
    const res = await count(60);
    res.should.equal(10);

    await generate(10);

    const cached = await count(60);
    cached.should.equal(10);
  });

  it('should cache a count query with zero results', async () => {
    await Record.remove();

    const res = await count(60);
    res.should.equal(0);

    await generate(2);
    const cached = await count(60);

    cached.should.equal(0);
  });
  it('should cache a countDocuments query', async () => {
    const res = await countDocuments(60);
    res.should.equal(10);

    await generate(10);

    const cached = await countDocuments(60);
    cached.should.equal(10);
  });

  it('should cache a countDocuments query with zero results', async () => {
    await Record.remove();

    const res = await countDocuments(60);
    res.should.equal(0);

    await generate(2);
    const cached = await countDocuments(60);

    cached.should.equal(0);
  });
  it('should cache a estimatedDocumentCount query', async () => {
    const res = await estimatedDocumentCount(60);
    res.should.equal(10);

    await generate(10);

    const cached = await estimatedDocumentCount(60);
    cached.should.equal(10);
  });

  it('should cache a estimatedDocumentCount query with zero results', async () => {
    await Record.remove();

    const res = await estimatedDocumentCount(60);
    res.should.equal(0);

    await generate(2);
    const cached = await estimatedDocumentCount(60);

    cached.should.equal(0);
  });

  it('should correctly cache a query with a sort order', async () => {
    const res = await getAllSorted({ num: 1 });
    res.length.should.equal(10);

    await generate(10);

    const cached = await getAllSorted({ num: 1 });
    cached.length.should.equal(10);

    const diffSort = await getAllSorted({ num: -1 });
    diffSort.length.should.equal(20);
  });

  it('should return similar _id in cached array result for lean', async () => {
    const originalRes = await getAllLean(60);
    const cachedRes = await getAllLean(60);
    const originalConstructor = originalRes[0]._id.constructor.name.should;
    const cachedConstructor = cachedRes[0]._id.constructor.name.should;
    originalConstructor.should.deepEqual(cachedConstructor);
  });

  it('should return similar _id in one cached result for lean', async () => {
    const originalRes = await getOneLean(60);
    const cachedRes = await getOneLean(60);
    const originalConstructor = originalRes._id.constructor.name.should;
    const cachedConstructor = cachedRes._id.constructor.name.should;
    originalConstructor.should.deepEqual(cachedConstructor);
  });

  it('should return similar _id in cached array result for aggregate', async () => {
    const originalRes = await aggregateAll(60);
    const cachedRes = await aggregateAll(60);
    const originalConstructor = originalRes[0]._id.constructor.name.should;
    const cachedConstructor = cachedRes[0]._id.constructor.name.should;
    originalConstructor.should.deepEqual(cachedConstructor);
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

function getOneLean(ttl, cb) {
  return Record.findOne({ num: { $gt: 2 } }).lean().cache(ttl).exec(cb);
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

function getWithUnorderedQuery(ttl, cb) {
  getWithUnorderedQuery.flag = !getWithUnorderedQuery.flag;
  if (getWithUnorderedQuery.flag) {
    return Record.find({ num: { $exists: true }, str: { $exists: true } }).cache(ttl).exec(cb);
  } else {
    return Record.find({ str: { $exists: true }, num: { $exists: true } }).cache(ttl).exec(cb);
  }
}

function getAllSorted(sortObj) {
  return Record.find({}).sort(sortObj).cache(60).exec();
}

function count(ttl, cb) {
  return Record.find({})
    .cache(ttl)
    .count()
    .exec(cb);
}
function countDocuments(ttl, cb) {
  return Record.find({})
    .cache(ttl)
    .countDocuments()
    .exec(cb);
}
function estimatedDocumentCount(ttl, cb) {
  return Record.find({})
    .cache(ttl)
    .estimatedDocumentCount()
    .exec(cb);
}

function aggregate(ttl, cb) {
  return Record.aggregate()
    .group({ _id: null, total: { $sum: '$num' } })
    .cache(ttl)
    .exec(cb);
}

function aggregateAll(ttl, cb) {
  return Record.aggregate([
    { $match: {} },
  ])
    .cache(ttl)
    .exec(cb);
}

function generate(amount) {
  const records = [];
  let count = 0;
  while (count < amount) {
    records.push({
      num: count,
      str: count.toString()
    });
    count++;
  }

  return Record.create(records);
}
