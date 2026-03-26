const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

// Supabase መረጃዎች
const supabase = createClient('https://avedmreofsmzlrhdxuhq.supabase.co', 'YOUR_SUPABASE_KEY');
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ዋና መረጃዎች ---
const ADMIN_ID = 1046142540; // ያንተ ID
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

// --- Deposit Logic ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Here are the min you can deposit` \n*Min Amount: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን ይላኩ (ለምሳሌ፦ 100)');
});

// መጠን ሲላክ
bot.on('text', async (ctx) => {
    const amount = parseInt(ctx.message.text);
    if (!isNaN(amount) && amount >= 50) {
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${amount} ETB*\n\nእባክዎ ከታች ያለውን በመንካት ክፍያ ይፈጽሙ። ሲጨርሱ የደረሰኝ ቁጥር ወይም Screenshot ይላኩ።`, 
            Markup.inlineKeyboard([[Markup.button.webApp('Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }
});

// --- የማረጋገጫ ሂደት (Verification) ---
bot.on(['photo', 'document'], async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name;

    await ctx.reply('እባክዎ አድሚን @NY112YW እስከሚያጸድቀው ድረስ ትንሽ ይጠብቁ።');

    // ለአድሚኑ (ላንተ) መልዕክት ይላካል
    await bot.telegram.sendMessage(ADMIN_ID, `🔔 *አዲስ የክፍያ ጥያቄ*\n\nተጠቃሚ: ${userName}\nID: \`${userId}\`\n\nእባክዎ ክፍያውን አረጋግጠው ያጽድቁ።`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve 50 ETB', `approve_${userId}_50`)],
            [Markup.button.callback('✅ Approve 100 ETB', `approve_${userId}_100`)],
            [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
        ])
    });
});

// --- Admin Actions (Approve/Cancel) ---
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('ይህ ለናንተ አልተፈቀደም!');
    
    const targetUserId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    try {
        const { data: user } = await supabase.from('users').select('balance').eq('id', targetUserId).single();
        const newBalance = (user?.balance || 0) + amount;
        await supabase.from('users').update({ balance: newBalance }).eq('id', targetUserId);

        await bot.telegram.sendMessage(targetUserId, `✅ ክፍያዎ ጸድቋል! *${amount} ETB* በሂሳብዎ ላይ ተጨምሯል።`);
        ctx.answerCbQuery('ተቀባይነት አግኝቷል!');
        return ctx.editMessageText(`✅ ለተጠቃሚ ${targetUserId} *${amount} ETB* አጽድቀሃል።`);
    } catch (err) { console.error(err); ctx.answerCbQuery('ስህተት!'); }
});

bot.action(/cancel_(\d+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('ይህ ለናንተ አልተፈቀደም!');
    const targetUserId = ctx.match[1];
    await bot.telegram.sendMessage(targetUserId, `❌ ይቅርታ፣ የላኩት የክፍያ ማረጋገጫ ተቀባይነት አላገኘም። እባክዎ @NY112YW ያነጋግሩ።`);
    ctx.answerCbQuery('ተሰርዟል!');
    return ctx.editMessageText(`❌ የID ${targetUserId} ጥያቄ ሰርዘሃል።`);
});

bot.launch().then(() => console.log("🚀 Bot is LIVE with your Admin ID!"));
