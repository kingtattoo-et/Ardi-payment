const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ዳታቤዝ ፋይል ---
const DB_FILE = './database.json';
let players = {};

if (fs.existsSync(DB_FILE)) {
    try { players = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { players = {}; }
}

function saveToDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(players, null, 4));
}

const ADMIN_ID = 1046142540; //
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!players[userId]) {
        players[userId] = { balance: 0, name: ctx.from.first_name };
        saveToDB();
    }
    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎉 *Welcome To Ardi Bingo!* 🎉\n\nባላንስ: *${players[userId].balance} ETB*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
            [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('✉️ Invite', 'invite')]
        ])
    });
});

bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min: 50 ETB*\n\nመጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    // ተጠቃሚው መጠን ካስገባ
    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        players[userId].lastAmount = parseInt(msgText);
        saveToDB();
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*`, 
            Markup.inlineKeyboard([[Markup.button.webApp('💳 Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }

    // ከዌብ አፕ የሚመጣ ዳታ እዚህ ጋር ነው የሚመጣው
    if (ctx.message.web_app_data) {
        const data = JSON.parse(ctx.message.web_app_data.data);
        const amount = players[userId]?.lastAmount || 50;

        await ctx.reply('መረጃው ለአድሚን ተልኳል!');

        return bot.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n💰 መጠን: *${amount} ETB*\n🏦 ባንክ: *${data.bank}*\n\n📝 *SMS:* \`${data.message}\``,
            Markup.inlineKeyboard([
                [Markup.button.callback(`✅ Approve ${amount} ETB`, `approve_${userId}_${amount}`)],
                [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
            ])
        );
    }
});

bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);
    if (!players[targetId]) players[targetId] = { balance: 0 };
    players[targetId].balance += amount;
    saveToDB();
    await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጦ *${amount} ETB* ተጨምሯል!`);
    return ctx.editMessageText(`✅ ለ ID ${targetId} *${amount} ETB* አጽድቀሃል።`);
});

bot.launch().then(() => console.log("🚀 Bot is LIVE!"));
