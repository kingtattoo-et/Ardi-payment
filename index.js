const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(port, () => console.log(`Health check server listening on port ${port}`));

const supabaseUrl = 'https://avedmreofsmzlrhdxuhq.supabase.co'; 
const supabaseKey = 'YOUR_SUPABASE_KEY'; // የአንተን Key እዚህ አስገባ
const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// ያንተ የክፍያ ድህረ ገጽ ሊንክ
const PAYMENT_WEB_URL = 'https://kingtattoo-et.github.io/Ardi-payment/';

bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id;
        const displayUsername = ctx.from.username || ctx.from.first_name || `User_${userId}`;

        await supabase.from('users').upsert(
            { id: userId, username: displayUsername }, 
            { onConflict: 'id' }
        );

        const welcomeMessage = `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts – Grab Your Cartela, Join The Game, and Let the Fun Begin!*`;
        const logoUrl = 'https://i.ibb.co/3mNfKxY/ardi-logo-png.png'; 

        return ctx.replyWithPhoto(
            { url: logoUrl },
            {
                caption: welcomeMessage,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎮 Play Now', 'play')],
                    [Markup.button.callback('💰 Check Balance', 'balance'), 
                     // እዚህ ጋር ነው ወደ ድህረ ገጽ የሚወስደው በተን የተቀየረው
                     Markup.button.webApp('💵 Make a Deposit', PAYMENT_WEB_URL)],
                    [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('📕 Instructions', 'instructions')],
                    [Markup.button.callback('✉️ Invite', 'invite'), Markup.button.callback('Win Patterns 🖼', 'patterns')],
                    [Markup.button.callback('👤 Change Username', 'username_change'), Markup.button.callback('🏆 Leaderboard', 'leaderboard')]
                ])
            }
        ).catch(() => ctx.reply(welcomeMessage, { parse_mode: 'Markdown' }));
    } catch (err) {
        console.error("Start Error:", err);
    }
});

// Balance ማሳያ
bot.action('balance', async (ctx) => {
    try {
        const { data } = await supabase.from('users').select('*').eq('id', ctx.from.id).single();
        ctx.answerCbQuery();
        const currentName = data?.username || ctx.from.first_name || "User";
        return ctx.replyWithMarkdown(`👤 *መለያ ስም:* ${currentName}\n💰 *ቀሪ ሂሳብ:* ${data?.balance || 0} ETB\n🪙 *ኮይን:* ${data?.coin || 0}`);
    } catch (e) { console.error(e); }
});

bot.action('support', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('📞 ለእርዳታ አድሚኑን ያነጋግሩ፦ @ArdiiiBingoBot');
});

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is LIVE with Web App Deposit!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
