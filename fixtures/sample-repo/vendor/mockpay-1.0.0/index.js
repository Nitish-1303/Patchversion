// mockpay v1: charges.create requires the `source` parameter.
const charges = {
  create: async (params) => {
    if (params.payment_method !== undefined) {
      throw new Error('Unknown parameter: payment_method');
    }
    if (params.source === undefined) {
      throw new Error('Missing required parameter: source');
    }
    return { id: 'ch_123', amount: params.amount, currency: params.currency, status: 'succeeded' };
  },
};

const refunds = {
  create: async (params) => ({ id: 're_123', amount: params.amount, status: 'succeeded' }),
};

module.exports = { charges, refunds };
