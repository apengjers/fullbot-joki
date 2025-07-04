const express = require('express');
const crypto = require('crypto');
const Order = require('./models/Order');
const { sendOrderToDiscord } = require('../discord/discordBot');

require('dotenv').config();

const router = express.Router();

router.post('/callback', async (req, res) => {
  const tripayPrivateKey = process.env.TRIPAY_PRIVATE_KEY || 'dummy-key';  // Ganti dummy-key dengan kunci aslimu di .env

  const callbackSignature = req.headers['x-signature'] || '';
  const requestBody = JSON.stringify(req.body);

  const expectedSignature = crypto.createHmac('sha256', tripayPrivateKey)
    .update(requestBody)
    .digest('hex');

  if (callbackSignature !== expectedSignature) {
    console.log('❌ Invalid Signature dari Tripay');
    return res.status(403).json({ success: false, message: 'Invalid Signature' });
  }

  const { reference, status, amount } = req.body;
  console.log('✅ Tripay Callback diterima:', { reference, status, amount });

  try {
    const order = await Order.findOne({ orderId: reference });
    if (!order) {
      console.log("❌ Order tidak ditemukan:", reference);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update status order
    order.status = status === 'PAID' ? 'sedang_diproses' : status.toLowerCase();
    await order.save();

    console.log(`✅ Order ${reference} status diupdate ke ${order.status}`);

    // Notifikasi Discord
    await sendOrderToDiscord(order);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Gagal proses callback:', err.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

module.exports = router;
