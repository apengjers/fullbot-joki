const Order = require("../backend/models/Order");
const { setSession, getSession, clearSession } = require("../backend/models/sessions");
const { createGopayPayment } = require("../backend/models/midtrans");

const cooldownMap = new Map();
const hargaNormal = 1000;
const hargaDiskon = 750;
const hargaNormalMG = 100;
const hargaDiskonMG = 80;

const menuUtama = `👋 *Selamat datang di layanan Joki CDID!*

Silakan pilih menu:
1️⃣ Joki CDID
2️⃣ Cek Pesanan
3️⃣ Hitung Estimasi
4️⃣ Hubungi Admin

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

const listjokiMG = `📊 *Pilih jumlah Point Minigame yang ingin dijoki:*
• 50
• 100
• 250
• 500
• 1000
• Custom Kelipatan 10 dan minimal 50 (contoh: 30p atau 30)

_Ketik jumlah yang diinginkan._
(Ketik 0 untuk kembali ke menu utama)
`;

const pilihJoki = `🚗Menu Joki CDID🚗

1️⃣ Joki UANG CDID💸
2️⃣ Joki Point Minigame CDID✨
      
Ketik angka pilihanmu.
Ketik 0 untuk kembali ke menu utama.`;

function generateOrderId() {
  return "ORD" + Date.now();
}

async function handleMessage(sock, msg) {
  const sender = msg.key.remoteJid;
  const text = msg.message?.conversation?.trim().toLowerCase() ||
               msg.message?.extendedTextMessage?.text?.trim().toLowerCase() || "";
  if (!text) return;

  // Anti-spam delay
  const now = Date.now();
  const last = cooldownMap.get(sender) || 0;
  if (now - last < 100) return;
  cooldownMap.set(sender, now);

  // Menu kembali
  if (text === "0") {
    clearSession(sender);
    await sock.sendMessage(sender, { text: menuUtama });
    return;
  }

  const session = getSession(sender);

  // STATE: AWAITING_PASSWORD
  if (session?.state === "awaiting_password") {
    const order = await Order.findOne({ orderId: session.orderId });
    if (!order) {
      clearSession(sender);
      return await sock.sendMessage(sender, { text: "❌ Order tidak ditemukan. Ketik 1 untuk mulai ulang." });
    }

    order.password = text;
    const kodeUnik = Math.floor(Math.random() * 100) + 1;
    const hargaPerM = order.jumlah >= 100 ? hargaDiskon : hargaNormal;
    const total = order.jumlah * hargaPerM + kodeUnik;

    try {
      const result = await createGopayPayment(order.orderId, total);

      order.status = "menunggu_pembayaran";
      order.totalHarga = total;
      order.kodeUnik = kodeUnik;
      order.snapUrl = result.snapUrl;
      await order.save();

      clearSession(sender);

      return await sock.sendMessage(sender, {
        text: `✅ *Password diterima!*

🆔 Order ID: *${order.orderId}*
💳 Total bayar: *Rp${total.toLocaleString()}*
🧭 Batas waktu pembayaran: *15 menit*

📱 Klik link berikut untuk bayar lewat Qris:
${result.snapUrl}#/gopay-qris

📌 Setelah bayar, admin akan segera menghubungi anda

(Ketik 0 untuk kembali ke menu)`
      });

    } catch (error) {
      console.error("❌ Error saat membuat pembayaran Snap:", error);
      return await sock.sendMessage(sender, {
        text: `❌ Terjadi kesalahan saat membuat pembayaran.\nSilakan coba lagi.\n\nError: ${error.message || error}`
      });
    }
  }

  // STATE: AWAITING_PASSWORD_MG
  if (session?.state === "awaiting_passwordmg") {
    const order = await Order.findOne({ orderId: session.orderId });
    if (!order) {
      clearSession(sender);
      return await sock.sendMessage(sender, { text: "❌ Order tidak ditemukan. Ketik 1 untuk mulai ulang." });
    }

    order.password = text;
    const kodeUnik = Math.floor(Math.random() * 100) + 1;
    const hargaPerPoin = order.jumlah >= 1000 ? hargaDiskonMG : hargaNormalMG;
    const total = order.jumlah * hargaPerPoin + kodeUnik;

    try {
      const result = await createGopayPayment(order.orderId, total);

      order.status = "menunggu_pembayaran";
      order.totalHarga = total;
      order.kodeUnik = kodeUnik;
      order.snapUrl = result.snapUrl;
      await order.save();

      clearSession(sender);

      return await sock.sendMessage(sender, {
        text: `✅ *Password diterima!*

