const mockpay = require('mockpay');

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
