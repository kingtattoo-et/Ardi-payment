const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// 1. Express Setup (ለ Render ጤንነት ብቻ)
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(port, () => console.log(`Server running on port ${port}`));

// 2. Supabase Setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 3. Bot Setup (በ Polling መንገድ)
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

bot.start(async (ctx) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .upsert({ id: ctx.from.id, username: ctx.from.username || 'User' })
            .select().single();
        
        ctx.replyWithMarkdown(`*እንኳን ወደ Ardi Bingo መጡ!*`, Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [Markup.button.callback('💰 Balance', 'balance')]
        ]));
    } catch (e) { console.log(e); }
});

bot.action('balance', async (ctx) => {
    const { data } = await supabase.from('users').select('*').eq('id', ctx.from.id).single();
    ctx.reply(`የእርስዎ ቀሪ ሂሳብ: ${data?.balance || 0} ETB`);
});

// በ Polling አስነሳው (ይህ መንገድ ዌብሁክ አያስፈልገውም)
bot.launch();
console.log("Bot is polling for messages...");
