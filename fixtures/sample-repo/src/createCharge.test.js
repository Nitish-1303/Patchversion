const { createCharge, refundCharge } = require('./createCharge');

// Mock the mockpay module
jest.mock('mockpay', () => ({
  charges: {
    create: jest.fn().mockResolvedValue({ id: 'ch_123', amount: 2000, currency: 'usd', status: 'succeeded' }),
  },
  refunds: {
    create: jest.fn().mockResolvedValue({ id: 're_123', amount: 2000, status: 'succeeded' }),
  },
}));

describe('createCharge', () => {
  test('creates a charge with correct params', async () => {
    const mockpay = require('mockpay');
    const result = await createCharge(2000, 'usd', 'tok_visa');
    expect(result.id).toBe('ch_123');
    expect(mockpay.charges.create).toHaveBeenCalledWith({
      amount: 2000,
      currency: 'usd',
      source: 'tok_visa',
      description: 'Payment for order',
    });
  });

  test('passes through the source parameter', async () => {
    const mockpay = require('mockpay');
    await createCharge(1000, 'eur', 'tok_amex');
    expect(mockpay.charges.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'tok_amex' })
    );
  });
});

describe('refundCharge', () => {
  test('creates a refund', async () => {
    const result = await refundCharge('ch_123', 1000);
    expect(result.id).toBe('re_123');
  });
});
