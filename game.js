// Глобальные переменные игры
let currentMode = '';
let currentPlayer = 'X';
let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;
let playerSymbol = 'X';
let opponentSymbol = 'O';
let isMyTurn = false;
let ws = null;
let gameId = null;

// Установка режима игры
function setMode(mode) {
    currentMode = mode;
    
    // Скрываем все секции
    document.getElementById('modeSelector').classList.add('hidden');
    document.getElementById('onlineSetup').classList.add('hidden');
    document.getElementById('gameBoard').classList.add('hidden');
    
    if (mode === 'online') {
        document.getElementById('onlineSetup').classList.remove('hidden');
    } else {
        // Для оффлайн-режима сразу начинаем игру
        startGame();
    }
}

// Функция присоединения к игре
function joinGame() {
    const playerId = document.getElementById('playerIdInput').value.trim();
    if (playerId.length !== 6 || isNaN(playerId)) {
        alert('Пожалуйста, введите корректный 6-значный ID');
        return;
    }
    
    gameId = playerId;
    
    // Подключаемся к WebSocket
    ws = new WebSocket('ws://localhost:8765');
    
    ws.onopen = function() {
        console.log('Подключено к серверу');
        
        // Отправляем запрос на присоединение к игре
        ws.send(JSON.stringify({
            action: 'join_game',
            game_id: gameId,
            user_id: getUserFromUrl()
        }));
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        switch(data.action) {
            case 'game_state':
                startOnlineGame(data);
                break;
            case 'update_board':
                updateBoardState(data);
                break;
            case 'game_over':
                endGame(data.winner === 'draw' ? 'Ничья!' : `${data.winner} выиграл!`);
                break;
        }
    };
    
    ws.onclose = function() {
        console.log('Соединение закрыто');
    };
}

// Начало онлайн-игры
function startOnlineGame(data) {
    document.getElementById('onlineSetup').classList.add('hidden');
    document.getElementById('gameBoard').classList.remove('hidden');
    
    resetGame();
    
    // Устанавливаем символы игроков случайным образом
    const isFirstPlayer = Math.random() < 0.5;
    playerSymbol = isFirstPlayer ? 'X' : 'O';
    opponentSymbol = isFirstPlayer ? 'O' : 'X';
    currentPlayer = data.current_player;
    isMyTurn = (currentPlayer === playerSymbol);
    
    updateStatus();
    gameActive = true;
}

// Обновление состояния доски
function updateBoardState(data) {
    board = data.board;
    currentPlayer = data.current_player;
    
    // Обновляем отображение ячеек
    for (let i = 0; i < 9; i++) {
        const cell = document.querySelector(`.cell[data-index="${i}"]`);
        cell.textContent = board[i];
        cell.classList.remove('x', 'o', 'occupied');
        if (board[i]) {
            cell.classList.add(board[i].toLowerCase(), 'occupied');
        }
    }
    
    isMyTurn = (currentPlayer === playerSymbol);
    updateStatus();
}

// Начало оффлайн-игры
function startGame() {
    document.getElementById('gameBoard').classList.remove('hidden');
    resetGame();
    
    // Рандомно определяем первого игрока
    const isFirstPlayer = Math.random() < 0.5;
    currentPlayer = isFirstPlayer ? 'X' : 'O';
    playerSymbol = isFirstPlayer ? 'X' : 'O';
    opponentSymbol = isFirstPlayer ? 'O' : 'X';
    
    updateStatus();
    gameActive = true;
    isMyTurn = (currentPlayer === playerSymbol);
}

// Обновление статуса игры
function updateStatus() {
    const statusElement = document.getElementById('status');
    if (!gameActive) {
        statusElement.textContent = 'Игра окончена';
        return;
    }
    
    if (currentMode === 'offline') {
        statusElement.textContent = `Ход: ${currentPlayer}`;
    } else {
        if (isMyTurn) {
            statusElement.textContent = `Ваш ход (${playerSymbol})`;
        } else {
            statusElement.textContent = `Ход соперника (${opponentSymbol})`;
        }
    }
}

// Обработка клика по ячейке
function handleCellClick(index) {
    if (!gameActive) return;
    
    // В онлайн-режиме проверяем, наш ли сейчас ход
    if (currentMode === 'online' && !isMyTurn) {
        return;
    }
    
    // Проверяем, свободна ли ячейка
    if (board[index] !== '') {
        return;
    }
    
    // Делаем ход
    makeMove(index);
}

// Совершение хода
function makeMove(index) {
    // Обновляем доску
    board[index] = currentPlayer;
    
    // Обновляем отображение ячейки
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.textContent = currentPlayer;
    cell.classList.add(currentPlayer.toLowerCase());
    cell.classList.add('occupied');
    
    // Проверяем победителя
    const win = checkWin();
    if (win) {
        endGame(`${currentPlayer} выиграл!`);
        return;
    }
    
    // Проверяем ничью
    if (!board.includes('')) {
        endGame('Ничья!');
        return;
    }
    
    // Переключаем игрока
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    
    // В онлайн-режиме меняем флаг чьей очереди
    if (currentMode === 'online') {
        isMyTurn = !isMyTurn;
        
        // Отправляем ход на сервер
        ws.send(JSON.stringify({
            action: 'make_move',
            game_id: gameId,
            move: {
                index: index,
                symbol: playerSymbol,
                player_id: getUserFromUrl()
            }
        }));
    }
    
    updateStatus();
}

// Проверка победы
function checkWin() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Горизонтали
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Вертикали
        [0, 4, 8], [2, 4, 6]              // Диагонали
    ];
    
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return true;
        }
    }
    
    return false;
}

// Завершение игры
function endGame(message) {
    gameActive = false;
    document.getElementById('resultText').textContent = message;
    document.getElementById('resultModal').classList.remove('hidden');
    updateStatus();
}

// Сброс игры
function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'X';
    isMyTurn = true;
    
    // Очищаем ячейки
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'occupied');
    });
    
    // Скрываем модальное окно результата
    document.getElementById('resultModal').classList.add('hidden');
    
    // Рандомно определяем первого игрока при новой игре
    if (currentMode === 'offline') {
        const isFirstPlayer = Math.random() < 0.5;
        currentPlayer = isFirstPlayer ? 'X' : 'O';
    } else {
        const isFirstPlayer = Math.random() < 0.5;
        currentPlayer = isFirstPlayer ? 'X' : 'O';
        playerSymbol = isFirstPlayer ? 'X' : 'O';
        opponentSymbol = isFirstPlayer ? 'O' : 'X';
        isMyTurn = (currentPlayer === playerSymbol);
    }
    
    updateStatus();
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('resultModal').classList.add('hidden');
}

// Получение user_id из URL
function getUserFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('user_id');
}

// Инициализация игры при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем обработчики кликов для ячеек
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            const index = parseInt(cell.getAttribute('data-index'));
            handleCellClick(index);
        });
    });
    
    // Telegram WebApp
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }
});

// Функция копирования ID игры
function copyGameId() {
    const gameId = document.getElementById('gameId').textContent;
    navigator.clipboard.writeText(gameId);
    alert('Game ID скопирован!');
}
