require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Events,
} = require("discord.js");
const mongoose = require("mongoose");
const Order = require("../backend/models/Order");
const { notifyCustomer, notifyPaymentReceived } = require("../bot/notifier"); // ⬅ gunakan destructuring

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`🤖 Bot Discord login sebagai ${client.user.tag}`);
});

function registerBot(sock) {
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    const [action, orderId] = interaction.customId.split("_");

    if (action === "pembayaran") {
      const order = await Order.findOne({ orderId });

      if (!order) {
        return interaction.reply({ content: "❌ Order tidak ditemukan.", ephemeral: true });
      }

      if (["menunggu_pembayaran_manual", "pembayaran_diterima"].includes(order.status)) {
        const wasManual = order.status === "menunggu_pembayaran_manual";

        if (wasManual) {
          order.status = "pembayaran_diterima";
          await order.save();
        }

        try {
          await notifyPaymentReceived(sock, order);
        } catch (err) {
          console.error("❌ Gagal kirim notif WA pembayaran diterima:", err);
        }

        try {
          const channel = await client.channels.fetch(order.discordChannelId);
          const msg = await channel.messages.fetch(order.discordMessageId);
          const embed = EmbedBuilder.from(msg.embeds[0]);

          embed.data.fields.forEach(field => {
            if (field.name === "📦 Status") {
              field.value = "💰 Pembayaran Diterima";
            }
          });

          await msg.edit({ embeds: [embed] });

          return interaction.reply({
            content: `✅ Status order *${order.orderId}* dipastikan: 💰 Pembayaran Diterima. Notifikasi WA dikirim.`,
            ephemeral: true,
          });
        } catch (err) {
          console.error("❌ Gagal update embed:", err);
          return interaction.reply({
            content: "❌ Gagal update embed pesan Discord.",
            ephemeral: true,
          });
        }
      } else {
        return interaction.reply({
          content: `⚠️ Order ini sudah diupdate ke status: *${order.status}*`,
          ephemeral: true,
        });
      }
    }

    if (action === "kerjakan") {
      const order = await Order.findOne({ orderId });
    
      if (!order) {
        return interaction.reply({ content: "❌ Order tidak ditemukan.", ephemeral: true });
      }
    
      if (order.status === "selesai") {
        return interaction.reply({ content: "❌ Order ini sudah selesai sebelumnya.", ephemeral: true });
      }
    
      // Kalau order belum punya worker, kita minta input duit awal dulu
      if (!order.worker) {
        order.worker = interaction.user.username;
    
        await interaction.reply({
          content: "💬 Silakan masukkan *duit awal* atau *point awal* kamu di sini:",
          ephemeral: true,
        });
    
        const msgFilter = m => m.author.id === interaction.user.id;
        try {
          const collected = await interaction.channel.awaitMessages({ filter: msgFilter, max: 1, time: 30000, errors: ['time'] });
          const userInput = collected.first().content;
    
          order.awalDuit = userInput;
          await order.save();
    
          // Update embed dengan worker & duit awal
          const channel = await client.channels.fetch(order.discordChannelId);
          const msg = await channel.messages.fetch(order.discordMessageId);
          const embed = EmbedBuilder.from(msg.embeds[0]);
    
          embed.data.fields.forEach(field => {
            if (field.name === "👨‍💻 Dikerjakan oleh") {
              field.value = order.worker;
            }
          });
    
          // Tambah field baru jika ingin menampilkan duit awal di embed
          embed.addFields({
            name: "💵 Duit Awal", value: order.awalDuit, inline: true
          });
    
          await msg.edit({ embeds: [embed] });
    
          return interaction.followUp({
            content: `✅ Order ini sekarang dikerjakan oleh **${order.worker}** dengan duit awal: \`${order.awalDuit}\`.`,
            ephemeral: true,
          });
    
        } catch (err) {
          return interaction.followUp({
            content: "⏰ Waktu habis. Input tidak diterima. Silakan tekan tombol lagi jika ingin mencoba ulang.",
            ephemeral: true,
          });
        }
      } else if (order.worker !== interaction.user.username) {
        return interaction.reply({
          content: `❌ Order sudah dikerjakan oleh **${order.worker}**.`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `✅ Kamu sudah mengambil order ini sebelumnya sebagai **${order.worker}**.`,
          ephemeral: true,
        });
      }
    }

    if (action === "selesai") {
      const order = await Order.findOne({ orderId });

      if (!order) {
        return interaction.reply({ content: "❌ Order tidak ditemukan.", ephemeral: true });
      }

      if (order.status === "selesai") {
        return interaction.reply({
          content: "❌ Order ini sudah ditandai selesai sebelumnya.",
          ephemeral: true,
        });
      }

      order.status = "selesai";
      await order.save();
      await notifyCustomer(sock, order);

      try {
        const channel = await client.channels.fetch(order.discordChannelId);
        const msg = await channel.messages.fetch(order.discordMessageId);
        const embed = EmbedBuilder.from(msg.embeds[0]);

        embed.data.fields.forEach(field => {
          if (field.name === "📦 Status") {
            field.value = "✔ Selesai";
          }
          if (field.name === "👨‍💻 Dikerjakan oleh") {
            field.value = order.worker || "-";
          }
        });

        await msg.edit({ embeds: [embed] });

        return interaction.reply({
          content: `✅ Order berhasil ditandai sebagai selesai oleh **${order.worker || "unknown"}**.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error("❌ Gagal update pesan Discord:", err);
        return interaction.reply({
          content: "❌ Gagal update pesan Discord.",
          ephemeral: true,
        });
      }

    }
  });
}

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
          ? `[Klik untuk chat](https://wa.me/${order.waNumber.replace("@s.whatsapp.net", "")}?text=${encodeURIComponent(`Halo kak, perkenalkan saya dari team joki Apengjers yang akan memproses orderan kakak dengan order ID ${order.orderId}`)})`
          : "-",
        inline: true,
      },
      {
        name: "🔢 Jumlah",
        value: `${order.jumlah} ${
          order.jenis === "uang"
            ? "M"
            : order.jenis === "minigame"
            ? "MG"
            : order.jenis === "fishing"
            ? "CAIL"
            : "-"
        }`,
        inline: true,
      },
      { name: "💳 Total", value: `Rp${order.totalHarga.toLocaleString()}`, inline: true },
      { name: "📦 Status", value: order.status, inline: true },
      { name: "👨‍💻 Dikerjakan oleh", value: order.worker || "-", inline: true },
      { name: "💵 Duit Awal", value: order.awalDuit || "-", inline: true } // ✅ tambahkan baris ini
    )    
    .setColor(0x57f287)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
    .setCustomId(`pembayaran_${order.orderId}`)
    .setLabel("Pembayaran Diterima")
    .setStyle(ButtonStyle.Secondary),
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
  const sentMessage = await channel.send({
    content: "@everyone",
    embeds: [embed],
    components: [row],
  });

  order.discordMessageId = sentMessage.id;
  order.discordChannelId = channel.id;
  await order.save();
}

module.exports = { client, registerBot, sendOrderToDiscord };
 