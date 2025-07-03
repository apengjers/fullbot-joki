// File: backend/models/tripay.js

const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE;

const createTripayTransaction = async ({
  method = "QRIS",
  orderId,
  amount,
  customerName = "User",
  callbackUrl,
  returnUrl,
}) => {
  const signature = crypto
    .createHmac("sha256", TRIPAY_PRIVATE_KEY)
    .update(TRIPAY_MERCHANT_CODE + orderId + amount)
    .digest("hex");

  const payload = {
    method,
    merchant_ref: orderId,
    amount,
    customer_name: customerName,
    order_items: [
      {
        name: "Jasa Apengjers",
        price: amount,
        quantity: 1,
      },
    ],
    callback_url: callbackUrl,
    return_url: returnUrl,
    expired_time: Math.floor(Date.now() / 1000) + 3600, // 1 jam
    signature,
  };

  const headers = {
    Authorization: `Bearer ${TRIPAY_API_KEY}`,
  };

  try {
    const { data } = await axios.post(
      "https://tripay.co.id/api/transaction/create",
      payload,
      { headers }
    );

    return data;
  } catch (error) {
    console.error("Tripay Error:", error.response?.data || error.message);
    throw new Error("Gagal membuat transaksi Tripay");
  }
};

module.exports = {
  createTripayTransaction,
};
