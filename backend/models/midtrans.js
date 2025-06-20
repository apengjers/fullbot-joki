// backend/midtrans.js

const midtransClient = require("midtrans-client");
require("dotenv").config();

const core = new midtransClient.CoreApi({
  isProduction: true,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

async function createGopayPayment(orderId, amount) {
  const parameter = {
    payment_type: "gopay",
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    gopay: {
      enable_callback: false,
      callback_url: "",
    },
  };

  try {
    const response = await core.charge(parameter);
    console.log("✅ GoPay QR Response dari Midtrans:");
    console.log(JSON.stringify(response, null, 2));

    return {
      qrUrl: response.actions.find((a) => a.name === "generate-qr-code")?.url,
      deeplinkUrl: response.actions.find((a) => a.name === "deeplink-redirect")?.url,
      total: amount,
    };

  } catch (error) {
    console.error("❌ Gagal membuat GoPay QR di Midtrans:");
    console.error(error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createGopayPayment };
