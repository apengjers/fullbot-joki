const express = require("express");
const router = express.Router();
const Order = require("../../models/Order");

let sock = null;

function setSock(sockInstance) {
  sock = sockInstance;
}

router.post("/callback", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const data = JSON.parse(req.body.toString());
    const { merchant_ref, status } = data;

    if (status !== "PAID") return res.status(200).send("Ignored");

    const order = await Order.findOne({ orderId: merchant_ref });
    if (!order) return res.status(404).send("Order not found");

    order.status = "sedang_diproses";
    await order.save();

    if (sock && order.waNumber) {
      await sock.sendMessage(order.waNumber, {
        text: `✅ Pembayaran berhasil!\n\n🆔 Order ID: *${order.orderId}*\n📦 Jumlah: *${order.jumlah}${order.jenis === "minigame" ? "P" : "M"}*\n💳 Total: *Rp${order.totalHarga.toLocaleString()}*\n\nPesanan kamu sedang diproses oleh admin. Terima kasih 🙏`,
      });
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Tripay Callback Error:", err);
    return res.status(500).send("Callback error");
  }
});

module.exports = { router, setSock };
