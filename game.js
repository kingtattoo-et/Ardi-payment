// game.js - የጨዋታው ሂደት
const bingoBoard = document.getElementById('bingo-board');
const drawnNumbers = new Set();

// 1-100 ያሉ ቁጥሮችን ለካርቴላ ማመንጫ
function generateCard() {
    const card = [];
    while(card.length < 25) {
        let r = Math.floor(Math.random() * 100) + 1;
        if(card.indexOf(r) === -1) card.push(r);
    }
    return card;
}

// ቁጥሮችን በስክሪኑ ላይ መሳል
function drawCard() {
    const numbers = generateCard();
    bingoBoard.innerHTML = '';
    numbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.innerText = num;
        cell.onclick = () => cell.classList.toggle('marked');
        bingoBoard.appendChild(cell);
    });
}

// ጨዋታው ሲጀመር
window.onload = drawCard;
