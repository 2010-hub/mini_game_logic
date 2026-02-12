// Глобальные переменные игры
let currentMode = '';
let currentPlayer = 'X';
let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;
let playerSymbol = 'X'; // Символ текущего игрока
let opponentSymbol = 'O'; // Символ соперника
let isMyTurn = false; // Для онлайн-режима

// Функция установки режима игры
function setMode(mode) {
    currentMode = mode;
    
    // Скрываем все секции
    document.getElementById('modeSelector').classList.add('hidden');
    document.getElementById('onlineSetup').classList.add('hidden');
    document.getElementById('gameBoard').classList.add('hidden');
    
    if (mode === 'online') {
        document.getElementById('onlineSetup').classList.remove('hidden');
    } else {
        // Для оффлайн-режима сразу начнем игру
        startGame();
    }
}

// Функция создания игры (для администратора комнаты)
function createGame() {
    // Генерируем случайный 6-значный ID
    const gameId = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('gameId').textContent = gameId;
    document.getElementById('gameIdSection').classList.remove('hidden');
    
    // Для простоты в демо-версии сразу начинаем игру
    startGame();
}

// Функция присоединения к игре
function joinGame() {
    const playerId = document.getElementById('playerIdInput').value.trim();
    if (playerId.length !== 6 || isNaN(playerId)) {
        alert('Пожалуйста, введите корректный 6-значный ID');
        return;
    }
    
    // Для простоты в демо-версии сразу начинаем игру
    startGame();
}

// Функция начала игры
function startGame() {
    document.getElementById('onlineSetup').classList.add('hidden');
    document.getElementById('gameBoard').classList.remove('hidden');
    
    // Сбрасываем игровое поле
    resetGame();
    
    // Рандомно определяем первого игрока
    const isFirstPlayer = Math.random() < 0.5;
    currentPlayer = isFirstPlayer ? 'X' : 'O';
    playerSymbol = isFirstPlayer ? 'X' : 'O';
    opponentSymbol = isFirstPlayer ? 'O' : 'X';
    
    // Обновляем статус
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
    
    // В онлайн-режиме меняем флаг чьей очередь
    if (currentMode === 'online') {
        isMyTurn = !isMyTurn;
    }
    
    updateStatus();
}

// Проверка победы
function checkWin() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтали
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикали
        [0, 4, 8], [2, 4, 6]             // Диагонали
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
    gameActive = false;
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
    
    // Скрываем Game ID при сбросе
    document.getElementById('gameIdSection').classList.add('hidden');
    
    updateStatus();
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('resultModal').classList.add('hidden');
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
