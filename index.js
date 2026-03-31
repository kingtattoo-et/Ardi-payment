const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

// በምስሉ ላይ በሚታየው አዲሱ ቶክን ተተክቷል
const bot = new Telegraf('8684712579:AAE9JK0cdSK-cVeycF7xAd_KSrUUqmN5HWI');

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
const WIN_PATTERN_URL = 'https://kingtattoo-et.github.io/Ardi-payment/win%20pattern.jpg';

const instructionText = `እንኮን ወደ ካርቴላ ቢንጎ መጡ

1 ለመጫወት ወደቦቱ ሲገቡ register የሚለውን በመንካት ስልክ ቁጥሮትን ያጋሩ
2 menu ውስጥ በመግባት deposit fund የሚለውን በመንካት በሚፈልጉት የባንክ አካውንት ገንዘብ ገቢ ያድርጉ 
3 menu ውስጥ በመግባት start play የሚለውን በመንካት መወራረድ የሚፈልጉበትን የብር መጠን ይምረጡ።

1 ወደጨዋታው እድገቡ ከሚመጣሎት 100 የመጫወቻ ቁጥሮች መርጠው accept የሚለውን በመንካት የቀጥሉ
2 ጨዋታው ለመጀመር የተሰጠውን ጊዜ ሲያልቅ ቁጥሮች መውጣት ይጀምራል
3 የሚወጡት ቁጥሮች የመረጡት ካርቴላ ላይ መኖሩን እያረጋገጡ ያቅልሙ
4 ያቀለሙት አንድ መስመር ወይንም አራት ጠርዝ ላይ ሲመጣ ቢንጎ በማለት ማሸነፍ የችላሉ
 —አንድ መስመር ማለት
    አንድ ወደጎን ወይንም ወደታች ወይንም ዲያጎናል ሲዘጉ
 — አራት ጠርዝ ልይ ሲመጣሎት 

5 እነዚህ ማሸነፊያ ቁጥሮች ሳይመጣሎት bingo እሚለውን ከነኩ ከጨዋታው ይባረራሉ

📝ስለሆነም እንዚህን ማሳሰቢያዎች ተመልክተው እንዲጠቀሙበት ካርቴላ ቢንጎ ያሳስባል`;

bot.start((ctx) => {
    const userId = ctx.from.id;
    const referrerId = ctx.payload;

    if (!players[userId]) {
        players[userId] = { 
            balance: 0, 
            bonus: 0, 
            name: ctx.from.first_name, 
            username: ctx.from.username || "User", 
            phone: null,
            state: null
        };
        
        if (referrerId && players[referrerId]) {
            players[referrerId].bonus += 5;
            bot.telegram.sendMessage(referrerId, `🎁 አዲስ ሰው ስለጋበዙ 5 ETB ቦነስ ተጨምሮልዎታል!`);
        }
        saveToDB();
    }

    if (!players[userId].phone) {
        return ctx.replyWithMarkdown(`👋 *እንኳን ወደ Ardi Bingo በሰላም መጡ!*\n\nለመቀጠል እባክዎ ከታች ያለውን ቁልፍ ተጭነው ስልክዎን ያጋሩ።`,
            Markup.keyboard([[Markup.button.contactRequest('📲 ስልክ ቁጥርዎን ያጋሩ')]]).resize().oneTime()
        );
    }
    return showMainMenu(ctx);
});

bot.on('contact', (ctx) => {
    const userId = ctx.from.id;
    players[userId].phone = ctx.message.contact.phone_number;
    saveToDB();
    ctx.reply('✅ ተመዝግበዋል!', Markup.removeKeyboard());
    return showMainMenu(ctx);
});

function showMainMenu(ctx) {
    const userId = ctx.from.id;
    const balance = players[userId].balance || 0;
    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎮 *Welcome To Ardi Bingo!* 🎮\n\n💰 ባላንስዎ: *${balance} ETB*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
            [Markup.button.callback('🏆 Win Patterns', 'win_patterns'), Markup.button.callback('📕 Instructions', 'instructions')],
            [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('👤 Change Username', 'change_username')],
            [Markup.button.callback('📞 Support', 'support'), Markup.button.callback('🏅 Leaderboard', 'leaderboard')]
        ])
    });
}

