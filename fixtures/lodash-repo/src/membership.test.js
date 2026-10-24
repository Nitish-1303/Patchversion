// Tests run against the REAL lodash package installed from the npm
// registry - no mocks, no vendored doubles.
const { isMember, uniqueMembers } = require('./membership');

describe('isMember', () => {
  test('finds a present member', () => {
    expect(isMember([1, 2, 3], 2)).toBe(true);
  });

  test('rejects an absent member', () => {
    expect(isMember([1, 2, 3], 9)).toBe(false);
  });
});

describe('uniqueMembers', () => {
  test('dedupes', () => {
    expect(uniqueMembers([1, 1, 2, 2, 3])).toEqual([1, 2, 3]);
  });
});
