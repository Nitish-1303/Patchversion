import { loadConfig } from '../src/config';

describe('engine execution policy configuration', () => {
  test('requires isolation by default', () => {
    expect(loadConfig().requireIsolation).toBe(true);
  });

  test('rejects test-only execution policy overrides outside the test runtime', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    let loadProductionConfig: typeof loadConfig | undefined;

    try {
      jest.isolateModules(() => {
        loadProductionConfig = (require('../src/config') as typeof import('../src/config')).loadConfig;
      });
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }

    expect(loadProductionConfig).toBeDefined();
    expect(() => loadProductionConfig!({ requireIsolation: false })).toThrow(
      'The local execution policy can only be relaxed in the test runtime (NODE_ENV=test).',
    );
    expect(() => loadProductionConfig!({ trustedFixtureDirs: ['/untrusted/repository'] })).toThrow(
      'The local execution policy can only be relaxed in the test runtime (NODE_ENV=test).',
    );
  });
});
