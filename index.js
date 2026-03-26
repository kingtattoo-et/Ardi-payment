const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(port, () => console.log(`Health check server listening on port ${port}`));

const supabaseUrl = 'https://avedmreofsmzlrhdxuhq.supabase.co'; 
const supabaseKey = 'YOUR_SUPABASE_KEY'; 
const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ዋና መረጃዎች ---
const ADMIN_ID = 'YOUR_TELEGRAM_USER_ID'; // እዚህ ጋር ያንተን የቴሌግራም ቁጥር (ID) በልኩ አስገባ
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';

bot.start(async (ctx) => {
    try {
        const welcomeMessage = `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts – Grab Your Cartela, Join The Game, and Let the Fun Begin!*`;
        return ctx.replyWithPhoto({ url: LOGO_URL }, {
            caption: welcomeMessage,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🎮 Play Now', 'play')],
                [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
                [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('📕 Instructions', 'instructions')],
                [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('Win Patterns 🖼', 'patterns')]
            ])
        });
    } catch (err) { console.error(err); }
});

// --- Deposit Process ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Here are the min you can deposit` \n*Min Amount: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን ይላኩ፦');
});

// ተጠቃሚው መጠን ሲልክ
bot.on('text', async (ctx) => {
    const amount = parseInt(ctx.message.text);
    if (!isNaN(amount) && amount >= 50) {
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${amount} ETB*\n\nከታች ያለውን "Manual-Payment" በመጫን ክፍያ ይፈጽሙ። ሲጨርሱ የደረሰኝ ቁጥር ወይም Screenshot ይላኩ።`, 
            Markup.inlineKeyboard([[Markup.button.webApp('Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }
});

// --- Verification & Admin Approval Logic ---
// ተጠቃሚው ፎቶ ወይም ጽሁፍ (ደረሰኝ) ሲልክ
bot.on(['photo', 'text'], async (ctx) => {
    if (ctx.message.text && !isNaN(ctx.message.text)) return; // መጠኑን ከሆነ የላከው ዝለለው

    const userId = ctx.from.id;
    const userName = ctx.from.first_name;

    // ለተጠቃሚው የሚላክ መልዕክት
    await ctx.reply('እባክዎ አድሚን @NY112YW እስከሚያጸድቀው ድረስ ትንሽ ይጠብቁ።');

    // ለአድሚኑ የሚላክ መልዕክት (Approve/Cancel በተን ያለው)
    await bot.telegram.sendMessage(ADMIN_ID, `🔔 *አዲስ የክፍያ ጥያቄ*\n\nተጠቃሚ: ${userName}\nID: \`${userId}\`\n\nእባክዎ ክፍያውን ካረጋገጡ በኋላ Approve ይበሉ።`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve (100 ETB)', `approve_${userId}_100`)],
            [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
        ])
    });
});

// የአድሚን በተን ሲነካ (Approve)
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const amountToAdd = parseInt(ctx.match[2]);

    try {
        // በ Supabase ላይ Balance ለመጨመር
        const { data: user } = await supabase.from('users').select('balance').eq('id', targetUserId).single();
        const newBalance = (user?.balance || 0) + amountToAdd;

        await supabase.from('users').update({ balance: newBalance }).eq('id', targetUserId);

        // ለተጠቃሚው ማሳወቅ
        await bot.telegram.sendMessage(targetUserId, `✅ ክፍያዎ ጸድቋል! *${amountToAdd} ETB* በሂሳብዎ ላይ ተጨምሯል።`, { parse_mode: 'Markdown' });
        
        ctx.answerCbQuery('ተቀባይነት አግኝቷል!');
        return ctx.editMessageText(`✅ ለተጠቃሚ ${targetUserId} *${amountToAdd} ETB* አጽድቀሃል።`, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error(err);
        ctx.answerCbQuery('ስህተት ተከስቷል!');
    }
});

// የአድሚን በተን ሲነካ (Cancel)
bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await bot.telegram.sendMessage(targetUserId, `❌ ይቅርታ፣ የላኩት የክፍያ ማረጋገጫ ተቀባይነት አላገኘም። እባክዎ አድሚን @NY112YW ያነጋግሩ።`);
    ctx.answerCbQuery('ተሰርዟል!');
    return ctx.editMessageText(`❌ የID ${targetUserId} ጥያቄ ሰርዘሃል።`);
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is LIVE with Admin Approval!"));
