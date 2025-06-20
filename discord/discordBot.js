// discord/discordBot.js
require("dotenv").config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events } = require("discord.js");
const mongoose = require("mongoose");
const Order = require("../backend/models/Order");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`🤖 Bot Discord login sebagai ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const [action, orderId] = interaction.customId.split("_");
  const order = await Order.findOne({ orderId });
  if (!order) return interaction.reply({ content: "❌ Order tidak ditemukan.", ephemeral: true });

  if (action === "kerjakan") {
    if (order.worker) {
      return interaction.reply({ content: `❌ Order sudah dikerjakan oleh ${order.worker}`, ephemeral: true });
    }

    order.worker = interaction.user.username;
    await order.save();

    try {
      const channel = await client.channels.fetch(order.discordChannelId);
      const msg = await channel.messages.fetch(order.discordMessageId);

      const updatedEmbed = EmbedBuilder.from(msg.embeds[0]).addFields({
        name: "👨‍💻 Dikerjakan oleh",
        value: order.worker,
        inline: true
      });

      await msg.edit({ embeds: [updatedEmbed] });
    } catch (err) {
      console.error("❌ Gagal update pesan Discord:", err);
    }

    return interaction.reply({ content: `🛠️ Order ini sekarang dikerjakan oleh ${order.worker}`, ephemeral: true });
  }

  if (action === "selesai") {
    order.status = "selesai";
    await order.save();

    try {
      const channel = await client.channels.fetch(order.discordChannelId);
      const msg = await channel.messages.fetch(order.discordMessageId);

      const updatedEmbed = EmbedBuilder.from(msg.embeds[0])
        .addFields(
          { name: "Status", value: "✔Selesai", inline: true },
        );

      await msg.edit({ embeds: [updatedEmbed] });
    } catch (err) {
      console.error("❌ Gagal update pesan Discord:", err);
    }

    return interaction.reply({ content: "✅ Order ditandai sebagai selesai.", ephemeral: true });
  }
});

// Fungsi kirim pesan ke Discord
async function sendOrderToDiscord(order) {
  const embed = new EmbedBuilder()
    .setTitle("🟢 Pesanan Baru Dibayar!")
    .addFields(
      { name: "🆔 Order ID", value: `\`${order.orderId}\`` },
      { name: "👤 Username", value: order.username || "-", inline: true },
      { name: "🔐 Password", value: order.password || "-", inline: true },
      { 
        name: "📱 WA", 
        value: order.waNumber 
          ? `[Klik untuk chat](https://wa.me/${order.waNumber.replace("@s.whatsapp.net", "")})` 
          : "-", 
        inline: true 
      },
      { name: "🔢 Jumlah", value: `${order.jumlah}M`, inline: true },
      { name: "💳 Total", value: `Rp${order.totalHarga.toLocaleString()}`, inline: true },
      { name: "📦 Status", value: order.status, inline: true },
    )
    .setColor(0x57f287)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`kerjakan_${order.orderId}`)
      .setLabel("Kerjakan Saya")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`selesai_${order.orderId}`)
      .setLabel("Tandai Selesai")
      .setStyle(ButtonStyle.Success)
  );

  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  const sentMessage = await channel.send({ embeds: [embed], components: [row] });

  // Simpan ID pesan dan channel agar bisa diedit nanti
  order.discordMessageId = sentMessage.id;
  order.discordChannelId = channel.id;
  await order.save();
}

module.exports = { client, sendOrderToDiscord };
