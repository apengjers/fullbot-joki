const Order = require("../backend/models/Order");
const { setSession, getSession, clearSession } = require("../backend/models/sessions");
const { createGopayPayment } = require("../backend/models/midtrans");
const { getQrisScreenshot } = require("../backend/utils/snapQrExtractor");

const cooldownMap = new Map();
const hargaNormal = 1000;
const hargaDiskon = 750;

const menuUtama = `👋 *Selamat datang di layanan Joki CDID!*

Silakan pilih menu:
1️⃣ Joki CDID
2️⃣ Cek Pesanan
3️⃣ Hubungi Admin

*Ketik angka pilihanmu.* (Ketik 0 kapan saja untuk kembali ke menu utama)
`;

const listJoki = `📊 *Pilih jumlah CDID yang ingin dijoki:*
• 1M
• 5M
• 10M
• 20M
• 50M
• 100M
• Custom (contoh: 29M atau 29)

_Ketik jumlah yang diinginkan._
(Ketik 0 untuk kembali ke menu utama)
`;

function generateOrderId() {
  return "ORD" + Date.now();
}

async function handleMessage(sock, msg) {
  const sender = msg.key.remoteJid;
  const text = msg.message?.conversation?.trim().toLowerCase() ||
               msg.message?.extendedTextMessage?.text?.trim().toLowerCase() || "";
  if (!text) return;

  // ✅ Anti-spam delay
  const now = Date.now();
  const last = cooldownMap.get(sender) || 0;
  if (now - last < 1500) return;
  cooldownMap.set(sender, now);

  // 🔁 Menu kembali
  if (text === "0") {
    clearSession(sender);
    return await sock.sendMessage(sender, { text: menuUtama });
  }

  const session = getSession(sender);

  // 🔐 PASSWORD
  if (session?.state === "awaiting_password") {
    const order = await Order.findOne({ orderId: session.orderId });
    if (!order) {
      clearSession(sender);
      return await sock.sendMessage(sender, { text: "❌ Order tidak ditemukan. Ketik 1 untuk mulai ulang." });
    }

    order.password = text;
    const kodeUnik = Math.floor(Math.random() * 100) + 1;
    const total = order.jumlah * (order.jumlah >= 100 ? hargaDiskon : hargaNormal) + kodeUnik;

    try {
      const result = await createGopayPayment(order.orderId, total);

      order.status = "menunggu_pembayaran";
      order.totalHarga = total;
      order.kodeUnik = kodeUnik;
      order.snapUrl = result.snapUrl;
      await order.save();

      clearSession(sender);

      try {
        const qrBuffer = await getQrisScreenshot(result.snapUrl);

        await sock.sendMessage(sender, {
          image: qrBuffer,
          caption: `✅ *Password diterima!*

🆔 Order ID: *${order.orderId}*
💳 Total bayar: *Rp${total.toLocaleString()}*

📱 Klik untuk bayar langsung lewat GoPay:
${result.snapUrl}

📸 Atau scan QRIS di atas lewat aplikasi e-wallet.

📌 Setelah bayar, hubungi admin: wa.me/6289526223009

(Ketik 0 untuk kembali ke menu)`
        });
      } catch (qrError) {
        console.error("❌ Gagal ambil QR dari Snap:", qrError);
        await sock.sendMessage(sender, {
          text: `✅ *Password diterima!*

🆔 Order ID: *${order.orderId}*
💳 Total bayar: *Rp${total.toLocaleString()}*

📱 Klik link berikut untuk bayar lewat GoPay:
${result.snapUrl}

📌 Setelah bayar, hubungi admin: wa.me/6289526223009

(Ketik 0 untuk kembali ke menu)`
        });
      }

    } catch (error) {
      console.error("❌ Error saat membuat pembayaran Snap:", error);
      return await sock.sendMessage(sender, {
        text: `❌ Terjadi kesalahan saat membuat pembayaran.\nSilakan coba lagi.\n\nError: ${error.message || error}`
      });
    }
  }

  // 👤 USERNAME
  if (session?.state === "awaiting_username") {
    const order = await Order.findOne({ orderId: session.orderId });
    if (!order) {
      clearSession(sender);
      return await sock.sendMessage(sender, { text: "❌ Order tidak ditemukan. Ketik 1 untuk mulai ulang." });
    }

    order.username = text;
    order.status = "menunggu_password";
    await order.save();

    setSession(sender, { state: "awaiting_password", orderId: order.orderId });

    return await sock.sendMessage(sender, {
      text: `✅ *Username diterima.*

Sekarang kirimkan *password akun CDID*-mu.
⚠️ *Pastikan 2FA nonaktif ya!*
_Ketik 0 untuk batal dan kembali ke menu_`,
    });
  }

  // ✅ MENU UTAMA
  if (text === "1") {
    return await sock.sendMessage(sender, { text: listJoki });
  }

  if (text === "2" || text.includes("cek")) {
    const orders = await Order.find({ waNumber: sender }).sort({ _id: -1 });
    if (orders.length === 0) {
      return await sock.sendMessage(sender, { text: "❌ Kamu belum pernah memesan joki." });
    }

    let msgText = "*📦 Riwayat Pesanan Kamu:*\n\n";
    for (const o of orders) {
      msgText += `🆔 *${o.orderId}*\n👤 Username: ${o.username || "-"}\n💰 ${o.jumlah}M | Rp${o.totalHarga?.toLocaleString() || 0}\n📌 Status: *${o.status}*\n\n`;
    }

    return await sock.sendMessage(sender, { text: msgText });
  }

  if (text === "3" || text.includes("admin")) {
    return await sock.sendMessage(sender, {
      text: "📞 Hubungi admin via WhatsApp:\nhttps://wa.me/6289526223009"
    });
  }

  // 🔢 JUMLAH CDID
  const jumlah = parseInt(text.replace("m", ""));
  if (!isNaN(jumlah)) {
    if (jumlah <= 0) {
      return await sock.sendMessage(sender, { text: "❌ Minimal order 1M. Ketik 0 untuk kembali ke menu." });
    }

    const hargaPerM = jumlah >= 100 ? hargaDiskon : hargaNormal;
    const total = jumlah * hargaPerM;
    const orderId = generateOrderId();

    const newOrder = new Order({
      orderId,
      waNumber: sender,
      jumlah,
      totalHarga: total,
      status: "menunggu_username",
    });

    await newOrder.save();
    setSession(sender, { state: "awaiting_username", orderId });

    return await sock.sendMessage(sender, {
      text: `✅ *Order ${jumlah}M dibuat!*
💵 Harga per M: Rp${hargaPerM.toLocaleString()}
💰 Total: Rp${total.toLocaleString()}

Sekarang kirimkan *username akun CDID*-mu.
_Ketik 0 untuk batal dan kembali ke menu_`,
    });
  }

  // 🚫 Salah input
  return await sock.sendMessage(sender, { text: menuUtama });
}

module.exports = { handleMessage };
