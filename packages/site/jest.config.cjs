module.exports = {
  rootDir: __dirname,
  roots: ['<rootDir>/test'],
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts'],
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
