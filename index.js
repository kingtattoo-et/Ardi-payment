const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(port, () => console.log(`Server listening on port ${port}`));

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ቦቱ ሲጀመር (Start Menu) ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const defaultUsername = ctx.from.username || `User_${userId}`;

    try {
        await supabase.from('users').upsert({ id: userId, username: defaultUsername }, { onConflict: 'id' });

        const welcomeMessage = `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts – Grab Your Cartela, Join The Game, and Let the Fun Begin!*`;
        
        // ፎቶውን እና በተኖቹን አንድ ላይ ለመላክ
        const photoUrl = 'https://imgur.com/your-image-url.jpg'; // እዚህ ጋር የቢንጎ ፎቶ ሊንክ ማስገባት ትችላለህ

        return ctx.replyWithPhoto(
            { url: 'https://i.ibb.co/v4m0YmC/bingo-banner.jpg' }, // ናሙና ፎቶ
            {
                caption: welcomeMessage,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎮 Play Now', 'play')],
                    [
                        Markup.button.callback('💰 Check Balance', 'balance'),
                        Markup.button.callback('💵 Make a Deposit', 'deposit')
                    ],
                    [
                        Markup.button.callback('Support 📞', 'support'),
                        Markup.button.callback('📕 Instructions', 'instructions')
                    ],
                    [
                        Markup.button.callback('✉️ Invite', 'invite'),
                        Markup.button.callback('Win Patterns 🖼', 'patterns')
                    ],
                    [
                        Markup.button.callback('👤 Change Username', 'username_change'),
                        Markup.button.callback('🏆 Leaderboard', 'leaderboard')
                    ]
                ])
            }
        );
    } catch (err) {
        console.error("Start Error:", err);
    }
});

// --- እያንዳንዱ በተን ሲነካ የሚሰጠው ምላሽ ---

bot.action('play', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('🎮 የጨዋታው ክፍል በቅርብ ቀን ይከፈታል! እስከዚያው አካውንትዎን ይሙሉ።');
});

bot.action('balance', async (ctx) => {
    ctx.answerCbQuery();
    const { data } = await supabase.from('users').select('*').eq('id', ctx.from.id).single();
    return ctx.replyWithMarkdown(`👤 *መለያ ስም:* ${data?.username}\n💰 *ቀሪ ሂሳብ:* ${data?.balance || 0} ETB\n🪙 *ኮይን:* ${data?.coin || 0}`);
});

bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('💵 ገንዘብ ለማስገባት የሚፈልጉትን መጠን በቁጥር ይላኩ (ለምሳሌ፡ 100)');
});

bot.action('support', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('📞 ለእርዳታ አድሚኑን ያነጋግሩ፦ @YourAdminUsername');
});

bot.action('instructions', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('📕 ቢንጎ እንዴት እንደሚጫወት፡\n1. ካርታ ይግዙ\n2. ቁጥሮች ሲጠሩ ምልክት ያድርጉ\n3. ቀድመው ከጨረሱ ያሸንፋሉ!');
});

bot.action('invite', (ctx) => {
    ctx.answerCbQuery();
    const inviteLink = `https://t.me/ArdiiiBingoBot?start=${ctx.from.id}`;
    return ctx.reply(`✉️ ጓደኞችዎን ይጋብዙ እና በየሰው 5 ኮይን ያግኙ!\n\nየእርስዎ መጋበዣ ሊንክ፦\n${inviteLink}`);
});

bot.launch();
