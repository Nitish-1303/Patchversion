// The vendored mockpay versions in ./vendor both name the "mockpay" package.
// Keep them out of Jest's module map so `require('mockpay')` resolves to the
// installed version in node_modules only.
module.exports = {
  modulePathIgnorePatterns: ['<rootDir>/vendor/'],
};
