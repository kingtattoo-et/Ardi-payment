const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

// --- 1. Supabase Setup (አሁን ያንተን Key ተጠቅሟል) ---
const supabaseUrl = 'https://avedmreofsmzlrhdxuhq.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZWRtcmVvZnNtemxyaGR4dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzkxMDAsImV4cCI6MjA5MDAxNTEwMH0.DKzWuogMIo9_tHsyw9xF9-9CZuEUzLq_VENvOY6gQAY'; 
const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- 2. ዋና መረጃዎች ---
const ADMIN_ID = 1046142540; // ያንተ ID
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

// --- 3. ቦቱ ሲጀመር (Start) ---
bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id;
        const displayUsername = ctx.from.username || ctx.from.first_name || `User_${userId}`;

        // ተጫዋቹን ዳታቤዝ ውስጥ ይመዘግባል
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
                [Markup.button.callback('Support 📞', 'support')],
                [Markup.button.callback('✉️ Invite', 'invite')]
            ])
        });
    } catch (err) { console.error("Start Error:", err); }
});

// --- 4. Deposit Logic ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min Amount: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን ይላኩ (ለምሳሌ፦ 100)');
});

bot.on('text', async (ctx) => {
    const amount = parseInt(ctx.message.text);
    if (!isNaN(amount) && amount >= 50) {
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${amount} ETB*\n\nከታች ያለውን "Manual-Payment" በመጫን ክፍያ ይፈጽሙ። ሲጨርሱ ደረሰኝ (ፎቶ) ይላኩ።`, 
            Markup.inlineKeyboard([[Markup.button.webApp('Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }
});

// --- 5. የማረጋገጫ ሂደት (ለአድሚን መልዕክት የሚላክበት) ---
bot.on(['photo', 'document'], async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name;

    // ለተጫዋቹ የሚሰጥ ምላሽ
    await ctx.reply('እባክዎ አድሚን @NY112YW እስከሚያጸድቀው ድረስ ትንሽ ይጠብቁ።');

    // ፎቶውን ለአድሚኑ Forward ያደርጋል
    try {
        await ctx.forwardMessage(ADMIN_ID); 
        
        // ለአድሚኑ የሚላኩ በተኖች
        await bot.telegram.sendMessage(ADMIN_ID, `🔔 *አዲስ የክፍያ ጥያቄ*\n\nተጠቃሚ: ${userName}\nID: \`${userId}\``, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Approve 50 ETB', `approve_${userId}_50`)],
                [Markup.button.callback('✅ Approve 100 ETB', `approve_${userId}_100`)],
                [Markup.button.callback('❌ Cancel', `cancel_${userId}`)]
            ])
        });
    } catch (e) {
        console.error("Admin ID Error:", e);
    }
});

// --- 6. Admin Actions (Approve/Cancel) ---
bot.action(/approve_(\d+)_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    try {
        const { data: user } = await supabase.from('users').select('balance').eq('id', targetUserId).single();
        const newBalance = (user?.balance || 0) + amount;

        await supabase.from('users').update({ balance: newBalance }).eq('id', targetUserId);

        await bot.telegram.sendMessage(targetUserId, `✅ ክፍያዎ ጸድቋል! *${amount} ETB* በሂሳብዎ ላይ ተጨምሯል።`);
        ctx.answerCbQuery('ተጽድቋል!');
        return ctx.editMessageText(`✅ ለተጠቃሚ \`${targetUserId}\` *${amount} ETB* ጨምረሃል።`);
    } catch (err) {
        console.error(err);
        ctx.answerCbQuery('ስህተት!');
    }
});

bot.action(/cancel_(\d+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await bot.telegram.sendMessage(targetUserId, `❌ ይቅርታ፣ የላኩት የክፍያ ማረጋገጫ ተቀባይነት አላገኘም።`);
    ctx.answerCbQuery('ተሰርዟል');
    return ctx.editMessageText(`❌ የID \`${targetUserId}\` ጥያቄ ውድቅ ተደርጓል።`);
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is LIVE and Connected to Supabase!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
