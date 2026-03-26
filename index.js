const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// 1. የ Express Setup
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(port, () => console.log(`Health check server listening on port ${port}`));

// 2. የ Supabase Setup
const supabaseUrl = 'https://avedmreofsmzlrhdxuhq.supabase.co'; 
const supabaseKey = 'YOUR_SUPABASE_KEY'; // እዚህ ጋር ቁልፍህን አስገባ
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. የቦት Setup
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- Start Menu ---
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
                    [Markup.button.callback('💰 Check Balance', 'balance'), Markup.button.callback('💵 Make a Deposit', 'deposit')],
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

// --- Deposit Process (Ende image 1) ---
bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown('`Here are the min you can deposit` \n*Min Amount: 50 ETB*', 
        Markup.inlineKeyboard([
            [Markup.button.callback('Manual-Payment', 'manual_payment')]
        ])
    );
});

// --- Manual Payment Options (Ende image 2) ---
bot.action('manual_payment', (ctx) => {
    ctx.answerCbQuery();
    const paymentText = `*Manual Deposit*\n\nSelect your bank to deposit funds`;
    return ctx.replyWithMarkdown(paymentText, 
        Markup.inlineKeyboard([
            [Markup.button.callback('CBE Bank', 'bank_details')],
            [Markup.button.callback('CBE Birr', 'bank_details')],
            [Markup.button.callback('Telebirr', 'bank_details')]
        ])
    );
});

// --- Final Bank Details (Ende image 3) ---
bot.action('bank_details', (ctx) => {
    ctx.answerCbQuery();
    const bankInfo = `*Deposit Details*\n\n` +
        `👤 *Name:* YORDANOS\n` +
        `💳 *Account:* \`1000277987067\` (Click to copy)\n` +
        `📱 *Phone:* \`0979429028\`\n\n` +
        `1. ከላይ ባለው አካውንት ብር ያስገቡ\n` +
        `2. የደረሰኝ ቁጥር ወይም Screenshot ለ @ArdiiiBingoBot ይላኩ።`;
    
    return ctx.replyWithMarkdown(bankInfo);
});

// --- Other Buttons ---
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

bot.launch().then(() => console.log("🚀 Ardi Bingo Bot is LIVE with Manual Deposit!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
