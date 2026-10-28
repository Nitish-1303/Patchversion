module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
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
