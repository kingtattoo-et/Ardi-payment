const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- 1. ዋና መረጃዎች ---
const ADMIN_ID = 1046142540; // ያንተ ID
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

// ጊዜያዊ ዳታቤዝ
let players = {}; 

// --- 2. ቦቱ ሲጀመር (Start) ---
bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!players[userId]) {
        players[userId] = { balance: 0, name: ctx.from.first_name };
    }

    const welcomeMessage = `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts – Grab Your Cartela, Join The Game, and Let the Fun Begin!*`;

    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: welcomeMessage,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
            [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('📖 Instructions', 'instructions')],
            [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('🏆 Leaderboard', 'leaderboard')]
        ])
    });
});

// --- 3. Deposit Process ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min Amount: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

// --- 4. መጠን መቀበያ እና WebApp መክፈቻ ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        players[userId].lastRequestedAmount = parseInt(msgText);
        
        return ctx.replyWithMarkdown(
            `የመረጡት መጠን: *${msgText} ETB*\n\nእባክዎ ከታች ያለውን "Manual-Payment" በመጫን ክፍያ ይፈጽሙ። በዌብሳይቱ ላይ "Send for Verification" ሲጫኑ የባንክ SMS እዚህ "Paste" አድርገው ይላኩ።`, 
            Markup.inlineKeyboard([
                [Markup.button.webApp('Manual-Payment', PAYMENT_WEB_URL)]
            ])
        );
    }
});

// --- 5. ከ WebApp (Send for Verification) የሚመጣ መረጃ ---
bot.on('web_app_data', async (ctx) => {
    const userId = ctx.from.id;
    const data = JSON.parse(ctx.webAppData.data.json()); // ከድረ-ገጹ የመጣው ዳታ
    const requestedAmount = players[userId]?.lastRequestedAmount || 50;

    await ctx.reply('እናመሰግናለን! መረጃው ለአድሚን ተልኳል። እስከሚጸድቅ ድረስ ትንሽ ይጠብቁ።');

    // ለአድሚኑ (ላንተ) መልዕክት ይላካል
    await bot.telegram.sendMessage(ADMIN_ID, 
        `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n💰 መጠን: *${requestedAmount} ETB*\n🏦 ባንክ: *${data.bank}*\n\n📝 *SMS:* \`${data.message}\``, 
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(`✅ Approve ${requestedAmount} ETB`, `approve_${userId}_${requestedAmount}`)],
                [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
            ])
        }
    );
});

// --- 6. አድሚን Approve/Cancel ሲያደርግ ---
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    if (!players[targetUserId]) players[targetUserId] = { balance: 0 };
    players[targetUserId].balance += amount;

    await bot.telegram.sendMessage(targetUserId, `✅ ክፍያዎ ተረጋግጧል! *${amount} ETB* ወደ ባላንስዎ ተጨምሯል።`);
    ctx.answerCbQuery('ተጽድቋል!');
    return ctx.editMessageText(`✅ ለተጠቃሚ \`${targetUserId}\` *${amount} ETB* አጽድቀሃል።`);
});

bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await bot.telegram.sendMessage(targetUserId, `❌ ይቅርታ፣ የላኩት የክፍያ መረጃ ተቀባይነት አላገኘም።`);
    ctx.answerCbQuery('ተሰርዟል');
    return ctx.editMessageText(`❌ የID \`${targetUserId}\` ጥያቄ ውድቅ ተደርጓል።`);
});

bot.action('balance', (ctx) => {
    const userId = ctx.from.id;
    const balance = players[userId]?.balance || 0;
    return ctx.reply(`የአሁኑ ባላንስዎ: ${balance} ETB`);
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is LIVE and Running!"));
