const { Telegraf, Markup } = require('telegraf');

// የቦት ቶክን
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// የአድሚን ቴሌግራም ID (እዚህ ጋር የራስህን ID ቁጥር ተካው)
const ADMIN_ID = '6633658514'; 

// የተጠቃሚዎች መረጃ ጊዜያዊ ማከማቻ
let userProfiles = {};

// ቦቱ ሲጀመር (Start Menu)
bot.start((ctx) => {
    const userId = ctx.from.id;
    const defaultUsername = ctx.from.username || `User_${userId}`;
    
    if (!userProfiles[userId]) {
        userProfiles[userId] = {
            username: defaultUsername,
            balance: 0.00,
            coin: 0.00
        };
    }

    const welcomeMessage = `*እንኳን ወደ Ardi Bingo በሰላም መጡ!* \n\n*የእርስዎ መለያ ስም:* ${userProfiles[userId].username}\n\nተወዳጁን የቢንጎ ጨዋታ በቤትዎ ይሁኑ ይጫወቱ። በ90 ሰከንድ በሚደረግ ጨዋታ ዕድልዎን ይሞክሩ!`;
    
    ctx.replyWithMarkdown(welcomeMessage, 
        Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [
                Markup.button.callback('💰 Check Balance', 'balance'),
                Markup.button.callback('💵 Make a Deposit', 'deposit')
            ],
            [
                Markup.button.callback('📞 Support', 'support'),
                Markup.button.callback('📖 Instructions', 'instructions')
            ],
            [
                Markup.button.callback('📩 Invite', 'invite'),
                Markup.button.callback('🏆 Leaderboard', 'leaderboard')
            ],
            [
                Markup.button.callback('👤 Change Username', 'username_change'),
                Markup.button.callback('🖼 Win Patterns', 'patterns')
            ]
        ])
    );
});

// --- አዲሱ ክፍል፡ ከ WebApp የሚመጣ ዳታ መቀበያ ---
bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.webAppData.data.json());
        const user = ctx.from;

        // 1. ለተጠቃሚው የሚላክ ማረጋገጫ
        await ctx.replyWithMarkdown(`✅ *የክፍያ መረጃ ደርሶናል!*\n\n*ባንክ:* ${data.bank}\n*መረጃው:* ${data.message}\n\nእባክዎ መረጃው ተረጋግጦ እስኪጨመር ድረስ ለጥቂት ደቂቃዎች በትዕግስት ይጠብቁ።`);

        // 2. ለአድሚን (ለአንተ) የሚላክ ማሳወቂያ
        await ctx.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ!*\n\n` +
            `👤 *ከ:* @${user.username || user.first_name}\n` +
            `🆔 *ID:* \`${user.id}\` \n` +
            `🏦 *ባንክ:* ${data.bank}\n` +
            `📝 *SMS:* \`${data.message}\``,
            { parse_mode: 'Markdown' }
        );

    } catch (e) {
        console.error("WebAppData Error:", e);
        ctx.reply("❌ መረጃውን በማስተናገድ ላይ ስህተት ተፈጥሯል። እባክዎ ድጋሚ ይሞክሩ።");
    }
});

// --- በተኖቹ ሲነኩ የሚሰጡ ምላሾች ---

// 1. ለ Check Balance ምላሽ
bot.action('balance', (ctx) => {
    const user = userProfiles[ctx.from.id] || { username: "Guest", balance: 0, coin: 0 };
    ctx.answerCbQuery();
    const balanceMsg = `👤 *Username:* ${user.username}\n💰 *Balance:* ${user.balance.toFixed(2)} ETB\n🪙 *Coin:* ${user.coin.toFixed(2)}`;
    ctx.replyWithMarkdown(balanceMsg);
});

// 2. ለ Deposit ምላሽ
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(`📥 *Min Amount:* 50 ETB\n\nእባክዎ ማስገባት የሚፈልጉትን የገንዘብ መጠን ይጻፉ (ምሳሌ: 100)`);
});

// 3. ተጠቃሚው መጠን ሲያስገባ
bot.on('text', (ctx) => {
    const text = ctx.message.text;

    if (!isNaN(text) && text >= 50) {
        const paymentUrl = "https://kingtattoo-et.github.io/Ardi-payment/"; 
        
        ctx.reply(`ተቀማጭ መጠን፦ ${text} ETB\n\nእባክዎ ከታች ያለውን በተን ተጭነው ክፍያውን ይፈጽሙ፦`, 
            Markup.inlineKeyboard([
                [Markup.button.webApp('💳 Manual-Payment', paymentUrl)]
            ])
        );
    } 
    else if (!isNaN(text) && text < 50) {
        ctx.reply("❌ ትንሹ ተቀማጭ መጠን 50 ETB ነው። እባክዎ ከ50 በላይ የሆነ ቁጥር ድጋሚ ያስገቡ።");
    }
});

// 4. Username ለመቀየር
bot.action('username_change', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('እባክዎ አዲሱን መለያ ስም በዚሁ መልክ ይላኩ፦\n/setname ያንተ_ስም');
});

bot.command('setname', (ctx) => {
    const newName = ctx.message.text.split(' ')[1];
    if (newName && userProfiles[ctx.from.id]) {
        userProfiles[ctx.from.id].username = newName;
        ctx.reply(`✅ ስምዎ ወደ *${newName}* ተቀይሯል!`, { parse_mode: 'Markdown' });
    }
});

// ቦቱን ማስነሻ
bot.launch().then(() => console.log("Ardi Bingo Bot is LIVE with WebApp!"));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));