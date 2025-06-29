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

module.exports = notifyCustomer;
