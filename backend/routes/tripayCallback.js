// File: backend/routes/tripayCallback.js

const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Order = require("../models/Order");
const { sendMessageWA } = require("../utils/waSender"); // Pastikan fungsi ini ada di utils

// Raw body middleware hanya untuk callback ini
router.post("/callback", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-callback-signature"];
    const rawBody = req.body;
    const bodyString = rawBody.toString();
    const jsonBody = JSON.parse(bodyString);

    const expectedSignature = crypto
      .createHmac("sha256", process.env.TRIPAY_PRIVATE_KEY)
      .update(bodyString)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("❌ Invalid signature from Tripay");
      return res.status(403).json({ success: false, message: "Invalid signature" });
    }

    const { merchant_ref, status, reference } = jsonBody;
    if (!merchant_ref || !status) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const order = await Order.findOne({ orderId: merchant_ref });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (status === "PAID" && order.status !== "lunas") {
      order.status = "lunas";
      order.paidAt = new Date();
      order.tripayRef = reference;
      await order.save();

      if (order.waNumber) {
        const message = `✅ *Pembayaran Berhasil!*

🆔 Order ID: *${order.orderId}*
💰 Total: *Rp${order.totalHarga.toLocaleString()}*

Pesanan kamu akan segera dikerjakan oleh tim joki. Tunggu info selanjutnya ya!`;
        await sendMessageWA(order.waNumber, message);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Callback error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
