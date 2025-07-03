const express = require("express");
const app = express();
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();

const axios = require("axios");
const Order = require("./models/Order");
const { sendOrderToDiscord } = require("../discord/discordBot");
const { router: tripayCallback, setSock } = require("../routes/tripayCallback");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

let sockGlobal = null;

setSock({
  sendMessage: async (jid, msg) => {
    if (sockGlobal) {
      return await sockGlobal.sendMessage(jid, msg);
    } else {
      console.warn("❌ WhatsApp bot belum siap");
    }
  }
});

setInterval(async () => {
  const batasWaktu = new Date(Date.now() - 20 * 60 * 1000);
  const expiredStatuses = ["menunggu_pembayaran", "menunggu_password", "menunggu_username"];

  const expiredOrders = await Order.find({
    status: { $in: expiredStatuses },
    updatedAt: { $lt: batasWaktu },
  });

  if (expiredOrders.length > 0) {
    console.log(`🗑️ Menghapus ${expiredOrders.length} order kadaluarsa...`);
    for (const ord of expiredOrders) {
      console.log(`- Hapus Order ID: ${ord.orderId} | Status: ${ord.status}`);
    }

    await Order.deleteMany({
      status: { $in: expiredStatuses },
      updatedAt: { $lt: batasWaktu },
    });
  }
}, 60 * 1000);

app.post("/midtrans-webhook", async (req, res) => {
  const data = req.body;
  console.log("📩 Webhook diterima:", JSON.stringify(data, null, 2));

  const { order_id, transaction_status, gross_amount, signature_key, status_code } = data;

  const expectedSignature = crypto
    .createHash("sha512")
    .update(order_id + status_code + gross_amount + process.env.MIDTRANS_SERVER_KEY)
    .digest("hex");

  if (expectedSignature !== signature_key) {
    console.log("❌ Signature tidak valid.");
    return res.status(403).send("Invalid signature");
  }

  const order = await Order.findOne({ orderId: order_id });
  if (!order) {
    console.log("❌ Order tidak ditemukan:", order_id);
    return res.status(404).send("Order not found");
  }

  if (["settlement", "capture"].includes(transaction_status)) {
    order.status = "sedang_diproses";
    await order.save();

    console.log(`✅ Order ${order_id} sudah dibayar. Status diperbarui.`);

    if (sockGlobal) {
      try {
        await sockGlobal.sendMessage(order.waNumber, {
          text: `✅ Pembayaran berhasil!\n\n🆔 Order ID: *${order.orderId}*\n📦 Jumlah: *${order.jumlah}${order.jenis === "minigame" ? "P" : "M"}*\n💳 Total: *Rp${order.totalHarga.toLocaleString()}*\n\nPesanan kamu sedang diproses oleh admin. Terima kasih 🙏`,
        });
      } catch (err) {
        console.error("❌ Gagal mengirim WhatsApp:", err);
      }
    }

    try {
      await sendOrderToDiscord(order);
      console.log("✅ Notifikasi Bot Discord terkirim.");
    } catch (err) {
      console.error("❌ Gagal kirim Bot Discord:", err.message);
    }

    return res.status(200).send("OK");
  }

  res.status(200).send("Ignored (Not settlement)");
});

app.setBotSocket = function (sock) {
  sockGlobal = sock;
};

app.get("/", (req, res) => res.send("Webhook aktif 🚀"));

app.get("/api/orders", async (req, res) => {
  const { start, end, notes } = req.query;
  const query = {};
  if (start && end) {
    query.createdAt = {
      $gte: new Date(start),
      $lte: new Date(end),
    };
  }

  if (notes) {
    query.notes = { $regex: notes, $options: "i" };
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });
  res.json(orders);
});

app.put("/api/orders/:id/complete", async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { status: "selesai" });
    res.sendStatus(200);
  } catch {
    res.status(500).json({ message: "Gagal update status" });
  }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(notes && { notes }) },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).send("Gagal update");
  }
});

app.get("/thanks", (req, res) => {
  res.redirect("/thanks.html" + req.url.slice(7));
});

app.use("/tripay", tripayCallback);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Webhook server listening on port ${PORT}`);
});

module.exports = app;
