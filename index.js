const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

const ADMIN_ID = 1046142540; // ያንተ ID
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

let players = {}; 

bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!players[userId]) players[userId] = { balance: 0, name: ctx.from.first_name };

    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts!*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
            [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('📖 Instructions', 'instructions')],
            [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('🏆 Leaderboard', 'leaderboard')]
        ])
    });
});

bot.action('deposit', (ctx) => {
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min: 50 ETB*\n\nማስገባት የሚፈልጉትን መጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        players[userId].lastAmount = parseInt(msgText);
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*`, 
            Markup.inlineKeyboard([[Markup.button.webApp('💳 Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }
});

bot.on('web_app_data', async (ctx) => {
    const userId = ctx.from.id;
    const data = JSON.parse(ctx.webAppData.data.json());
    const amount = players[userId]?.lastAmount || 100;

    await ctx.reply('መረጃው ለአድሚን ተልኳል።');

    return bot.telegram.sendMessage(ADMIN_ID, 
        `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n💰 መጠን: *${amount} ETB*\n🏦 ባንክ: *${data.bank}*\n\n📝 *SMS:* \`${data.message}\``, 
        Markup.inlineKeyboard([
            [Markup.button.callback(`✅ Approve ${amount} ETB`, `approve_${userId}_${amount}`)],
            [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
        ])
    );
});

bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);
    if (!players[targetId]) players[targetId] = { balance: 0 };
    players[targetId].balance += amount;
    
    await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጦ *${amount} ETB* ተጨምሯል!`);
    return ctx.editMessageText(`✅ ለ ID ${targetId} *${amount} ETB* አጽድቀሃል።`);
});

bot.launch().then(() => console.log("🚀 Bot is Running!"));
