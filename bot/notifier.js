async function notifyCustomer(sock, order) {
  const waId = order.waNumber.endsWith("@s.whatsapp.net")
    ? order.waNumber
    : `${order.waNumber}@s.whatsapp.net`;

  const message = `✅ *Order ${order.orderId} sudah selesai!*\n\nTerima kasih sudah menggunakan layanan kami.`;
  try {
    await sock.sendMessage(waId, { text: message });
    console.log(`✅ Notifikasi WA terkirim ke ${waId}`);
  } catch (e) {
    console.error("❌ Gagal kirim notifikasi WA:", e);
  }
}

function formatEstimasi(menit) {
  const hari = Math.floor(menit / 1440); // 1 hari = 1440 menit
  const sisaSetelahHari = menit % 1440;

  const jam = Math.floor(sisaSetelahHari / 60);
  const sisaMenit = sisaSetelahHari % 60;

  const parts = [];
  if (hari > 0) parts.push(`${hari} Hari`);
  if (jam > 0) parts.push(`${jam} Jam`);
  if (sisaMenit > 0) parts.push(`${sisaMenit} Menit`);

  return parts.join(" ");
}


async function notifyPaymentReceived(sock, order) {
  try {
    const waId = order.waNumber.endsWith("@s.whatsapp.net")
      ? order.waNumber
      : `${order.waNumber}@s.whatsapp.net`;

    // Hitung estimasi proses dan selesai
    const nominal = order.jumlah;
    const estimasiProses = Math.ceil((nominal + nominal * 0.10) * 20); // 1M = 20 menit
    const estimasiSelesai = new Date(Date.now() + estimasiProses * 60000)
      .toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });


    const message = `✅ *Pembayaran untuk Order ${order.orderId} sudah diterima!*\n\n` +
      `Halo kak, joki sudah mulai diproses ya kak 🙏\n` +
      `📦 Jumlah: *${order.jumlah}${order.jenis === "minigame" ? "P" : "M"}*\n` +
      `💳 Total: *Rp${order.totalHarga.toLocaleString()}*\n\n` +
      `🧭 Estimasi proses: *${formatEstimasi(estimasiProses)}*\n` +
      `🚗 Estimasi selesai: *${estimasiSelesai}*\n\n` +
      `Selama proses berlangsung *mohon jangan ditabrak/dimainkan dulu akunnya* agar tidak mengganggu proses 🙏\n\n` +
      `*Estimasi tersebut sudah termasuk bonus uangnya juga ya kak 💸*\n\n` +
      `Mohon ditunggu dan *terima kasih atas kepercayaannya* 😊`;

    console.log("📤 Kirim WA ke:", waId);
    console.log("📨 Pesan:", message);

    await sock.sendMessage(waId, { text: message });

    console.log(`✅ WA terkirim ke ${waId}`);
  } catch (e) {
    console.error("❌ Gagal kirim notifikasi pembayaran:", e);
  }
}


module.exports = {
  notifyCustomer,
  notifyPaymentReceived,
};
