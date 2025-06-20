// backend/midtrans.js
const midtransClient = require("midtrans-client");
require("dotenv").config();

const snap = new midtransClient.Snap({
  isProduction: true, // Ganti false jika masih sandbox
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

async function createGopayPayment(orderId, amount) {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    enabled_payments: ["gopay"],
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    console.log("✅ Snap GoPay Response:");
    console.log(JSON.stringify(transaction, null, 2));

    return {
      snapUrl: transaction.redirect_url,
      total: amount,
    };

  } catch (error) {
    console.error("❌ Gagal membuat Snap GoPay transaction:");
    console.error(error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createGopayPayment };
