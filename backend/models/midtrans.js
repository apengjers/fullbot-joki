const midtransClient = require("midtrans-client");
require("dotenv").config();

const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Buat transaksi VA BCA
 * @param {string} orderId
 * @param {number} amount
 * @returns {{ va_number: string, bank: string, total: number }}
 */
async function createBcaVA(orderId, amount) {
  const parameter = {
    payment_type: "bank_transfer",
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    bank_transfer: {
      bank: "bca",
    },
    customer_details: {
      first_name: "Customer",
    },
  };

  try {
    const response = await core.charge(parameter);
    console.log("✅ VA Response dari Midtrans:");
    console.log(JSON.stringify(response, null, 2));

    const va = response.va_numbers?.[0];

    if (!va) throw new Error("VA number tidak ditemukan.");

    return {
      va_number: va.va_number,
      bank: va.bank,
      total: amount,
    };
  } catch (error) {
    console.error("❌ Gagal membuat VA:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createBcaVA };
