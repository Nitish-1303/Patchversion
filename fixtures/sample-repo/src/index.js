const { createCharge, refundCharge } = require('./createCharge');

async function main() {
  const charge = await createCharge(2000, 'usd', 'tok_visa');
  console.log('Charge created:', charge.id);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createCharge, refundCharge };