🆔 Order ID: *${order.orderId}*
💳 Total bayar: *Rp${total.toLocaleString()}*
🧭 Batas waktu pembayaran: *15 menit*

📱 Klik link berikut untuk bayar lewat Qris:
${result.snapUrl}#/gopay-qris

📌 Setelah bayar, admin akan segera menghubungi anda

(Ketik 0 untuk kembali ke menu)`
      });

    } catch (error) {
      console.error("❌ Error saat membuat pembayaran Snap:", error);
      return await sock.sendMessage(sender, {
        text: `❌ Terjadi kesalahan saat membuat pembayaran.\nSilakan coba lagi.\n\nError: ${error.message || error}`
      });
    }
  }

  // ==============================
  // STATE: AWAITING_USERNAME
  // ==============================
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
⚠️ *Pastikan 2FA nonaktif ya agar mempermudah proses login!*
Jika aktif, admin akan segera menghubungi anda saat order diproses

_Ketik 0 untuk batal dan kembali ke menu_`,
    });
  }

  // ==============================
  // STATE: AWAITING_USERNAME_MG
  // ==============================
  if (session?.state === "awaiting_usernamemg") {
    const order = await Order.findOne({ orderId: session.orderId });
    if (!order) {
      clearSession(sender);
      return await sock.sendMessage(sender, { text: "❌ Order tidak ditemukan. Ketik 1 untuk mulai ulang." });
    }

    order.username = text;
    order.status = "menunggu_password";
    await order.save();

    setSession(sender, { state: "awaiting_passwordmg", orderId: order.orderId });

    return await sock.sendMessage(sender, {
      text: `✅ *Username diterima.*

Sekarang kirimkan *password akun CDID*-mu.
⚠️ *Pastikan 2FA nonaktif ya agar mempermudah proses login!*
Jika aktif, admin akan segera menghubungi anda saat order diproses

_Ketik 0 untuk batal dan kembali ke menu_`,
    });
  }

  // ==============================
  // STATE: AWAITING_JUMLAH
  // ==============================
  if (session?.state === "awaiting_jumlah") {
    const jumlah = parseInt(text.replace("m", ""));
    if (!isNaN(jumlah)) {
      if (jumlah <= 0) {
        return await sock.sendMessage(sender, { text: `❌ Minimal order 1M. 
Masukkan kembali nominal yang sesuai.

_Ketik 0 untuk kembali ke menu._` });
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
        jenis: "uang",
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
    } else {
      return await sock.sendMessage(sender, { text: "❌ Format jumlah tidak dikenali. Contoh: 10 atau 10M" });
    }
  }

  // ==============================
  // STATE: AWAITING_JUMLAHMG
  // ==============================
  if (session?.state === "awaiting_jumlahmg") {
    const jumlah = parseInt(text.replace("p", ""));
    if (!isNaN(jumlah)) {
      if (jumlah < 50) {
        return await sock.sendMessage(sender, { text: `❌ Minimal order 50 poin.
Masukkan kembali nominal yang sesuai.
          
_Ketik 0 untuk kembali ke menu._` });
      } else if (jumlah % 10 !== 0) {
        return await sock.sendMessage(sender, { text: `❌ Jumlah poin harus kelipatan 10.
Masukkan kembali nominal yang sesuai.
          
_Ketik 0 untuk kembali ke menu._` });
      }

      const hargaPerPoin = jumlah >= 1000 ? hargaDiskonMG : hargaNormalMG;
      const total = jumlah * hargaPerPoin;
      const orderId = generateOrderId();

      const newOrder = new Order({
        orderId,
        waNumber: sender,
        jumlah,
        totalHarga: total,
        status: "menunggu_username",
        jenis: "minigame",
      });

      await newOrder.save();
      setSession(sender, { state: "awaiting_usernamemg", orderId });

      return await sock.sendMessage(sender, {
        text: `✅ *Order ${jumlah} poin Minigame dibuat!*
💵 Harga per poin: Rp${hargaPerPoin.toLocaleString()}
💰 Total: Rp${total.toLocaleString()}

Sekarang kirimkan *username akun CDID*-mu.
_Ketik 0 untuk batal dan kembali ke menu_`,
      });
    } else {
      return await sock.sendMessage(sender, { text: "❌ Format jumlah tidak dikenali. Contoh: 100 atau 100p" });
    }
  }

  // ==============================
  // STATE: AWAITING_JOKI
  // ==============================
  if (session?.state === "awaiting_joki") {
    switch (parseInt(text)) {
      case 1:
        setSession(sender, { state: "awaiting_jumlah" });
        await sock.sendMessage(sender, { text: listJoki });
        return;
        break;
      case 2:
        setSession(sender, { state: "awaiting_jumlahmg" });
        await sock.sendMessage(sender, { text: listjokiMG });
        return;
        break;
      default:
        await sock.sendMessage(sender, { text: "❌ Pilihan tidak dikenali. Ketik 0 untuk kembali ke menu utama." });
    }
  }

  // STATE HITUNG_ESTIMASI
  if (session?.state === "hitung_estimasi") {
    const nominal = parseInt(text);
    if (!isNaN(nominal)) {
      const estimasi = (nominal + (nominal * 0.10)) / 3; // hasil estimasi dalam menit (float)

      function formatEstimasi(menit) {
        const j = Math.floor(menit / 60);
        const m = Math.round(menit % 60);
        return `${j > 0 ? j + " Jam" : ""}${j > 0 && m > 0 ? " " : ""}${m > 0 ? m + " Menit" : ""}`;
      }

      return await sock.sendMessage(sender, {
        text: `🧭 Estimasi proses: ${formatEstimasi(estimasi)}\n` +
              `🚗 Estimasi selesai: ${new Date(Date.now() + estimasi * 60000).toLocaleString()}\n` +
              `📌 *Catatan: Estimasi jika ada gamepass +50% Job bisa lebih cepat*\n\n` +
              `_Ketik 1 untuk langsung order._\n` +
              `_Ketik 0 untuk kembali ke menu._`
      });
    } else {
      return await sock.sendMessage(sender, {
        text: "❌ Format jumlah tidak dikenali. Contoh: 1000"
      });
    }
  }

// Tambahan handler agar bisa lanjut ke state berikutnya
if (text === "1" && session?.state === "hitung_estimasi") {
  setSession(sender, { state: "awaiting_jumlah" });
  return await sock.sendMessage(sender, {
    text: listJoki
  });
}



  // ==============================
  // MENU UTAMA (HANYA JIKA TIDAK DALAM SESI)
  // ==============================
  if (!session) {
    if (text === "1" || text.includes("joki")) {
      setSession(sender, { state: "awaiting_joki" });
      await sock.sendMessage(sender, { text: pilihJoki });
      return;
    }

    if (text === "2" || text.includes("cek")) {
      const orders = await Order.find({ waNumber: sender }).sort({ _id: -1 });
      if (orders.length === 0) {
        return await sock.sendMessage(sender, { text: "❌ Kamu belum pernah memesan joki." });
      }

      const totalHarga = orders
        .filter(o => o.status === "selesai")
        .reduce((acc, o) => acc + o.totalHarga, 0);

      const totalCashback = (totalHarga * 0.01) / 1000;

      let msgText = `*📦 Riwayat Pesanan Kamu:*\n` +
                    `*💵 Total Pesanan selesai: Rp. ${totalHarga.toLocaleString()}*\n` +
                    `*⚠️ Pesanan selain berstatus selesai akan hilang dalam 20 menit*\n` +
                    `*🤑 Estimasi Cashback : ${totalCashback.toFixed(2)}M*\n\n`;
      
      for (const o of orders) {
        const satuan = o.jenis === "minigame" ? "P" : (o.jenis || "uang") === "uang" ? "M" : "M";
        msgText += `🆔 *${o.orderId}*\n👤 Username: ${o.username || "-"}\n💰 ${o.jumlah}${satuan} | Rp${o.totalHarga?.toLocaleString() || 0}\n📌 Status: *${o.status}*\n\n`;
      }

      msgText += `Chat admin untuk klaim cashback pada tanggal 01 setiap bulannya
_Ketik 0 untuk kembali ke menu utama._`;

      return await sock.sendMessage(sender, { text: msgText });
    }

    if (text === "3" || text.includes("etimasi")) {
      setSession(sender, { state: "hitung_estimasi" });
      return await sock.sendMessage(sender, { 
        text: `Masukkan nominal uang yang ingin dihitung estimasi prosesnya`
       });

    }
    if (text === "4" || text.includes("admin")) {
      return await sock.sendMessage(sender, {
        text: "📞 Hubungi admin via WhatsApp:\nhttps://wa.me/6282113780480\n📱 Discord:\nhttps://discord.gg/A98JsvGZ"
      });
    }
  }

  // 🚫 Input tidak dikenali
  return await sock.sendMessage(sender, { text: menuUtama });
}

module.exports = { handleMessage };