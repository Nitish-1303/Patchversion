import { IRepositoryFileProvider } from './repository-scanner';

export const DEMO_REPO_FILES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'acme-payments',
      version: '1.0.0',
      private: true,
      description: 'Sample payments service using a third-party API client',
      main: 'src/index.js',
      scripts: {
        test: 'jest --forceExit',
      },
      dependencies: {
        mockpay: 'file:vendor/mockpay-1.0.0',
      },
      devDependencies: {
        jest: '^29.7.0',
      },
    },
    null,
    2,
  ),
  'package-lock.json': JSON.stringify(
    {
      name: 'acme-payments',
      version: '1.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': {
          name: 'acme-payments',
          version: '1.0.0',
          dependencies: {
            mockpay: 'file:vendor/mockpay-1.0.0',
          },
          devDependencies: {
            jest: '^29.7.0',
          },
        },
        'node_modules/mockpay': {
          version: '1.0.0',
        },
        'node_modules/jest': {
          version: '29.7.0',
        },
      },
    },
    null,
    2,
  ),
  'src/createCharge.js': `const mockpay = require('mockpay');

async function createCharge(amount, currency, source) {
  const charge = await mockpay.charges.create({
    amount: amount,
    currency: currency,
    source: source,  // This field gets renamed to 'payment_method' in v2
    description: 'Payment for order'
  });
  return charge;
}

async function refundCharge(chargeId, amount) {
  const refund = await mockpay.refunds.create({
    charge: chargeId,
    amount: amount
  });
  return refund;
}

module.exports = { createCharge, refundCharge };
`,
  'src/index.js': `const { createCharge, refundCharge } = require('./createCharge');

async function main() {
  const charge = await createCharge(2000, 'usd', 'tok_visa');
  console.log('Charge created:', charge.id);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createCharge, refundCharge };
`,
  'src/createCharge.test.js': `const { createCharge, refundCharge } = require('./createCharge');

describe('createCharge', () => {
  test('creates a charge', async () => {
    const result = await createCharge(2000, 'usd', 'tok_visa');
    expect(result.id).toBe('ch_123');
    expect(result.status).toBe('succeeded');
  });

  test('passes the payment source through', async () => {
    const result = await createCharge(1000, 'eur', 'tok_amex');
    expect(result.amount).toBe(1000);
    expect(result.currency).toBe('eur');
  });
});

describe('refundCharge', () => {
  test('creates a refund', async () => {
    const result = await refundCharge('ch_123', 1000);
    expect(result.id).toBe('re_123');
  });
});
`,
};

/**
 * Creates an in-memory file provider containing the standard TryPatchBay demo fixture repository.
 * Guarantees zero-network, zero-filesystem execution for evaluation workflows in serverless environments.
 */
export function createBundledDemoFileProvider(): IRepositoryFileProvider {
  return {
    getFileContent: async (filePath: string): Promise<string | null> => {
      const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
      return DEMO_REPO_FILES[normalized] ?? null;
    },
    listFiles: async (): Promise<string[]> => {
      return Object.keys(DEMO_REPO_FILES);
    },
    getBranchHeadSha: async (): Promise<string> => {
      return 'demo-head-c69375d';
    },
  };
}
