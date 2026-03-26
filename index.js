const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// 1. የ Express Setup (ለ Render Port ስህተት መፍትሄ)
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Ardi Bingo Bot is running and connected to Supabase!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// 2. የ Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. የቦት Setup
const bot = new Telegraf('8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw');

// የአድሚን ቴሌግራም ID
const ADMIN_ID = '6633658514'; 

// --- ቦቱ ሲጀመር (Start Menu) ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const defaultUsername = ctx.from.username || `User_${userId}`;

    // ተጠቃሚውን ዳታቤዝ ውስጥ መመዝገብ ወይም መረጃውን ማምጣት
    const { data, error } = await supabase
        .from('users')
        .upsert({ id: userId, username: defaultUsername }, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error('Supabase Start Error:', error);
        return ctx.reply("❌ የዳታቤዝ ግንኙነት ችግር አጋጥሟል።");
    }

    const welcomeMessage = `*እንኳን ወደ Ardi Bingo በሰላም መጡ!* \n\n*የእርስዎ መለያ ስም:* ${data.username}\n\nተወዳጁን የቢንጎ ጨዋታ በቤትዎ ይሁኑ ይጫወቱ። በ90 ሰከንድ በሚደረግ ጨዋታ ዕድልዎን ይሞክሩ!`;
    
    ctx.replyWithMarkdown(welcomeMessage, 
        Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Play Now', 'play')],
            [
                Markup.button.callback('💰 Check Balance', 'balance'),
                Markup.button.callback('💵 Make a Deposit', 'deposit')
            ],
            [
                Markup.button.callback('📞 Support', 'support'),
                Markup.button.callback('📖 Instructions', 'instructions')
            ],
            [
                Markup.button.callback('📩 Invite', 'invite'),
                Markup.button.callback('🏆 Leaderboard', 'leaderboard')
            ],
            [
                Markup.button.callback('👤 Change Username', 'username_change'),
                Markup.button.callback('🖼 Win Patterns', 'patterns')
            ]
        ])
    );
});

// --- ከ WebApp የሚመጣ የክፍያ ዳታ መቀበያ ---
bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.webAppData.data.json());
        const user = ctx.from;

        await ctx.replyWithMarkdown(`✅ *የክፍያ መረጃ ደርሶናል!*\n\n*ባንክ:* ${data.bank}\n*መረጃው:* ${data.message}\n\nእባክዎ መረጃው በአድሚን ተረጋግጦ እስኪጨመር ድረስ በትዕግስት ይጠብቁ።`);

        await ctx.telegram.sendMessage(ADMIN_ID, 
            `🔔 *አዲስ የክፍያ ጥያቄ!*\n\n` +
            `👤 *ከ:* @${user.username || user.first_name}\n` +
            `🆔 *ID:* \`${user.id}\` \n` +
            `🏦 *ባንክ:* ${data.bank}\n` +
            `📝 *SMS:* \`${data.message}\``,
            { parse_mode: 'Markdown' }
        );

    } catch (e) {
        console.error("WebAppData Error:", e);
        ctx.reply("❌ መረጃውን በማስተናገድ ላይ ስህተት ተፈጥሯል።");
    }
});

// --- በተኖቹ ሲነኩ ከ Supabase መረጃ ማምጣት ---
bot.action('balance', async (ctx) => {
    const userId = ctx.from.id;
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    ctx.answerCbQuery();

    if (error || !data) {
        return ctx.reply("❌ መረጃዎን ማግኘት አልተቻለም።");
    }

    const balanceMsg = `👤 *Username:* ${data.username}\n💰 *Balance:* ${parseFloat(data.balance).toFixed(2)} ETB\n🪙 *Coin:* ${parseFloat(data.coin).toFixed(2)}`;
    ctx.replyWithMarkdown(balanceMsg);
});

bot.action('deposit', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(`📥 *ትንሹ ተቀማጭ መጠን:* 50 ETB\n\nእባክዎ ማስገባት የሚፈልጉትን የገንዘብ መጠን ይጻፉ (ምሳሌ: 100)`);
});

// ተጠቃሚው መጠን ሲያስገባ
bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    if (!isNaN(text) && Number(text) >= 50) {
        const paymentUrl = "https://kingtattoo-et.github.io/Ardi-payment/"; 
        
        ctx.reply(`ተቀማጭ መጠን፦ ${text} ETB\n\nእባክዎ ከታች ያለውን በተን ተጭነው ክፍያውን ይፈጽሙ፦`, 
            Markup.inlineKeyboard([
                [Markup.button.webApp('💳 Manual-Payment', paymentUrl)]
            ])
        );
    } 
    else if (!isNaN(text) && Number(text) < 50) {
        ctx.reply("❌ ትንሹ ተቀማጭ መጠን 50 ETB ነው። እባክዎ ከ50 በላይ የሆነ ቁጥር ያስገቡ።");
    }
});

// --- ስም መቀየር (ወደ Supabase ሴቭ ያደርጋል) ---
bot.action('username_change', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('እባክዎ አዲሱን መለያ ስም በዚሁ መልክ ይላኩ፦\n/setname ያንተ_ስም');
});

bot.command('setname', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const newName = args[1];
    const userId = ctx.from.id;

    if (newName) {
        const { error } = await supabase
            .from('users')
            .update({ username: newName })
            .eq('id', userId);

        if (error) {
            return ctx.reply("❌ ስም መቀየር አልተሳካም።");
        }
        ctx.reply(`✅ ስምዎ ወደ *${newName}* ተቀይሯል!`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply("❌ እባክዎ ስም በትክክል ያስገቡ። ምሳሌ፦ /setname Abebe");
    }
});

// ቦቱን ማስነሻ
bot.launch().then(() => console.log("Ardi Bingo Bot is LIVE with Supabase on Render!"));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
