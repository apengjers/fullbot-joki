// backend/models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: String,
  waNumber: String,
  username: String,
  password: String,
  jumlah: Number,
  totalHarga: Number,
  status: String,
  qrUrl: String,
  deeplinkUrl: String,
  kodeUnik: Number,
  notes: String,
  worker: { type: String, default: "" },
  discordMessageId: String,
  discordChannelId: String,
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true // ✅ wajib biar bisa pakai .sort({ createdAt: -1 })
});

module.exports = mongoose.model("Order", orderSchema);