bot.action('balance', (ctx) => {
    const userId = ctx.from.id;
    const user = players[userId];
    const msg = `<code>Username:     ${user.username || user.name}\nBalance:      ${(user.balance || 0).toFixed(2)} ETB\nbonus:        ${(user.bonus || 0).toFixed(2)}</code>`;
    ctx.answerCbQuery();
    return ctx.replyWithHTML(msg);
});

bot.action('win_patterns', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithPhoto({ url: WIN_PATTERN_URL }, { caption: "🏆 *Ardi Bingo Win Patterns*\nእነዚህን ምልክቶች በመዝጋት ማሸነፍ ይችላሉ።", parse_mode: 'Markdown' });
});

bot.action('change_username', (ctx) => {
    const userId = ctx.from.id;
    players[userId].state = 'WAITING_FOR_USERNAME';
    saveToDB();
    ctx.answerCbQuery();
    return ctx.reply("📝 እባክዎ አዲሱን መለያ ስም (Username) ያስገቡ፡");
});

bot.action('support', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('ማንኛውንም ጥያቄ እዚህ ያቅርቡ፡ @ArdiiiBingoBot');
});

bot.action('invite', (ctx) => {
    const inviteLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.answerCbQuery();
    return ctx.reply(`✉️ ጓደኞችዎን ይጋብዙ እና በእያንዳንዱ ሰው 5 ብር ቦነስ ያግኙ!\n\nየእርስዎ መጋበዣ ሊንክ፡\n${inviteLink}`);
});

bot.action('instructions', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply(instructionText);
});

bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min: 50 ETB*\n\nማስገባት የሚፈልጉትን መጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    if (players[userId]?.state === 'WAITING_FOR_USERNAME') {
        players[userId].username = msgText;
        players[userId].state = null;
        saveToDB();
        return ctx.reply(`✅ መለያ ስምዎ ወደ *${msgText}* ተቀይሯል!`, { parse_mode: 'Markdown' });
    }

    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        players[userId].tempAmount = parseInt(msgText);
        saveToDB();
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*\n\nከታች ያለውን **"Manual-Payment"** ቁልፍ ተጭነው ይክፈሉ፡`, 
            Markup.keyboard([[Markup.button.webApp('💳 Manual-Payment', PAYMENT_WEB_URL)]]).resize().oneTime()
        );
    }
});

bot.on('web_app_data', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const rawData = ctx.webAppData.data.json();
        const webData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const amount = players[userId]?.tempAmount || 50;

        await ctx.reply('✅ እናመሰግናለን! መረጃው ለአድሚን ተልኳል።', Markup.removeKeyboard());

        return bot.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${players[userId].username || ctx.from.first_name}\n📞 ስልክ: ${players[userId].phone || 'ያልታወቀ'}\n💰 መጠን: *${amount} ETB*\n🏦 ባንክ: *${webData.bank}*\n\n📝 *SMS:* \`${webData.message}\``, 
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`✅ Approve ${amount} ETB`, `approve_${userId}_${amount}`)],
                    [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
                ])
            }
        );
    } catch (e) {
        ctx.reply("⚠️ ስህተት ተፈጥሯል፣ ድጋሚ ይሞክሩ።");
    }
});

bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);
    if (!players[targetId]) players[targetId] = { balance: 0, bonus: 0 };
    players[targetId].balance += amount;
    saveToDB();
    await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጧል! *${amount} ETB* ባላንስዎ ላይ ተጨምሯል።`);
    return ctx.editMessageText(`✅ ለ ID ${targetId} *${amount} ETB* አጽድቀሃል።`);
});

bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    await bot.telegram.sendMessage(targetId, `❌ ክፍያዎ በትክክል ስላልተፈጸመ ውድቅ ተደርጓል። እባክዎ በትክክለኛ መረጃ ድጋሚ ይሞክሩ።`);
    return ctx.editMessageText(`❌ የ ID ${targetId} የክፍያ ጥያቄ ውድቅ ተደርጓል።`);
});

bot.launch().then(() => console.log("🚀 ቦቱ በምስሉ መሠረት ተስተካክሎ ተነስቷል!"));
