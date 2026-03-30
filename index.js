// Game state
let gameState = {
    userId: null,
    gameId: null,
    stake: 0,
    balance: 0,
    bingoCard: [],
    calledNumbers: [],
    markedNumbers: [],
    timer: null,
    timeLeft: 60,
    patternsCompleted: 0,
    gameActive: true,
    stakeDeducted: false  // Stake ቀንሶ መሆኑን ለማስታወስ
};

// Initialize game
async function initGame() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    gameState.userId = urlParams.get('userId');
    gameState.gameId = urlParams.get('gameId');
    gameState.stake = parseInt(urlParams.get('stake')) || 10;
    
    document.getElementById('gameId').textContent = gameState.gameId || '---';
    document.getElementById('stake').textContent = `${gameState.stake} ETB`;
    
    // Fetch user balance from server
    await fetchUserBalance();
    
    // ጨዋታ ሲጀመር Stake ቀንስ
    await deductStake();
    
    // Generate bingo card with 100 numbers (10x10 grid)
    generateBingoCard();
    
    // Start 60 second timer
    startTimer();
    
    // Start auto number calling
    startAutoNumberCalling();
    
    showMessage(`🎮 Game started! Stake: ${gameState.stake} ETB deducted. Good luck!`, 'success');
}

// Fetch user balance from Telegram bot server
async function fetchUserBalance() {
    try {
        const response = await fetch(`/api/user/${gameState.userId}`);
        const data = await response.json();
        if (data.success) {
            gameState.balance = data.balance;
            document.getElementById('balance').textContent = `${gameState.balance.toFixed(2)} ETB`;
            console.log(`💰 Balance fetched: ${gameState.balance} ETB`);
        } else {
            console.error('User not found');
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

// Deduct stake when game starts
async function deductStake() {
    if (gameState.stakeDeducted) return;
    
    try {
        const response = await fetch('/api/game/result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: gameState.userId,
                gameId: gameState.gameId,
                won: false,
                amount: 0
            })
        });
        
        const data = await response.json();
        if (data.success) {
            gameState.balance = data.newBalance;
            document.getElementById('balance').textContent = `${gameState.balance.toFixed(2)} ETB`;
            gameState.stakeDeducted = true;
            console.log(`💰 Stake deducted: ${gameState.stake} ETB. New balance: ${gameState.balance} ETB`);
        }
    } catch (error) {
        console.error('Error deducting stake:', error);
    }
}

// Update balance on server after win
async function updateGameResult(won, amount) {
    try {
        const response = await fetch('/api/game/result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: gameState.userId,
                gameId: gameState.gameId,
                won: won,
                amount: amount
            })
        });
        
        const data = await response.json();
        if (data.success) {
            gameState.balance = data.newBalance;
            document.getElementById('balance').textContent = `${gameState.balance.toFixed(2)} ETB`;
            console.log(`💰 Balance updated: ${gameState.balance} ETB`);
        }
        return data;
    } catch (error) {
        console.error('Error updating game result:', error);
    }
}

// Generate 100 numbers bingo card (10x10 grid)
function generateBingoCard() {
    // Create numbers 1-100
    const numbers = [];
    for (let i = 1; i <= 100; i++) {
        numbers.push(i);
    }
    
    // Shuffle numbers
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    // Take first 100 numbers for the card (10x10 grid)
    gameState.bingoCard = numbers.slice(0, 100);
    gameState.markedNumbers = new Array(100).fill(false);
    
    renderBingoCard();
}

// Render bingo card (10x10 grid)
function renderBingoCard() {
    const grid = document.getElementById('bingoGrid');
    grid.innerHTML = '';
    
    gameState.bingoCard.forEach((number, index) => {
        const cell = document.createElement('div');
        cell.className = 'card-cell';
        if (gameState.markedNumbers[index]) {
            cell.classList.add('marked');
        }
        cell.textContent = number;
        cell.onclick = () => markNumber(index);
        grid.appendChild(cell);
    });
}

// Mark a number on the card
function markNumber(index) {
    if (!gameState.gameActive) {
        showMessage('⏰ Game is over! Start a new game to play again.', 'warning');
        return;
    }
    
    const number = gameState.bingoCard[index];
    
    if (!gameState.markedNumbers[index] && gameState.calledNumbers.includes(number)) {
        gameState.markedNumbers[index] = true;
        renderBingoCard();
        
        // Add win animation
        const cells = document.querySelectorAll('.card-cell');
        if (cells[index]) {
            cells[index].classList.add('win-animation');
            setTimeout(() => {
                if (cells[index]) cells[index].classList.remove('win-animation');
            }, 500);
        }
        
        showMessage(`✅ Number ${number} marked!`, 'success');
    } else if (!gameState.calledNumbers.includes(number)) {
        showMessage(`⚠️ Number ${number} hasn't been called yet!`, 'warning');
    } else if (gameState.markedNumbers[index]) {
        showMessage(`ℹ️ Number ${number} already marked!`, 'info');
    }
}

// Call a random number
function callNumber() {
    if (!gameState.gameActive) return;
    
    if (gameState.calledNumbers.length >= 100) {
        showMessage('🎉 All numbers have been called! Game over!', 'success');
        endGame(false);
        return;
    }
    
    let number;
    do {
        number = Math.floor(Math.random() * 100) + 1;
    } while (gameState.calledNumbers.includes(number));
    
    gameState.calledNumbers.push(number);
    renderCalledNumbers();
    
    // Animate the call
    showMessage(`🎲 Number called: ${number}!`, 'info');
    
    // Flash effect
    const timerDiv = document.querySelector('.timer');
    if (timerDiv) {
        timerDiv.style.animation = 'pulse 0.3s ease-in-out';
        setTimeout(() => {
            if (timerDiv) timerDiv.style.animation = '';
        }, 300);
    }
}

