module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/../../scripts/jest-db-isolation.cjs'],
  moduleNameMapper: {
    '^@patchversion/shared$': '<rootDir>/../shared/src/index.ts',
  },
};
