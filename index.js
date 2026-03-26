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

const ADMIN_ID = 1046142540; 
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
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')]
        ])
    });
});

bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min: 50 ETB*\n\nእባክዎ መጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        players[userId].lastAmount = parseInt(msgText);
        saveToDB();
        
        // ዋናው መፍትሄ እዚህ ጋር ነው፡ ታችኛው ኪቦርድ ላይ ትልቅ ቁልፍ እንልካለን
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*\n\nከታች ያለውን **"💳 Open Payment Screen"** የሚለውን ትልቅ ቁልፍ ተጭነው ይክፈቱ።`, 
            Markup.keyboard([
                [Markup.button.webApp('💳 Open Payment Screen', PAYMENT_WEB_URL)]
            ]).resize().oneTime()
        );
    }
});

// ከዌብ አፕ የሚመጣውን ዳታ መቀበያ
bot.on('web_app_data', async (ctx) => {
    const userId = ctx.from.id;
    // ዳታውን ከቴሌግራም እንቀበላለን
    const data = JSON.parse(ctx.webAppData.data.json()); 
    const amount = players[userId]?.lastAmount || 50;

    await ctx.reply('እናመሰግናለን! መረጃው ለአድሚን ተልኳል።', Markup.removeKeyboard());

    // ለአድሚን (ላንተ) መላክ
    return bot.telegram.sendMessage(ADMIN_ID, 
        `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n💰 መጠን: *${amount} ETB*\n🏦 ባንክ: *${data.bank}*\n\n📝 *SMS:* \`${data.message}\``, 
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
    saveToDB();
    await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጦ *${amount} ETB* ባላንስዎ ላይ ተጨምሯል!`);
    return ctx.editMessageText(`✅ ለ ID ${targetId} *${amount} ETB* አጽድቀሃል።`);
});

bot.launch().then(() => console.log("🚀 Bot is LIVE with Fix!"));
