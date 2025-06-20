const midtransClient = require("midtrans-client");
require("dotenv").config();

const snap = new midtransClient.Snap({
  isProduction: true, // atau false kalau sandbox
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

async function createGopayPayment(orderId, amount) {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    enabled_payments: ["gopay"],
    gopay: {
      enable_callback: false,
      callback_url: "",
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    const snapToken = transaction.token;
    const snapUrl = transaction.redirect_url;
    const transactionId = snapUrl.split("/").pop().split("#")[0]; // ambil UUID

    const qrisImageUrl = `https://app.midtrans.com/snap/v2/qris/${transactionId}.png`;

    return {
      snapUrl,
      qrisImageUrl,
      transactionId,
      total: amount,
    };
  } catch (error) {
    console.error("❌ Snap error:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createGopayPayment };
