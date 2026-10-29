module.exports = {
  rootDir: __dirname,
  roots: ['<rootDir>/test'],
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'CommonJS',
        target: 'ES2022',
        esModuleInterop: true,
      },
    }],
  },
};
