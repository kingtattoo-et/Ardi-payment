const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

// የቦት ቶከን
const BOT_TOKEN = '8684712579:AAFGw1U396jIv-i1FjW57vRyyKy1ahcUCQw';
const bot = new Telegraf(BOT_TOKEN);

// Express አፕሊኬሽን
const app = express();
const PORT = process.env.PORT || 3000;

// ሚድልዌር
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'ardi-bingo-secret-2024',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// ============= የተጠቃሚ ዳታቤዝ =============
const users = new Map();
let activeGames = new Map(); // ንቁ ጨዋታዎችን ለማስተዳደር
let gameIdCounter = 614200;

// አዲስ ተጠቃሚ መፍጠር
function initUser(userId, username = '') {
    if (!users.has(userId)) {
        users.set(userId, {
            id: userId,
            username: username,
            balance: 0, // ባልንስ በመጀመሪያ 0
            totalWon: 0,
            totalLost: 0,
            gamesPlayed: 0,
            currentStake: 0,
            activeGame: null,
            referralCode: generateReferralCode(userId),
            referredBy: null
        });
    }
    return users.get(userId);
}

// ሪፈራል ኮድ ማመንጨት
function generateReferralCode(userId) {
    return userId.toString().slice(-6);
}

// ሂሳብ ማሳየት
function formatBalance(balance) {
    return `${balance} ETB`;
}

// የጨዋታ ሽልማት ማስላት (stake amount * 0.85 * total selected card)
function calculateWinAmount(stake, cardsSelected) {
    return Math.floor(stake * 0.85 * cardsSelected);
}

// ============= የኪቦርድ ሜኑዎች =============

// ዋና ሜኑ (Image 1 ላይ እንደሚታየው)
const mainMenu = Markup.inlineKeyboard([
    [Markup.button.callback('🎮 Play Now', 'play_now')],
    [Markup.button.callback('💰 Check Balance', 'check_balance')],
    [Markup.button.callback('💳 Make a Deposit', 'deposit')],
    [Markup.button.callback('📊 Leaderboard', 'leaderboard')],
    [Markup.button.callback('🎯 Win Patterns', 'patterns')],
    [Markup.button.callback('👤 Change Username', 'change_username')],
    [Markup.button.callback('❓ Instructions', 'instructions')],
    [Markup.button.callback('📞 Support', 'support')],
    [Markup.button.callback('📨 Invite Friend', 'invite')]
]);

// የStake ምርጫ ሜኑ (Image 1 ላይ እንደሚታየው 10, 20, 50 ETB)
function getStakeMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🔴 10 ETB', 'stake_10'),
            Markup.button.callback('🟡 20 ETB', 'stake_20'),
            Markup.button.callback('🟢 50 ETB', 'stake_50')
        ],
        [Markup.button.callback('🔙 Back to Menu', 'main_menu')]
    ]);
}

// የካርድ ምርጫ ሜኑ (ምን ያህል ካርዶች መጫወት እንደሚፈልጉ)
function getCardSelectionMenu(stake) {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('1 Card', `cards_1_${stake}`),
            Markup.button.callback('2 Cards', `cards_2_${stake}`),
            Markup.button.callback('3 Cards', `cards_3_${stake}`)
        ],
        [
            Markup.button.callback('4 Cards', `cards_4_${stake}`),
            Markup.button.callback('5 Cards', `cards_5_${stake}`)
        ],
        [Markup.button.callback('🔙 Back to Stake', 'play_now')]
    ]);
}

// ============= የቦት ኮማንዶች =============

// /start ኮማንድ
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const user = initUser(userId, username);
    
    // ሪፈራል ቼክ
    const referrerId = ctx.startPayload;
    if (referrerId && referrerId !== userId.toString() && !user.referredBy) {
        const referrer = users.get(referrerId);
        if (referrer) {
            user.referredBy = referrerId;
            user.balance += 50;
            referrer.balance += 100;
            await ctx.reply(`🎉 በ${referrer.username} አመጡ! 50 ETB ቦነስ ተጨምሯል!`);
        }
    }
    
    const welcomeMessage = `
🎉 *Welcome to Ardi Bingo!* 🎉

ሰላም ${ctx.from.first_name}! 👋

✨ *Every Square Counts* ✨
ካርቴላህን ያዝ፣ ጨዋታውን ተቀላቀል፣ እና ደስታው ይጀምር! 🚀

💰 ቀሪ ሂሳብ: ${formatBalance(user.balance)}

ከታች ካሉ አማራጮች መምረጥ ትችላለህ፡
    `;
    
    await ctx.replyWithMarkdown(welcomeMessage, mainMenu);
});

