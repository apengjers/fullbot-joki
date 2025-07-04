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
  const waId = order.waNumber.endsWith("@s.whatsapp.net")
    ? order.waNumber
    : `${order.waNumber}@s.whatsapp.net`;

  const message = `✅ *Pembayaran untuk Order ${order.orderId} sudah diterima!*\n\nAdmin akan segera memproses pesananmu ya, mohon ditunggu. Terima kasih 🙏`;
  try {
    await sock.sendMessage(waId, { text: message });
    console.log(`✅ Notifikasi Pembayaran diterima dikirim ke ${waId}`);
  } catch (e) {
    console.error("❌ Gagal kirim notifikasi pembayaran diterima:", e);
  }
}

module.exports = {
  notifyCustomer,
  notifyPaymentReceived,
};
