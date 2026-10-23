// Tests run against the REAL mockpay client (vendored in ./vendor).
// No mocks: when mockpay 2.0.0 drops the `source` parameter, these tests
// genuinely fail - that red state is what the proof loop needs.
const { createCharge, refundCharge } = require('./createCharge');

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
