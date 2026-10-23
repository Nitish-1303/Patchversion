// mockpay v2 (breaking): the `source` parameter was renamed to `payment_method`.
// The old parameter is ignored, so v1 code fails here.
const charges = {
  create: async (params) => {
    if (params.payment_method === undefined) {
      throw new Error('Missing required parameter: payment_method');
    }
    return { id: 'ch_123', amount: params.amount, currency: params.currency, status: 'succeeded' };
  },
};

const refunds = {
  create: async (params) => ({ id: 're_123', amount: params.amount, status: 'succeeded' }),
};

module.exports = { charges, refunds };
