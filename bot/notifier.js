// bot/notifier.js

async function notifyCustomer(sock, order) {
  try {
    await sock.sendMessage(order.waNumber, {
      text: `✅ *Order ${order.orderId} sudah selesai!*\n\nTerima kasih sudah menggunakan layanan kami.`,
    });
    console.log(`✅ Notifikasi WA terkirim ke ${order.waNumber}`);
  } catch (e) {
    console.error("❌ Gagal kirim notifikasi WA:", e);
  }
}

async function notifyPaymentReceived(sock, order) {
  try {
    await sock.sendMessage(order.waNumber, {
      text: `✅ *Pembayaran untuk Order ${order.orderId} sudah diterima!*\n\nAdmin akan segera memproses pesananmu ya, mohon ditunggu. Terima kasih 🙏`,
    });
    console.log(`✅ Notifikasi Pembayaran diterima dikirim ke ${order.waNumber}`);
  } catch (e) {
    console.error("❌ Gagal kirim notifikasi pembayaran diterima:", e);
  }
}

module.exports = { notifyCustomer, notifyPaymentReceived };
