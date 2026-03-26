const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(process.env.PORT || 10000);

// --- 1. Supabase Setup ---
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

        // ተጠቃሚውን መመዝገብ
        await supabase.from('users').upsert({ id: userId, username: displayUsername }, { onConflict: 'id' });

        return ctx.replyWithPhoto({ url: LOGO_URL }, {
            caption: `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts – Grab Your Cartela, Join The Game, and Let the Fun Begin!*`,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🎮 Play Now', 'play')],
                [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
                [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('✉️ Invite', 'invite')]
            ])
        });
    } catch (err) { console.error(err); }
});

// --- 4. Deposit Logic ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Deposit Amount` \n*Min Amount: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን በቁጥር ብቻ ይላኩ (ለምሳሌ፦ 100)');
});

// --- 5. መረጃ መቀበያ (Text Handling) ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgText = ctx.message.text;

    // ሀ. ተጠቃሚው መጠን (Amount) ሲልክ
    if (!isNaN(msgText) && parseInt(msgText) >= 50) {
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${msgText} ETB*\n\nከታች ያለውን "Manual-Payment" በመጫን ክፍያ ይፈጽሙ። ሲጨርሱ የባንኩን SMS እዚህ "Paste" አድርገው ይላኩ።`, 
            Markup.inlineKeyboard([[Markup.button.webApp('Manual-Payment', PAYMENT_WEB_URL)]])
        );
    }

    // ለ. ተጠቃሚው የባንክ SMS/ጽሁፍ ሲልክ (Verification)
    try {
        // መረጃውን ዳታቤዝ ውስጥ ማስቀመጥ
        const { data, error } = await supabase.from('deposit_requests').insert({
            user_id: userId,
            verification_text: msgText,
            amount: 100 // ይህንን እንደ አስፈላጊነቱ ማስተካከል ይቻላል
        }).select().single();

        if (error) throw error;

        await ctx.reply('እናመሰግናለን! መረጃው ለአድሚን ተልኳል። እስከሚጸድቅ ድረስ ትንሽ ይጠብቁ።');

        // ለአድሚኑ (ላንተ) መልዕክት ይላካል
        await bot.telegram.sendMessage(ADMIN_ID, `🔔 *አዲስ የክፍያ ጥያቄ*\n\n👤 ተጠቃሚ: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n\n📝 *የባንክ SMS:* \n\`${msgText}\``, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Approve 100 ETB', `approve_${data.id}`)],
                [Markup.button.callback('❌ Cancel', `cancel_${data.id}`)]
            ])
        });
    } catch (e) {
        console.error("Submission Error:", e);
        if (e.code === '23503') {
            await ctx.reply("እባክዎ መጀመሪያ /start ብለው ቦቱን ያስጀምሩ።");
        }
    }
});

// --- 6. አድሚን Approve/Cancel ሲያደርግ ---
bot.action(/approve_(.+)/, async (ctx) => {
    const requestId = ctx.match[1];
    try {
        const { data: req } = await supabase.from('deposit_requests').select('*').eq('id', requestId).single();
        if (!req || req.status !== 'pending') return ctx.answerCbQuery('ይህ ጥያቄ ቀድሞ ተሰርቷል!');

        // ባላንስ መጨመር
        const { data: user } = await supabase.from('users').select('balance').eq('id', req.user_id).single();
        const newBalance = (user?.balance || 0) + req.amount;
        
        await supabase.from('users').update({ balance: newBalance }).eq('id', req.user_id);
        await supabase.from('deposit_requests').update({ status: 'approved' }).eq('id', requestId);

        await bot.telegram.sendMessage(req.user_id, `✅ የላኩት መረጃ ተረጋግጦ *${req.amount} ETB* ወደ አካውንትዎ ገብቷል!`);
        ctx.answerCbQuery('ጸድቋል!');
        return ctx.editMessageText(`✅ የID \`${req.user_id}\` ክፍያ ጸድቋል።`);
    } catch (err) { console.error(err); }
});

bot.action(/cancel_(.+)/, async (ctx) => {
    const requestId = ctx.match[1];
    await supabase.from('deposit_requests').update({ status: 'canceled' }).eq('id', requestId);
    ctx.answerCbQuery('ተሰርዟል');
    return ctx.editMessageText('❌ ይህ የክፍያ ጥያቄ ውድቅ ተደርጓል።');
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is RUNNING..."));
