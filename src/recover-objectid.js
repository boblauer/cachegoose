'use strict';

module.exports = function(mongoose, cachedResults) {
  return Array.isArray(cachedResults) ?
    cachedResults.map(recoverObjectId(mongoose)) :
    recoverObjectId(mongoose)(cachedResults);
};

function recoverObjectId(mongoose) {
  return data => {
    if (!data._id) {
      return data;
    }

    data._id = mongoose.Types.ObjectId(data._id);
    return data;
  }
}