// ============= ካልቤክ ኳሪ ሃንድለሮች =============

// Play Now - Stake ምርጫ ያሳያል
bot.action('play_now', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        '🎲 *Choose Your Stake* 🎲\n\nትልቁ ውርርድ፣ ትልቁ ሽልማት!\n\nየምትጫወትበትን መጠን ምረጥ:',
        {
            parse_mode: 'Markdown',
            ...getStakeMenu()
        }
    );
});

// Stake ምርጫዎች - ከዚህ በኋላ ምን ያህል ካርድ እንደሚፈልጉ ይጠይቃል
bot.action('stake_10', async (ctx) => handleStake(ctx, 10));
bot.action('stake_20', async (ctx) => handleStake(ctx, 20));
bot.action('stake_50', async (ctx) => handleStake(ctx, 50));

async function handleStake(ctx, amount) {
    const userId = ctx.from.id;
    const user = initUser(userId);
    
    if (user.balance < amount) {
        await ctx.answerCbQuery('❌ በቂ ሂሳብ የለህም! እባክህ ገንዘብ አስገባ።', { show_alert: true });
        return;
    }
    
    user.currentStake = amount;
    
    await ctx.editMessageText(
        `✅ *Stake Selected: ${amount} ETB*\n\n` +
        `📊 ምን ያህል ካርዶች መጫወት ትፈልጋለህ?\n\n` +
        `💡 ብዙ ካርዶች = የማሸነፍ እድል ይጨምራል!\n\n` +
        `💰 ቀሪ ሂሳብ: ${formatBalance(user.balance - amount)}`,
        {
            parse_mode: 'Markdown',
            ...getCardSelectionMenu(amount)
        }
    );
}

