const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE (No Database Mode)'));
app.listen(process.env.PORT || 10000);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ዋና መረጃዎች ---
const ADMIN_ID = 1046142540; // ያንተ ID
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

// ተጫዋቾችን ለጊዜው እዚህ ይይዛቸዋል (ቦቱ ሲጠፋ ይጠፋል)
let players = {}; 

bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!players[userId]) {
        players[userId] = { balance: 0, name: ctx.from.first_name };
    }

    return ctx.replyWithPhoto({ url: LOGO_URL }, {
        caption: `🎉 *Welcome To Ardi Bingo!* 🎉\n\nባላንስዎ: *${players[userId].balance} ETB*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Deposit', 'deposit')]
        ])
    });
});

bot.action('deposit', (ctx) => {
    return ctx.reply('እባክዎ የከፈሉበትን የባንክ SMS እዚህ "Paste" አድርገው ይላኩ።');
});

// ተጠቃሚው SMS ሲልክ
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // ለአድሚን (ላንተ) መላክ
    try {
        await ctx.reply('መረጃው ለአድሚን ተልኳል፤ እስከሚጸድቅ ይጠብቁ።');

        await bot.telegram.sendMessage(ADMIN_ID, `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n\n📝 *SMS:* \`${text}\``, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Approve 100 ETB', `add_100_${userId}`)],
                [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
            ])
        });
    } catch (e) {
        console.log("Admin ID Error: መጀመሪያ ቦቱን Start በለው!");
    }
});

// አድሚኑ ሲያጸድቅ
bot.action(/add_100_(\d+)/, async (ctx) => {
    const targetId = ctx.match[1];
    if (!players[targetId]) players[targetId] = { balance: 0 };
    
    players[targetId].balance += 100;
    
    await bot.telegram.sendMessage(targetId, `✅ ክፍያዎ ጸድቋል! 100 ETB ተጨምሯል።`);
    return ctx.editMessageText(`✅ ለ ID ${targetId} 100 ETB አጽድቀሃል።`);
});

bot.launch().then(() => console.log("🚀 Bot is running without Supabase!"));
