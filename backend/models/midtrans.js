const midtransClient = require("midtrans-client");
require("dotenv").config();

const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Buat transaksi GoPay (QRIS)
 * @param {string} orderId
 * @param {number} amount
 * @returns {{ qr_url: string, total: number }}
 */
async function createGopayQR(orderId, amount) {
  const parameter = {
    payment_type: "gopay",
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    gopay: {
      enable_callback: false,
      callback_url: "", // kosongkan atau isi dengan URL callback-mu
    },
  };

  try {
    const response = await core.charge(parameter);
    console.log("✅ GoPay QR Response dari Midtrans:");
    console.log(JSON.stringify(response, null, 2));

    const qrUrl = response.actions?.find(
      (act) => act.name === "generate-qr-code"
    )?.url;

    if (!qrUrl) throw new Error("QRIS URL tidak ditemukan dari GoPay.");

    return {
      qr_url: qrUrl,
      total: amount,
    };
  } catch (error) {
    console.error("❌ Gagal membuat QRIS GoPay:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createGopayQR };
