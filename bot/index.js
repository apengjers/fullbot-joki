const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { handleMessage } = require("./handler");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
require("dotenv").config();

const webhookApp = require("../backend/server"); // WAJIB
const { client: discordClient } = require("../discord/discordBot"); // Tambahan: Import bot Discord

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    browser: ["Ubuntu", "Chrome", "22.04.4"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("📲 Scan QR Code berikut dengan WhatsApp kamu:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("❌ Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startBot();
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    await handleMessage(sock, msg);
  });

  // Inject WA socket ke webhook Midtrans
  webhookApp.setBotSocket(sock);
}

startBot();
discordClient.login(process.env.DISCORD_TOKEN); // 🔥 Tambahan ini WAJIB
