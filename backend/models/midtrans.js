const midtransClient = require("midtrans-client");
require("dotenv").config();

const axios = require("axios");

const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Buat transaksi GoPay (QRIS)
 * @param {string} orderId
 * @param {number} amount
 * @returns {{ qr_url: string, deeplink_url: string|null, qr_image: Buffer, total: number }}
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
      callback_url: "",
    },
  };

  try {
    const response = await core.charge(parameter);
    console.log("✅ GoPay QR Response dari Midtrans:");
    console.log(JSON.stringify(response, null, 2));

    const qrUrl = response.actions?.find(
      (act) => act.name === "generate-qr-code"
    )?.url;

    const deeplinkUrl = response.actions?.find(
      (act) => act.name === "deeplink-redirect"
    )?.url;

    if (!qrUrl) throw new Error("QRIS URL tidak ditemukan dari GoPay.");

    // Download gambar QR sebagai buffer
    const qrImageResponse = await axios.get(qrUrl, { responseType: "arraybuffer" });
    const qrImageBuffer = Buffer.from(qrImageResponse.data, "binary");

    return {
      qr_url: qrUrl,
      deeplink_url: deeplinkUrl || null,
      qr_image: qrImageBuffer,
      total: amount,
    };
  } catch (error) {
    console.error("❌ Gagal membuat QRIS GoPay:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createGopayQR };
