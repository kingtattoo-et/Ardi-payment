const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- 1. ዳታቤዝ ፋይል አያያዝ ---
const DB_FILE = './database.json';
let players = {};

if (fs.existsSync(DB_FILE)) {
    try {
        players = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        players = {};
    }
}

function saveToDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(players, null, 4));
}

const ADMIN_ID = 1046142540; // የአድሚን መለያ
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

// --- 2. ቦቱ ሲጀመር ---
bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!players[userId]) {
        players[userId] = { balance: 0, name: ctx.from.first_name };
        saveToDB();
    }

    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎉 *Welcome To Ardi Bingo!* 🎉\n\nየአሁኑ ባላንስዎ: *${players[userId].balance} ETB*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
            [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('📖 Instructions', 'instructions')],
            [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('🏆 Leaderboard', 'leaderboard')]
        ])
    });
});

// --- 3. የዴፖዚት ሂደት ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        players[userId].lastAmount = parseInt(msgText);
        saveToDB();
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*\n\n"Manual-Payment" ተጭነው የባንክ SMS ፔስት ያድርጉ።`, 
            Markup.inlineKeyboard([[Markup.button.webApp('💳 Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }
});

// --- 4. ለአድሚን መረጃ መላኪያ (ዋናው ክፍል) ---
bot.on('web_app_data', async (ctx) => {
    const userId = ctx.from.id;
    const webData = JSON.parse(ctx.webAppData.data.json()); // ከዌብ አፑ የመጣ ዳታ
    const requestedAmount = players[userId]?.lastAmount || 50;

    await ctx.reply('እናመሰግናለን! መረጃው ለአድሚን ተልኳል። እስከሚጸድቅ ይጠብቁ።');

    // ለአድሚን (ላንተ) መላክ
    try {
        await bot.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n💰 መጠን: *${requestedAmount} ETB*\n🏦 ባንክ: *${webData.bank}*\n\n📝 *SMS:* \`${webData.message}\``, 
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`✅ Approve ${requestedAmount} ETB`, `approve_${userId}_${requestedAmount}`)],
                    [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
                ])
            }
        );
    } catch (e) {
        console.log("Admin Error:", e);
    }
});

// --- 5. አድሚን ሲያጸድቅ ---
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    if (!players[targetId]) players[targetId] = { balance: 0 };
    players[targetId].balance += amount;
    saveToDB();

    await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጧል! *${amount} ETB* ባላንስዎ ላይ ተጨምሯል።`);
    ctx.answerCbQuery('ተጽድቋል!');
    return ctx.editMessageText(`✅ ለ ID ${targetId} *${amount} ETB* አጽድቀሃል።`);
});

bot.action('balance', (ctx) => {
    const balance = players[ctx.from.id]?.balance || 0;
    return ctx.reply(`የአሁኑ ባላንስዎ: ${balance} ETB`);
});

bot.launch().then(() => console.log("🚀 Bot is LIVE with JSON Storage!"));
