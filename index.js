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

const ADMIN_ID = 'YOUR_TELEGRAM_USER_ID'; // እዚህ ጋር ያንተን የቴሌግራም ID አስገባ
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';
const LOGO_URL = 'https://kingtattoo-et.github.io/Ardi-payment/ardi%20logo.png.png';

bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id;
        const displayUsername = ctx.from.username || ctx.from.first_name || `User_${userId}`;

        await supabase.from('users').upsert(
            { id: userId, username: displayUsername }, 
            { onConflict: 'id' }
        );

        const welcomeMessage = `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts – Grab Your Cartela, Join The Game, and Let the Fun Begin!*`;

        return ctx.replyWithPhoto(
            { url: LOGO_URL },
            {
                caption: welcomeMessage,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎮 Play Now', 'play')],
                    [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
                    [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('📕 Instructions', 'instructions')],
                    [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('Win Patterns 🖼', 'patterns')],
                    [Markup.button.callback('👤 Change Username', 'username_change'), Markup.button.callback('🏆 Leaderboard', 'leaderboard')]
                ])
            }
        ).catch(() => ctx.reply(welcomeMessage, { parse_mode: 'Markdown' }));
    } catch (err) { console.error(err); }
});

// --- Deposit Logic ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Here are the min you can deposit` \n*Min Amount: 50 ETB*\n\nእባክዎ ማስገባት የሚፈልጉትን መጠን ይላኩ (ለምሳሌ፦ 100)');
});

// መጠን ሲላክ የሚሰራ
bot.on('text', async (ctx) => {
    const amount = parseInt(ctx.message.text);
    if (!isNaN(amount) && amount >= 50) {
        return ctx.replyWithMarkdown(`የመረጡት መጠን: *${amount} ETB*\n\nእባክዎ ከታች ያለውን በመንካት Deposit ማድረጉን ይቀጥሉ፤ ከዚያም የደረሰኝ ቁጥር ወይም Screenshot ይላኩ።`, 
            Markup.inlineKeyboard([
                [Markup.button.webApp('Manual-Payment', PAYMENT_WEB_URL)]
            ])
        );
    }
});

// ማረጋገጫ ሲላክ (ፎቶ ወይም ጽሁፍ)
bot.on(['photo', 'document'], async (ctx) => {
    await ctx.reply('እባክዎ አድሚን @NY112YW እስከሚያጸድቀው ድረስ ትንሽ ይጠብቁ።');
    
    // ለአድሚኑ ማሳወቅ
    await bot.telegram.sendMessage(ADMIN_ID, `🔔 *አዲስ የክፍያ ጥያቄ*\n\nተጠቃሚ: ${ctx.from.first_name}\nID: ${ctx.from.id}\n\nእባክዎ ክፍያውን አረጋግጠው በ Supabase ላይ Balance ይጨምሩ።`, { parse_mode: 'Markdown' });
});

bot.action('balance', async (ctx) => {
    try {
        const { data } = await supabase.from('users').select('*').eq('id', ctx.from.id).single();
        ctx.answerCbQuery();
        return ctx.replyWithMarkdown(`👤 *መለያ:* ${data?.username}\n💰 *ቀሪ ሂሳብ:* ${data?.balance || 0} ETB\n🪙 *ኮይን:* ${data?.coin || 0}`);
    } catch (e) { console.error(e); }
});

bot.action('support', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('📞 ለእርዳታ አድሚኑን ያነጋግሩ፦ @NY112YW');
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is UPDATED and LIVE!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
