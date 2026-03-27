const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

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

const instructionText = `እንኮን ወደ አርዲ ቢንጎ በሰላም መጡ

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

📝ስለሆነም እንዚህን ማሳሰቢያዎች ተመልክተው እንዲጠቀሙበት አርዲ ቢንጎ ያሳስባል`;

bot.start((ctx) => {
    const userId = ctx.from.id;
    const referrerId = ctx.payload;

    if (!players[userId]) {
        players[userId] = { 
            balance: 0, 
            bonus: 0, 
            gamesPlayed: 0,
            name: ctx.from.first_name || "Player", 
            username: ctx.from.username || ctx.from.first_name || "User", 
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
    if (players[userId]) {
        players[userId].phone = ctx.message.contact.phone_number;
        saveToDB();
    }
    ctx.reply('✅ ተመዝግበዋል!', Markup.removeKeyboard());
    return showMainMenu(ctx);
});

function showMainMenu(ctx) {
    const userId = ctx.from.id;
    const user = players[userId] || { balance: 0, bonus: 0 };
    const total = (user.balance || 0) + (user.bonus || 0);
    
    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎮 *Welcome To Ardi Bingo!* 🎮\n\n💰 ባላንስዎ: *${total.toFixed(2)} ETB*`,
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

// 1. የባላንስ ማሳያ (ተስተካክሏል)
bot.action('balance', (ctx) => {
    const userId = ctx.from.id;
    const user = players[userId];
    if (!user) return ctx.answerCbQuery("User profile not found.");

    const usernameDisplay = user.username.startsWith('@') ? user.username : `@${user.username}`;
    const b = (user.balance || 0).toFixed(2);
    const bo = (user.bonus || 0).toFixed(2);
    
    const msg = `<b>Username:</b> ${usernameDisplay}\n<b>Balance:</b> ${b} ETB\n<b>Bonus:</b> ${bo} ETB`;
    
    ctx.answerCbQuery();
    return ctx.replyWithHTML(msg);
});

// 2. Leaderboard ከ1-5
bot.action('leaderboard', (ctx) => {
    ctx.answerCbQuery();
    const sorted = Object.values(players)
        .sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0))
        .slice(0, 5);

    let list = "";
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    sorted.forEach((p, i) => {
        list += `${medals[i]} @${p.username} - ${p.gamesPlayed || 0} ጨዋታ\n`;
    });

    const text = `🏅 *Ardi Bingo Leaderboard* 🏅\n\nበወር ውስጥ 50 ጨዋታ እና ከዚያ በላይ ለተጫወቱ ተጫዋቾች የ 10,000 ETB ሽልማት ይዘጋጃል።\n\n*የደረጃ ሰንጠረዥ:*\n${list || "ተጫዋቾች ገና አልተመዘገቡም"}`;
    return ctx.replyWithMarkdown(text);
});

// 3. Win Patterns (ምስል ማሳያ ተስተካክሏል)
bot.action('win_patterns', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithPhoto({ url: WIN_PATTERN_URL }, { 
        caption: "🏆 *Ardi Bingo Win Patterns*\n\nእነዚህን ምልክቶች በመዝጋት ማሸነፍ ይችላሉ።", 
        parse_mode: 'Markdown' 
    });
});

bot.action('change_username', (ctx) => {
    const userId = ctx.from.id;
    if (players[userId]) {
        players[userId].state = 'WAITING_FOR_USERNAME';
        saveToDB();
    }
    ctx.answerCbQuery();
    return ctx.reply("📝 እባክዎ አዲሱን Username ያስገቡ (ለምሳሌ፦ Ardi_Player)");
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
        players[userId].username = msgText.replace('@', '');
        players[userId].state = null;
        saveToDB();
        return ctx.reply(`✅ Username በትክክል ወደ @${players[userId].username} ተቀይሯል!`);
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
        const webData = JSON.parse(ctx.webAppData.data.json());
        const amount = players[userId]?.tempAmount || 50;

        await ctx.reply('✅ እናመሰግናለን! መረጃው ለአድሚን ተልኳል።', Markup.removeKeyboard());

        return bot.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n💰 መጠን: *${amount} ETB*\n🏦 ባንክ: *${webData.bank}*\n📝 *SMS:* \`${webData.message}\``, 
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`✅ Approve ${amount}`, `approve_${userId}_${amount}`)],
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
    if (players[targetId]) {
        players[targetId].balance += amount;
        saveToDB();
        await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ተረጋግጧል! *${amount} ETB* ተጨምሯል።`);
    }
    return ctx.editMessageText(`✅ ጸድቋል!`);
});

bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    await bot.telegram.sendMessage(targetId, `❌ ክፍያዎ ውድቅ ተደርጓል።`);
    return ctx.editMessageText(`❌ ውድቅ ተደርጓል።`);
});

bot.launch().then(() => console.log("🚀 አርዲ ቢንጎ ተስተካክሎ ተነስቷል!"));
