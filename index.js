const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

// የቦት ቶከን
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ዳታቤዝ ፋይል አያያዝ ---
const DB_FILE = './database.json';
let players = {};

if (fs.existsSync(DB_FILE)) {
    try { players = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { players = {}; }
}

function saveToDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(players, null, 4));
}

// --- ዋና መረጃዎች ---
const ADMIN_ID = 1046142540; // ያንተ ID
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

// --- ቦቱ ሲጀመር (Start) ---
bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!players[userId]) {
        players[userId] = { balance: 0, name: ctx.from.first_name, phone: null };
        saveToDB();
    }

    // ስልክ ካላጋራ መጀመሪያ ስልክ እንዲያጋራ ይጠይቃል
    if (!players[userId].phone) {
        return ctx.replyWithMarkdown(`👋 *እንኳን ወደ Ardi Bingo በሰላም መጡ!*\n\nለመቀጠል እባክዎ ከታች ያለውን ቁልፍ ተጭነው ስልክዎን ያጋሩ።`,
            Markup.keyboard([
                [Markup.button.contactRequest('📲 ስልክ ቁጥርዎን ያጋሩ')]
            ]).resize().oneTime()
        );
    }

    // ስልክ ካጋራ በኋላ ዋናውን ሜኑ ያሳያል
    return showMainMenu(ctx);
});

// ስልክ ቁጥር ሲላክ መቀበያ
bot.on('contact', (ctx) => {
    const userId = ctx.from.id;
    // ስልክ ቁጥሩን ይቀበላል
    players[userId].phone = ctx.message.contact.phone_number;
    saveToDB();
    ctx.reply('✅ ተመዝግበዋል!', Markup.removeKeyboard());
    return showMainMenu(ctx);
});

// ዋናው ሜኑ (Main Menu)
function showMainMenu(ctx) {
    const userId = ctx.from.id;
    const balance = players[userId].balance || 0;

    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎮 *Welcome To Ardi Bingo!* 🎮\n\n💰 ባላንስዎ: *${balance} ETB*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
            [Markup.button.callback('📞 Support', 'support')],
            [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('🏅 Leaderboard', 'leaderboard')]
        ])
    });
}

// --- የዴፖዚት ሂደት ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min: 50 ETB*\n\nማስገባት የሚፈልጉትን መጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        players[userId].tempAmount = parseInt(msgText);
        saveToDB();
        
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*\n\nከታች ያለውን **"Manual-Payment"** ቁልፍ ተጭነው ይክፈሉ፡`, 
            Markup.keyboard([
                [Markup.button.webApp('💳 Manual-Payment', PAYMENT_WEB_URL)]
            ]).resize().oneTime()
        );
    }
});

// --- ለአድሚን መረጃ መላኪያ ---
bot.on('web_app_data', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const webData = JSON.parse(ctx.webAppData.data.json());
        const amount = players[userId]?.tempAmount || 50;

        await ctx.reply('እናመሰግናለን! መረጃው ለአድሚን ተልኳል።', Markup.removeKeyboard());

        // ለአድሚን (ላንተ) መላክ
        return bot.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n📞 ስልክ: ${players[userId].phone || 'ያልታወቀ'}\n💰 መጠን: *${amount} ETB*\n🏦 ባንክ: *${webData.bank}*\n\n📝 *SMS:* \`${webData.message}\``, 
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`✅ Approve ${amount} ETB`, `approve_${userId}_${amount}`)],
                    [Markup.button.callback('❌ Cancel', `cancel_${userId}`)] // የካንሰል ቁልፍ
                ])
            }
        );
    } catch (e) {
        ctx.reply("ስህተት ተፈጥሯል፣ ድጋሚ ይሞክሩ።");
    }
});

// --- ባላንስ ማጽደቂያ (Approve) ---
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    if (!players[targetId]) players[targetId] = { balance: 0 };
    players[targetId].balance += amount; // ባላንስ ይጨምራል
    saveToDB();

    await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጧል! *${amount} ETB* ባላንስዎ ላይ ተጨምሯል።`);
    ctx.answerCbQuery('ተጽድቋል!');
    return ctx.editMessageText(`✅ ለ ID ${targetId} *${amount} ETB* አጽድቀሃል።`);
});

// --- ክፍያ ውድቅ ማድረጊያ (Cancel) ---
bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    await bot.telegram.sendMessage(targetId, `❌ ክፍያዎ በትክክል ስላልተፈጸመ ውድቅ ተደርጓል።`);
    ctx.answerCbQuery('ውድቅ ተደርጓል!');
    return ctx.editMessageText(`❌ የ ID ${targetId} ክፍያ ጥያቄ ውድቅ ተደርጓል።`);
});

bot.action('balance', (ctx) => {
    const bal = players[ctx.from.id]?.balance || 0;
    ctx.answerCbQuery();
    return ctx.reply(`💰 የአሁኑ ባላንስዎ: *${bal} ETB*`, { parse_mode: 'Markdown' });
});

bot.launch().then(() => console.log("🚀 ቦቱ በምስሉ መሠረት ተስተካክሎ ተነሳ!"));
