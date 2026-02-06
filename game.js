let currentMode = 'online';
let gameData = {
    online: { player: null, opponent: null },
    local: { player1: null, player2: null, currentPlayer: 1 }
};

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('onlineMode').classList.toggle('hidden', mode !== 'online');
    document.getElementById('localMode').classList.toggle('hidden', mode !== 'local');
    
    if (mode === 'local') {
        resetLocalGame();
    }
}

function makeChoice(choice) {
    if (currentMode === 'online') {
        gameData.online.player = choice;
        document.getElementById('player1Choice').textContent = getEmoji(choice);
        
        // Симуляция ответа соперника
        setTimeout(() => {
            const choices = ['rock', 'paper', 'scissors'];
            const opponentChoice = choices[Math.floor(Math.random() * choices.length)];
            gameData.online.opponent = opponentChoice;
            document.getElementById('player2Choice').textContent = getEmoji(opponentChoice);
            
            showResult(choice, opponentChoice);
        }, 1000);
    }
}

function makeLocalChoice(choice) {
    if (gameData.local.currentPlayer === 1) {
        gameData.local.player1 = choice;
        document.getElementById('localPlayer1Choice').textContent = getEmoji(choice);
        gameData.local.currentPlayer = 2;
        document.getElementById('turnIndicator').innerHTML = 'Ход: <strong>Игрок 2</strong>';
        document.getElementById('turnIndicator').style.background = 'rgba(78,205,196,0.2)';
    } else {
        gameData.local.player2 = choice;
        document.getElementById('localPlayer2Choice').textContent = getEmoji(choice);
        document.getElementById('revealBtn').classList.remove('hidden');
    }
}

function revealLocalResult() {
    const result = getWinner(gameData.local.player1, gameData.local.player2);
    let text = '';
    
    if (result === 'draw') {
        text = '🎉 Ничья!';
    } else if (result === 'player1') {
        text = '🏆 Победил Игрок 1!';
    } else {
        text = '🏆 Победил Игрок 2!';
    }
    
    document.getElementById('localWinnerText').textContent = text;
    document.getElementById('localResult').classList.remove('hidden');
}

function showResult(choice1, choice2) {
    const result = getWinner(choice1, choice2);
    let text = '';
    
    if (result === 'draw') {
        text = '🎉 Ничья!';
    } else if (result === 'player1') {
        text = '🏆 Вы победили!';
    } else {
        text = '💀 Вы проиграли!';
    }
    
    document.getElementById('winnerText').textContent = text;
    document.getElementById('onlineResult').classList.remove('hidden');
}

function getWinner(choice1, choice2) {
    if (choice1 === choice2) return 'draw';
    const rules = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
    return rules[choice1] === choice2 ? 'player1' : 'player2';
}

function getEmoji(choice) {
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
    return emojis[choice] || '❓';
}

function resetGame() {
    gameData.online = { player: null, opponent: null };
    document.getElementById('player1Choice').textContent = '❓';
    document.getElementById('player2Choice').textContent = '❓';
    document.getElementById('onlineResult').classList.add('hidden');
}

function resetLocalGame() {
    gameData.local = { player1: null, player2: null, currentPlayer: 1 };
    document.getElementById('localPlayer1Choice').textContent = '❓';
    document.getElementById('localPlayer2Choice').textContent = '❓';
    document.getElementById('turnIndicator').innerHTML = 'Ход: <strong>Игрок 1</strong>';
    document.getElementById('turnIndicator').style.background = 'rgba(255,107,107,0.2)';
    document.getElementById('revealBtn').classList.add('hidden');
    document.getElementById('localResult').classList.add('hidden');
}

function copyGameId() {
    const gameId = document.getElementById('gameId').textContent;
    navigator.clipboard.writeText(gameId);
    alert('Game ID скопирован!');
}

// Загрузка параметров из URL
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('game_id');
    const mode = params.get('mode');
    
    if (gameId) {
        document.getElementById('gameId').textContent = gameId;
        document.getElementById('gameIdSection').classList.remove('hidden');
    }
    
    if (mode === 'local') {
        setMode('local');
    }
    
    // Telegram WebApp
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }
});
