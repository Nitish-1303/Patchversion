import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import globals from 'globals';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: [
      'packages/engine/**/*.{js,cjs,mjs,ts,tsx}',
      'packages/shared/**/*.{js,cjs,mjs,ts,tsx}',
      'packages/site/test/**/*.{js,cjs,mjs,ts,tsx}',
      'packages/site/jest.config.cjs',
      '*.config.{js,cjs,mjs}',
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.jest },
    },
  },
  {
    files: [
      'fixtures/**/*.{js,cjs}',
      'packages/engine/test/**/*.{js,cjs,ts,tsx}',
      'packages/shared/test/**/*.{js,cjs,ts,tsx}',
      'packages/site/test/**/*.{js,cjs,ts,tsx}',
    ],
    rules: {
      // These files intentionally use CommonJS: fixtures model consumer
      // projects, and Jest uses require() for module isolation in tests.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['packages/site/src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    settings: {
      next: {
        rootDir: 'packages/site/',
      },
    },
  },
  {
    files: ['packages/site/next.config.*'],
    languageOptions: {
      globals: globals.node,
    },
  },
  globalIgnores([
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/dist/**',
    '**/node_modules/**',
    'packages/site/next-env.d.ts',
  ]),
]);
