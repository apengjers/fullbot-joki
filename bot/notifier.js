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

async function notifyPaymentReceived(sock, order) {
  try {
    const waId = order.waNumber.endsWith("@s.whatsapp.net")
      ? order.waNumber
      : `${order.waNumber}@s.whatsapp.net`;

    // Format waktu estimasi selesai
    const estimasiSelesaiFormatted = new Date(order.estimasiSelesai).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
    });

    const message = `✅ *Pembayaran untuk Order ${order.orderId} sudah diterima!*\n\n` +
      `📦 Jumlah: *${order.jumlah}${order.jenis === "minigame" ? "P" : "M"}*\n` +
      `💳 Total: *Rp${order.totalHarga.toLocaleString()}*\n\n` +
      `Estimasi Proses: *${order.estimasiProses} menit*\n` +
      `Halo kak, joki sudah mulai diproses ya kak 🙏
Estimasi selesai: *${order.estimasiSelesaiFormatted}*
Selama proses berlangsung mohon jangan ditabrak/dimainkan dulu akunnya agar tidak mengganggu proses 🙏
Estimasi tersebut sudah termasuk bonus uangnya juga ya kak 💸
Mohon ditunggu dan terima kasih atas kepercayaannya 😊` +
      
      `Terima kasih sudah menggunakan layanan kami.`;

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