// ካርድ ምርጫዎች
bot.action(/cards_(\d+)_(\d+)/, async (ctx) => {
    const cardsCount = parseInt(ctx.match[1]);
    const stake = parseInt(ctx.match[2]);
    const userId = ctx.from.id;
    const user = initUser(userId);
    
    // በቂ ሂሳብ መኖሩን እንደገና ያረጋግጡ
    const totalCost = stake * cardsCount;
    if (user.balance < totalCost) {
        await ctx.answerCbQuery('❌ በቂ ሂሳብ የለህም!', { show_alert: true });
        return;
    }
    
    // ሂሳብ ቀንስ
    user.balance -= totalCost;
    user.currentStake = stake;
    
    // አዲስ ጨዋታ ፍጠር
    const gameId = ++gameIdCounter;
    const winAmount = calculateWinAmount(stake, cardsCount);
    
    activeGames.set(gameId, {
        id: gameId,
        userId: userId,
        stake: stake,
        cardsCount: cardsCount,
        winAmount: winAmount,
        startTime: Date.now(),
        status: 'active'
    });
    
    // WebApp URL
    const webAppUrl = `https://your-domain.com/game?userId=${userId}&gameId=${gameId}&stake=${stake}&cards=${cardsCount}&winAmount=${winAmount}`;
    
    await ctx.editMessageText(
        `✅ *Game Created!* ✅\n\n` +
        `🎮 Game ID: ${gameId}\n` +
        `💰 Stake: ${stake} ETB\n` +
        `📊 Cards: ${cardsCount} cards\n` +
        `🏆 Potential Win: ${winAmount} ETB\n\n` +
        `🎯 Click the button below to start playing!\n` +
        `⏱️ You have 60 seconds to play!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎯 Start Game", web_app: { url: webAppUrl } }],
                    [{ text: "🔙 Back to Stake", callback_data: "play_now" }],
                    [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Check Balance
bot.action('check_balance', async (ctx) => {
    const userId = ctx.from.id;
    const user = initUser(userId);
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `💰 *የሂሳብ ሪፖርት* 💰\n\n` +
        `የአሁን ሂሳብ: ${formatBalance(user.balance)}\n` +
        `የተጫወትከው ጨዋታ: ${user.gamesPlayed}\n` +
        `አጠቃላይ አሸናፊነት: ${formatBalance(user.totalWon)}\n` +
        `አጠቃላይ ኪሳራ: ${formatBalance(user.totalLost)}\n\n` +
        `🎮 መጫወት ትፈልጋለህ? ውርርድ ምረጥ እና ማሸነፍ ጀምር!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎮 Play Now", callback_data: "play_now" }],
                    [{ text: "💳 Make a Deposit", callback_data: "deposit" }],
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Deposit
bot.action('deposit', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `💳 *ገንዘብ ማስገቢያ* 💳\n\n` +
        `ሂሳብህን ለመሙላት ከዚህ በታች ካሉት አማራጮች ምረጥ:\n\n` +
        `💸 *ቴሌብር:* 09XXXXXXXX\n` +
        `💸 *ሲቢር:* 09XXXXXXXX\n` +
        `💸 *አምኦሌ:* 09XXXXXXXX\n\n` +
        `ከተከፈለ በኋላ የክፍያ ማስረጃህን ላክልን።\n` +
        `ዝቅተኛ ክፍያ: 100 ETB\n` +
        `✨ ፈጣን ክሬዲት!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📞 Contact Support", callback_data: "support" }],
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Leaderboard
bot.action('leaderboard', async (ctx) => {
    const leaderboard = Array.from(users.values())
        .sort((a, b) => b.totalWon - a.totalWon)
        .slice(0, 10);
    
    let leaderboardText = `🏆 *Top 10 Players* 🏆\n\n`;
    leaderboard.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        leaderboardText += `${medal} ${user.username} - ${formatBalance(user.totalWon)}\n`;
    });
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        leaderboardText,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Win Patterns
bot.action('patterns', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `🎯 *Ardi Bingo Winning Patterns* 🎯\n\n` +
        `📏 *Line Patterns:*\n` +
        `• Horizontal Line - 5 numbers in a row\n` +
        `• Vertical Line - 5 numbers in a column\n` +
        `• Diagonal Line - 5 numbers diagonally\n\n` +
        `⭐ *Special Patterns:*\n` +
        `• Four Corners - All 4 corners\n` +
        `• Full House - All numbers\n` +
        `• X Pattern - Both diagonals\n\n` +
        `💡 More patterns = Bigger wins!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Instructions
bot.action('instructions', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📖 *እንዴት መጫወት እንደሚቻል* 📖\n\n` +
        `1️⃣ *Stake ምረጥ*\n` +
        `   10፣ 20፣ ወይም 50 ETB\n\n` +
        `2️⃣ *ምን ያህል ካርድ ምረጥ*\n` +
        `   1-5 ካርዶች መጫወት ትችላለህ\n\n` +
        `3️⃣ *ጨዋታውን ጀምር*\n` +
        `   በየ60 ሰከንድ አዲስ ቁጥር ይጠራል\n\n` +
        `4️⃣ *ቁጥሮችህን ምልክት አድርግ*\n` +
        `   ተመሳሳይ ቁጥር ላይ ተጫን\n\n` +
        `5️⃣ *Pattern ሙላ*\n` +
        `   ሲጠናቀቅ ሽልማት ታገኛለህ!\n\n` +
        `🎁 *ሽልማቶች:*\n` +
        `• Line: ${formatBalance(10 * 0.85)} ETB (for 10 ETB stake)\n` +
        `• Four Corners: ${formatBalance(10 * 0.85 * 2)} ETB\n` +
        `• Full House: ${formatBalance(10 * 0.85 * 5)} ETB\n\n` +
        `መልካም እድል! 🍀`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎮 Play Now", callback_data: "play_now" }],
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Support
bot.action('support', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📞 *ደንበኛ አገልግሎት* 📞\n\n` +
        `እርዳታ ያስፈልግሃል? 24/7 እዚህ ነን!\n\n` +
        `💬 ቴሌግራም: @ArdiBingoSupport\n` +
        `📧 ኢሜይል: support@ardibingo.com\n` +
        `📱 ስልክ: +251 XXX XXX XXX\n\n` +
        `⏱️ ምላሽ ሰዓት: < 5 ደቂቃ\n\n` +
        `የተለመዱ ጥያቄዎች:\n` +
        `• የክፍያ ችግር\n` +
        `• የጨዋታ ቴክኒካል ችግር\n` +
        `• የውጭ መውጫ ጥያቄ\n` +
        `• አካውንት ጥያቄዎች`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Invite Friend
bot.action('invite', async (ctx) => {
    const userId = ctx.from.id;
    const botUsername = ctx.botInfo.username;
    const inviteLink = `https://t.me/${botUsername}?start=${userId}`;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📨 *ጓደኞችህን ጋብዝ እና ቦነስ አግኝ* 📨\n\n` +
        `ይህን ሊንክ አጋራ:\n` +
        `\`${inviteLink}\`\n\n` +
        `✨ *Referral Rewards:*\n` +
        `• ጓደኛህ ሲቀላቀል: 50 ETB\n` +
        `• መጀመሪያ ክፍያ: 100 ETB\n` +
        `• ሲያሸንፍ: 200 ETB\n\n` +
        `🚀 አሁን አጋራ እና ገቢ ጀምር!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Change Username
bot.action('change_username', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `👤 *ስም መቀየሪያ* 👤\n\n` +
        `አዲስ ስምህን እንደ መልእክት ላክልን።\n\n` +
        `ህጎች:\n` +
        `• 3-20 ፊደላት\n` +
        `• ፊደላት፣ ቁጥሮች፣ እና _ ብቻ\n` +
        `• ክፍተት ወይም ልዩ ምልክቶች የሉም\n\n` +
        `አዲስ ስምህን አሁን ይጻፍ:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 Back to Menu", callback_data: "main_menu" }]
                ]
            }
        }
    );
});

// Main Menu
bot.action('main_menu', async (ctx) => {
    const userId = ctx.from.id;
    const user = initUser(userId);
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `🎉 *Welcome Back!* 🎉\n\n` +
        `💰 Balance: ${formatBalance(user.balance)}\n\n` +
        `Choose an option:`,
        {
            parse_mode: 'Markdown',
            ...mainMenu
        }
    );
});