// Render called numbers
function renderCalledNumbers() {
    const container = document.getElementById('calledNumbers');
    if (!container) return;
    
    container.innerHTML = '';
    
    gameState.calledNumbers.slice(-30).forEach(number => {
        const badge = document.createElement('div');
        badge.className = 'number-badge';
        badge.textContent = number;
        container.appendChild(badge);
    });
}

// Start 60 second timer
function startTimer() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    gameState.timeLeft = 60;
    updateTimerDisplay();
    
    gameState.timer = setInterval(() => {
        if (!gameState.gameActive) return;
        
        gameState.timeLeft--;
        updateTimerDisplay();
        
        if (gameState.timeLeft <= 0) {
            // Time's up - call a new number
            callNumber();
            gameState.timeLeft = 60;
            updateTimerDisplay();
        }
    }, 1000);
}

// Update timer display (MM:SS format)
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Start auto number calling
function startAutoNumberCalling() {
    // First call after 5 seconds
    setTimeout(() => {
        if (gameState.gameActive && gameState.calledNumbers.length === 0) {
            callNumber();
        }
    }, 5000);
}

// Check patterns
function checkPattern(patternType) {
    if (!gameState.gameActive) {
        showMessage('⏰ Game is over! Start a new game to play again.', 'warning');
        return;
    }
    
    let completed = false;
    let winAmount = 0;
    
    switch(patternType) {
        case 'line':
            completed = checkLinePattern();
            winAmount = gameState.stake * 2;
            break;
        case 'corners':
            completed = checkFourCorners();
            winAmount = gameState.stake * 3;
            break;
        case 'full':
            completed = checkFullHouse();
            winAmount = gameState.stake * 10;
            break;
        case 'x':
            completed = checkXPattern();
            winAmount = gameState.stake * 5;
            break;
    }
    
    if (completed) {
        gameState.patternsCompleted++;
        document.getElementById('patternsCompleted').textContent = gameState.patternsCompleted;
        
        showMessage(`🎉 BINGO! You completed ${patternType} pattern! Won ${winAmount} ETB! 🎉`, 'success');
        
        // Update balance and send to server
        updateGameResult(true, winAmount);
        
        // Check if game should end after 3 patterns
        if (gameState.patternsCompleted >= 3) {
            showMessage('🏆 You completed 3 patterns! Game completed! 🏆', 'success');
            endGame(true);
        }
    } else {
        showMessage(`❌ ${patternType} pattern not completed yet. Keep playing!`, 'warning');
    }
}

// Check line pattern (horizontal, vertical, diagonal) on 10x10 grid
function checkLinePattern() {
    // Check rows (10 rows)
    for (let i = 0; i < 10; i++) {
        let rowComplete = true;
        for (let j = 0; j < 10; j++) {
            if (!gameState.markedNumbers[i * 10 + j]) {
                rowComplete = false;
                break;
            }
        }
        if (rowComplete) return true;
    }
    
    // Check columns (10 columns)
    for (let j = 0; j < 10; j++) {
        let colComplete = true;
        for (let i = 0; i < 10; i++) {
            if (!gameState.markedNumbers[i * 10 + j]) {
                colComplete = false;
                break;
            }
        }
        if (colComplete) return true;
    }
    
    // Check main diagonal
    let diagComplete = true;
    for (let i = 0; i < 10; i++) {
        if (!gameState.markedNumbers[i * 10 + i]) {
            diagComplete = false;
            break;
        }
    }
    if (diagComplete) return true;
    
    // Check other diagonal
    diagComplete = true;
    for (let i = 0; i < 10; i++) {
        if (!gameState.markedNumbers[i * 10 + (9 - i)]) {
            diagComplete = false;
            break;
        }
    }
    
    return diagComplete;
}

// Check four corners
function checkFourCorners() {
    const corners = [0, 9, 90, 99];
    return corners.every(index => gameState.markedNumbers[index]);
}

// Check full house (all numbers)
function checkFullHouse() {
    return gameState.markedNumbers.every(marked => marked === true);
}

// Check X pattern (both diagonals)
function checkXPattern() {
    for (let i = 0; i < 10; i++) {
        if (!gameState.markedNumbers[i * 10 + i]) return false;
        if (!gameState.markedNumbers[i * 10 + (9 - i)]) return false;
    }
    return true;
}

// End game
function endGame(won) {
    if (!gameState.gameActive) return;
    
    gameState.gameActive = false;
    
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    const messageDiv = document.getElementById('message');
    if (won) {
        messageDiv.textContent = '🎮 Game Completed! 🎮 Thank you for playing Ardi Bingo!';
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
    } else {
        messageDiv.textContent = '⏰ Time\'s up! Game Over! Start a new game to play again!';
        messageDiv.style.background = '#f8d7da';
        messageDiv.style.color = '#721c24';
    }
    
    messageDiv.classList.add('game-over');
    
    // Close web app after 5 seconds
    setTimeout(() => {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.close();
        }
    }, 5000);
}

// Show message
function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.textContent = msg;
    
    if (type === 'success') {
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
    } else if (type === 'warning') {
        messageDiv.style.background = '#fff3cd';
        messageDiv.style.color = '#856404';
    } else {
        messageDiv.style.background = '#e3f2fd';
        messageDiv.style.color = '#0d47a1';
    }
    
    // Auto-clear after 3 seconds
    setTimeout(() => {
        if (messageDiv.textContent === msg && gameState.gameActive) {
            messageDiv.textContent = '🎮 Click on numbers as they\'re called!';
            messageDiv.style.background = '#e3f2fd';
            messageDiv.style.color = '#0d47a1';
        }
    }, 3000);
}

// Start the game when page loads
window.addEventListener('load', initGame);
