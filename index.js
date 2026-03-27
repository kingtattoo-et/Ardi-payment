const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

// ቦት ቶከን (Token)
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

const DB_FILE = './database.json';
let db = { users: {} };

// ዳታቤዝ ማንበቢያ
if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        db = { users: {} };
    }
}

// ዳታቤዝ መጻፊያ
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));
}

const ADMIN_ID = 1046142540; 
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

// መመሪያ (Instructions)
const instructionText = `
እንኮን ወደ ካርቴላ ቢንጎ መጡ

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

ማሳሰቢያ
1 የጨዋታ ማስጀመሪያ ሰከንድ (countdown) ሲያልቅ ያሉት ተጫዋች ብዛት ከ2 በታች ከሆነ ያ ጨዋታ አይጀምርም 
2 ጨዋታ ከጀመረ በህዋላ ካርቴላ መምረጫ ቦርዱ ይፀዳል
3 እርሶ በዘጉበት ቁጥር ሌላ ተጫዋች ዘግቶ ቀድሞ bingo ካለ አሸናፊነትዋን ያጣሉ

📝ስለሆነም እንዚህን ማሳሰቢያዎች ተመልክተው እንዲጠቀሙበት ካርቴላ ቢንጎ ያሳስባል
`;

// --- ቦቱ ሲጀመር ---
bot.start((ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || `User_${userId}`;
    const referrerId = ctx.payload; // የጋባዥ ID

    if (!db.users[userId]) {
        db.users[userId] = {
            username: username,
            balance: 0.00,
            bonus: 0.00,
            phone: userphone,
            referredBy: referrerId || null
        };
        
        // ለጋባዡ 5 ብር ቦነስ መስጠት
        if (referrerId && db.users[referrerId]) {
            db.users[referrerId].bonus += 5.00;
            bot.telegram.sendMessage(referrerId, `🎁 አዲስ ሰው ስለጋበዙ 5 ETB ቦነስ ወደ አካውንትዎ ተጨምሯል!`);
        }
        saveDB();
    }

    if (!db.users[userId].phone) {
        return ctx.replyWithMarkdown(`👋 *እንኳን ወደ Ardi Bingo በሰላም መጡ!*\n\nለመቀጠል እባክዎ ስልክዎን ያጋሩ።`,
            Markup.keyboard([[Markup.button.contactRequest('📲 ስልክ ቁጥርዎን ያጋሩ')]]).resize().oneTime()
        );
    }
    return showMainMenu(ctx);
});

bot.on('contact', (ctx) => {
    const userId = ctx.from.id;
    db.users[userId].phone = ctx.message.contact.phone_number;
    saveDB();
    ctx.reply('✅ ተመዝግበዋል!', Markup.removeKeyboard());
    return showMainMenu(ctx);
});

function showMainMenu(ctx) {
    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎮 *Welcome To Ardi Bingo!* 🎮`,
        ...Markup.keyboard([
            ['💰 Check Balance', '💵 Make a Deposit'],
            ['📞 Support', '📕 Instructions'],
            ['✉️ Invite', '🏅 Leaderboard']
        ]).resize()
    });
}

// 1. Balance Check (ልክ እንደ ምስል 1)
bot.hears('💰 Check Balance', (ctx) => {
    const userId = ctx.from.id;
    const user = db.users[userId];
    if (user) {
        const msg = `<code>Username:     ${user.username}\nBalance:      ${user.balance.toFixed(2)} ETB\nbonus:        ${user.bonus.toFixed(2)}</code>`;
        ctx.replyWithHTML(msg);
    }
});

// 2. Support (@ArdiiiBingoBot)
bot.hears('📞 Support', (ctx) => {
    ctx.reply('ማንኛውንም ጥያቄ እዚህ ያቅርቡ፡ @ArdiiiBingoBot');
});

// 3. Invite (5 ETB Bonus)
bot.hears('✉️ Invite', (ctx) => {
    const inviteLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.reply(`✉️ ጓደኞችዎን ይጋብዙ እና የ 5 ብር ቦነስ ያግኙ!\n\nየእርስዎ መጋበዣ ሊንክ፡\n${inviteLink}`);
});

// 4. Instructions
bot.hears('📕 Instructions', (ctx) => {
    ctx.reply(instructionText);
});

// --- Deposit Process ---
bot.hears('💵 Make a Deposit', (ctx) => {
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min: 50 ETB*\n\nመጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        db.users[userId].tempAmount = parseInt(msgText);
        saveDB();
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*\n\nከታች ያለውን ቁልፍ ተጭነው ይክፈሉ፡`, 
            Markup.keyboard([[Markup.button.webApp('💳 Manual-Payment', PAYMENT_WEB_URL)]]).resize().oneTime()
        );
    }
});

// --- Web App Data (Admin Verification) ---
bot.on('web_app_data', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const webData = JSON.parse(ctx.webAppData.data.json());
        const amount = db.users[userId]?.tempAmount || 50;

        await ctx.reply('✅ መረጃው ለአድሚን ተልኳል።', Markup.removeKeyboard());

        return bot.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n📞 ስልክ: ${db.users[userId].phone}\n💰 መጠን: *${amount} ETB*\n🏦 ባንክ: *${webData.bank}*\n\n📝 *SMS:* \`${webData.message}\``, 
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`✅ Approve ${amount} ETB`, `approve_${userId}_${amount}`)],
                    [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
                ])
            }
        );
    } catch (e) { ctx.reply("ስህተት ተፈጥሯል፣ ድጋሚ ይሞክሩ።"); }
});

// --- Approve & Cancel Functions ---
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseFloat(ctx.match[2]);

    if (db.users[targetId]) {
        db.users[targetId].balance += amount;
        saveDB();
        await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጧል! *${amount} ETB* ባላንስዎ ላይ ተጨምሯል።`);
        return ctx.editMessageText(`✅ ለ ID ${targetId} *${amount} ETB* አጽድቀሃል።`);
    }
});

bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    await bot.telegram.sendMessage(targetId, `❌ ክፍያዎ በትክክል ስላልተፈጸመ ውድቅ ተደርጓል።`);
    return ctx.editMessageText(`❌ የ ID ${targetId} ክፍያ ጥያቄ ውድቅ ተደርጓል።`);
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is LIVE!"));