// የስም ለውጥ መልእክት ማስተናገድ
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const user = initUser(userId);
    
    if (text.match(/^[a-zA-Z0-9_]{3,20}$/) && !text.startsWith('/')) {
        user.username = text;
        await ctx.reply(`✅ ስምህ ተቀይሯል: ${text}\n\nአሁን በዚህ ስም መጫወት ትችላለህ!`);
        await ctx.reply(`🎮 ወደ ዋና ሜኑ ተመለስ:`, mainMenu);
    }
});

// ============= Web App API Endpoints =============

// የጨዋታ ገጽ
app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// የተጠቃሚ ዳታ ለማግኘት
app.get('/api/user/:userId', (req, res) => {
    const userId = req.params.userId;
    const user = users.get(userId);
    
    if (user) {
        res.json({
            success: true,
            balance: user.balance,
            stake: user.currentStake,
            username: user.username
        });
    } else {
        res.json({
            success: false,
            error: 'User not found'
        });
    }
});

// የጨዋታ ዳታ ለማግኘት
app.get('/api/game/:gameId', (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const game = activeGames.get(gameId);
    
    if (game) {
        res.json({
            success: true,
            game: game
        });
    } else {
        res.json({
            success: false,
            error: 'Game not found'
        });
    }
});

// የጨዋታ ውጤት ለማዘመን
app.post('/api/game/result', (req, res) => {
    const { userId, gameId, won, amount, patternsCompleted } = req.body;
    const user = initUser(userId);
    const game = activeGames.get(parseInt(gameId));
    
    if (won && game) {
        user.balance += amount;
        user.totalWon += amount;
        game.status = 'completed';
        game.won = true;
    } else if (game) {
        game.status = 'completed';
        game.won = false;
    }
    
    if (!won && game) {
        user.totalLost += game.stake * game.cardsCount;
    }
    
    user.gamesPlayed++;
    user.activeGame = null;
    
    if (game) {
        activeGames.delete(parseInt(gameId));
    }
    
    res.json({
        success: true,
        newBalance: user.balance,
        message: won ? '🎉 Congratulations! You won!' : '😢 Better luck next time!'
    });
});

// የቦት እና ሰርቨር ማስጀመሪያ
bot.launch()
    .then(() => {
        console.log('🤖 Ardi Bingo Bot is running!');
        console.log('📱 Bot username: @ardi_bingo_bot');
    })
    .catch(err => {
        console.error('Bot launch error:', err);
    });

app.listen(PORT, () => {
    console.log(`🌐 Web App server running on http://localhost:${PORT}`);
    console.log(`🎮 Game URL: http://localhost:${PORT}/game`);
});

// ግሬስፉል ማቆሚያ
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
