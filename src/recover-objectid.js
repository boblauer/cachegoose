'use strict';

module.exports = function(mongoose, cachedResults) {
  if (!Array.isArray(cachedResults)) {
    return recoverObjectId(mongoose, cachedResults);
  }

  const recoveredResult = [];

  for (const doc of cachedResults) {
    recoveredResult.push(recoverObjectId(mongoose, doc));
  }

  return recoveredResult;
};

function recoverObjectId(mongoose, doc) {
  if (!doc._id) {
    return doc;
  }

  // eslint-disable-next-line new-cap
  doc._id = mongoose.Types.ObjectId(doc._id);
  return doc;
}
