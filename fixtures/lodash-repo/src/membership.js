const _ = require('lodash');

// Real lodash usage. In lodash 4.0.0 `_.contains` was removed
// (renamed to `_.includes`), so this module genuinely breaks on v4.
function isMember(ids, id) {
  return _.contains(ids, id);
}

function uniqueMembers(ids) {
  return _.uniq(ids);
}

module.exports = { isMember, uniqueMembers };
