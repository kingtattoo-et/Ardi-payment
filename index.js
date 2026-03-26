const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// Render ላይ ቦቱ እንዳይዘጋ የሚረዳ (Health Check)
const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

// --- Supabase ግንኙነት ---
// 'YOUR_SUPABASE_KEY' በሚለው ቦታ ከ Supabase ያገኘኸውን ረጅም anon key አስገባ
const supabaseUrl = 'https://avedmreofsmzlrhdxuhq.supabase.co'; 
const supabaseKey = 'YOUR_SUPABASE_KEY'; 
const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ዋና መረጃዎች ---
const ADMIN_ID = 1046142540; // ያንተ ID
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png'; // አዲሱ ሎጎ
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

// --- ቦቱ ሲጀመር (Start) ---
bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id;
        const displayUsername = ctx.from.username || ctx.from.first_name || `User_${userId}`;

        // ተጫዋቹን ዳታቤዝ ውስጥ ይመዘግባል (Upsert)
        await supabase.from('users').upsert(
            { id: userId, username: displayUsername }, 
            { onConflict: 'id' }
        );

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
    } catch (err) { console.error("Start Error:", err); }
});

// --- Deposit Logic ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Here are the min you can deposit` \n*Min Amount: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን ይላኩ፦');
});

// መጠን ሲላክ
bot.on('text', async (ctx) => {
    const amount = parseInt(ctx.message.text);
    if (!isNaN(amount) && amount >= 50) {
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${amount} ETB*\n\nከታች ያለውን "Manual-Payment" በመጫን ክፍያ ይፈጽሙ። ሲጨርሱ ደረሰኝ ይላኩ።`, 
            Markup.inlineKeyboard([[Markup.button.webApp('Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }
});

// --- 1. ተጠቃሚው ፎቶ (ደረሰኝ) ሲልክ ---
bot.on(['photo', 'document'], async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name;

    await ctx.reply('እባክዎ አድሚን @NY112YW እስከሚያጸድቀው ድረስ ትንሽ ይጠብቁ።');

    // ደረሰኙን ለአድሚኑ Forward ያደርጋል
    await ctx.forwardMessage(ADMIN_ID); 
    
    await bot.telegram.sendMessage(ADMIN_ID, `🔔 *አዲስ የክፍያ ጥያቄ*\n\nተጠቃሚ: ${userName}\nID: \`${userId}\``, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve 50 ETB', `approve_${userId}_50`)],
            [Markup.button.callback('✅ Approve 100 ETB', `approve_${userId}_100`)],
            [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
        ])
    });
});

// --- 2. አድሚኑ Approve ሲነካ ---
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    try {
        // የድሮውን ባላንስ ማንበብ
        const { data: user } = await supabase.from('users').select('balance').eq('id', targetUserId).single();
        const newBalance = (user?.balance || 0) + amount;

        // ባላንስ ማደስ
        await supabase.from('users').update({ balance: newBalance }).eq('id', targetUserId);

        // ለተጠቃሚው ማሳወቅ
        await bot.telegram.sendMessage(targetUserId, `✅ ክፍያዎ ጸድቋል! *${amount} ETB* በሂሳብዎ ላይ ተጨምሯል።`, { parse_mode: 'Markdown' });
        
        await ctx.answerCbQuery('ተጽድቋል!');
        return ctx.editMessageText(`✅ ለተጠቃሚ \`${targetUserId}\` *${amount} ETB* ጨምረሃል።`, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error(err);
        ctx.answerCbQuery('ስህተት ተፈጥሯል!');
    }
});

// --- 3. አድሚኑ Cancel ሲነካ ---
bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await bot.telegram.sendMessage(targetUserId, `❌ ይቅርታ፣ የላኩት የክፍያ ማረጋገጫ ተቀባይነት አላገኘም። እባክዎ @NY112YW ያነጋግሩ።`);
    await ctx.answerCbQuery('ተሰርዟል');
    return ctx.editMessageText(`❌ የID \`${targetUserId}\` ጥያቄ ውድቅ ተደርጓል።`);
});

// --- Balance የማየት Logic ---
bot.action('balance', async (ctx) => {
    try {
        const { data } = await supabase.from('users').select('balance').eq('id', ctx.from.id).single();
        return ctx.reply(`💰 ያላችሁ ቀሪ ሂሳብ: ${data?.balance || 0} ETB`);
    } catch (e) { console.error(e); }
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is UPDATED and running..."));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
