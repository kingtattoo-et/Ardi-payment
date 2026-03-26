const express = require('express');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = "8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw";
const WEBAPP_URL = "https://kingtattoo-et.github.io/Ardi-payment/";

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// --- Telegram Bot ---
bot.start((ctx) => {
  ctx.reply("🎉 Welcome to Bingo Bot!", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Play Bingo 🎲", web_app: { url: WEBAPP_URL } }]
      ]
    }
  });
});

bot.launch();

// --- Web Server (optional fallback) ---
app.get('/', (req, res) => {
  res.send("Bingo Bot is running!");
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
