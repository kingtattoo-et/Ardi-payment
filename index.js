const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ቦት ቶከንህን እዚህ ጋር አስገባ
const bot = new Telegraf('YOUR_BOT_TOKEN_HERE');
const DB_FILE = './database.json';

// ዳታቤዝ ማንበቢያ
function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// ዳታቤዝ መጻፊያ
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. መመሪያ (Instructions)
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

// Start Command (Referral System ጨምሮ)
bot.start((ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || "የሌለው";
    const referrerId = ctx.payload; // የጋባዡ ID

    let db = readDB();

    if (!db.users[userId]) {
        db.users[userId] = {
            username: username,
            balance: 0,
            bonus: 0,
            referredBy: referrerId || null
        };

        // ለጋባዡ 5 ብር ቦነስ መስጠት
        if (referrerId && db.users[referrerId]) {
            db.users[referrerId].bonus += 5;
            bot.telegram.sendMessage(referrerId, `🎁 አዲስ ሰው ስለጋበዙ 5 ETB ቦነስ ወደ አካውንትዎ ተጨምሯል!`);
        }
        writeDB(db);
    }

    ctx.reply(`እንኳን ወደ Ardi Bingo በሰላም መጡ!`, Markup.keyboard([
        ['💰 Check Balance', '💳 Make a Deposit'],
        ['📞 Support', '📕 Instructions'],
        ['✉️ Invite', '🏆 Leaderboard']
    ]).resize());
});

// 2. Balance Check (ልክ እንደ ፎቶው)
bot.hears('💰 Check Balance', (ctx) => {
    const userId = ctx.from.id;
    const db = readDB();
    const user = db.users[userId];

    if (user) {
        const balanceMsg = `
<code>
Username:     ${user.username}
Balance:      ${user.balance.toFixed(2)} ETB
Bonus:        ${user.bonus.toFixed(2)}
</code>
        `;
        ctx.replyWithHTML(balanceMsg);
    }
});

// 3. Support
bot.hears('📞 Support', (ctx) => {
    ctx.reply('ማንኛውንም ጥያቄ እዚህ ያቅርቡ፡ @ArdiiiBingoBot');
});

// 4. Instructions
bot.hears('📕 Instructions', (ctx) => {
    ctx.reply(instructionText);
});

// 5. Invite (የሪፈራል ሊንክ)
bot.hears('✉️ Invite', (ctx) => {
    const inviteLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.reply(`✉️ ጓደኞችዎን ይጋብዙ እና የ 5 ብር ቦነስ ያግኙ!\n\nየእርስዎ መጋበዣ ሊንክ፡\n${inviteLink}`);
});

// Deposit (ያለህበት የቀጠለ)
bot.hears('💳 Make a Deposit', (ctx) => {
    ctx.reply('እባክዎ ተቀማጭ ማድረግ የሚፈልጉትን የብር መጠን ያስገቡ (ለምሳሌ፦ 100)');
});

// ማንኛውም ቁጥር ሲላክ እንደ Deposit amount እንዲቆጥር (ካለህ ኮድ ጋር አቀናጅተህ ተጠቀመው)
bot.on('text', (ctx) => {
    const amount = parseFloat(ctx.message.text);
    if (!isNaN(amount) && amount >= 50) {
        ctx.reply(`የመረጡት መጠን: ${amount} ETB\n\nከታች ያለውን "Manual-Payment" ቁልፍ ተጭነው ይክፈሉ፡`, 
            Markup.inlineKeyboard([
                [Markup.button.webApp('💳 Manual-Payment', `https://kingtattoo-et.github.io/Ardi-payment/?amount=${amount}`)]
            ])
        );
    }
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is LIVE with full updates!"));
