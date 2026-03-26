const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// 1. የ Express Setup (ለ Render Health Check)
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Ardi Bingo is LIVE!'));
app.listen(port, () => console.log(`Server listening on port ${port}`));

// 2. የ Supabase Setup
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. የቦት Setup
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// --- ቦቱ ሲጀመር (Start Menu) ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    // Username ከሌለው First Name ይጠቀማል፣ ያ ካልሆነ User_ID ይጠቀማል
    const displayUsername = ctx.from.username || ctx.from.first_name || `User_${userId}`;

    try {
        // ተጠቃሚውን ዳታቤዝ ውስጥ መመዝገብ
        const { data, error } = await supabase
            .from('users')
            .upsert({ id: userId, username: displayUsername }, { onConflict: 'id' })
            .select()
            .single();

        const welcomeMessage = `🎉 *Welcome To Ardi Bingo!* 🎉\n\n🕹 *Every Square Counts – Grab Your Cartela, Join The Game, and Let the Fun Begin!*`;
        
        // በ imgbb የሰጠኸው የሎጎ ሊንክ
        const logoUrl = 'https://i.ibb.co/3mNfKxY/ardi-logo-png.png'; 

        return ctx.replyWithPhoto(
            { url: logoUrl },
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

// --- በተኖች ሲነኩ የሚሰጡ ምላሾች ---

bot.action('balance', async (ctx) => {
    try {
        const { data } = await supabase.from('users').select('*').eq('id', ctx.from.id).single();
        ctx.answerCbQuery();
        // እዚህ ጋርም undefined እንዳይል ጥንቃቄ ተደርጓል
        const currentName = data?.username || ctx.from.first_name || "User";
        return ctx.replyWithMarkdown(`👤 *መለያ ስም:* ${currentName}\n💰 *ቀሪ ሂሳብ:* ${data?.balance || 0} ETB\n🪙 *ኮይን:* ${data?.coin || 0}`);
    } catch (e) {
        console.error("Balance Error:", e);
    }
});

bot.action('play', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('🎮 የጨዋታው ክፍል በቅርብ ቀን ይከፈታል! እስከዚያው አካውንትዎን ይሙሉ።');
});

bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    return ctx.replyWithMarkdown(`📥 *ትንሹ ተቀማጭ መጠን:* 50 ETB\n\nእባክዎ ማስገባት የሚፈልጉትን የገንዘብ መጠን ይጻፉ (ምሳሌ: 100)`);
});

bot.action('support', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('📞 ለእርዳታ አድሚኑን ያነጋግሩ፦ @ArdiiiBingoBot');
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

bot.action('username_change', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('እባክዎ አዲሱን መለያ ስም በዚሁ መልክ ይላኩ፦\n/setname ያንተ_ስም');
});

bot.action('patterns', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('🖼 የሚያሸልሙ የቢንጎ Patterns ዝርዝር በቅርብ ቀን ይጠናቀቃል።');
});

bot.action('leaderboard', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('🏆 የከፍተኛ አሸናፊዎች ዝርዝር (Leaderboard) በቅርብ ቀን ይጀመራል።');
});

// --- ስም መቀየር ኮማንድ ---
bot.command('setname', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const newName = args[1];
    if (newName) {
        const { error } = await supabase.from('users').update({ username: newName }).eq('id', ctx.from.id);
        if (error) return ctx.reply("❌ ስም መቀየር አልተሳካም።");
        return ctx.reply(`✅ ስምዎ ወደ *${newName}* ተቀይሯል!`, { parse_mode: 'Markdown' });
    }
    return ctx.reply("❌ እባክዎ ስም በትክክል ያስገቡ። ምሳሌ፦ /setname Abebe");
});

// ቦቱን አስነሳው
bot.launch().then(() => {
    console.log("🚀 Ardi Bingo Bot is LIVE and Polling!");
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
