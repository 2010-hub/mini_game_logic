import asyncio
import logging
import random
import string
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
import sqlite3
import json
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = ""
WEB_APP_URL = "https://your_host.com/tic-tac-toe"  # Адрес вашего хостинга

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


# База данных SQLite
class Database:
    def __init__(self):
        self.conn = sqlite3.connect('games.db', check_same_thread=False)
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS games (
                game_id TEXT PRIMARY KEY,
                player1_id INTEGER,
                player2_id INTEGER,
                player1_symbol TEXT,
                player2_symbol TEXT,
                board_state TEXT,
                winner INTEGER,
                game_status TEXT DEFAULT 'waiting',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                games_played INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        self.conn.commit()

    def create_game(self, user_id, game_mode="online"):
        game_id = ''.join(random.choices(string.digits, k=6))
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO games (game_id, player1_id, game_status) VALUES (?, ?, 'waiting')",
            (game_id, user_id)
        )
        self.conn.commit()
        return game_id

    def join_game(self, game_id, user_id):
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE games SET player2_id = ?, game_status = 'active' WHERE game_id = ? AND player2_id IS NULL",
            (user_id, game_id)
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def update_board(self, game_id, board_state):
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE games SET board_state = ? WHERE game_id = ?",
            (json.dumps(board_state), game_id)
        )
        self.conn.commit()

    def finish_game(self, game_id, winner_id):
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE games SET winner = ?, game_status = 'finished' WHERE game_id = ?",
            (winner_id, game_id)
        )
        self.conn.commit()
        
        # Обновляем статистику пользователей
        game_info = self.get_game_state(game_id)
        player1_id = game_info['player1_id']
        player2_id = game_info['player2_id']
        
        if winner_id == player1_id:
            self.update_stats(player1_id, 'win')
            self.update_stats(player2_id, 'loss')
        elif winner_id == player2_id:
            self.update_stats(player2_id, 'win')
            self.update_stats(player1_id, 'loss')
        else:  # ничья
            self.update_stats(player1_id, 'draw')
            self.update_stats(player2_id, 'draw')

    def update_stats(self, user_id, result):
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT games_played, wins, losses, draws FROM users WHERE user_id = ?",
            (user_id,)
        )
        stats = cursor.fetchone()
        
        if stats:
            games_played, wins, losses, draws = stats
            if result == 'win':
                wins += 1
            elif result == 'loss':
                losses += 1
            elif result == 'draw':
                draws += 1
            games_played += 1
            
            cursor.execute(
                "UPDATE users SET games_played = ?, wins = ?, losses = ?, draws = ? WHERE user_id = ?",
                (games_played, wins, losses, draws, user_id)
            )
        else:
            games_played, wins, losses, draws = 1, 0, 0, 0
            if result == 'win':
                wins = 1
            elif result == 'loss':
                losses = 1
            elif result == 'draw':
                draws = 1
                
            cursor.execute(
                "INSERT INTO users (user_id, games_played, wins, losses, draws) VALUES (?, ?, ?, ?, ?)",
                (user_id, games_played, wins, losses, draws)
            )
        
        self.conn.commit()

    def get_game_state(self, game_id):
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT * FROM games WHERE game_id = ?",
            (game_id,)
        )
        columns = [col[0] for col in cursor.description]
        row = cursor.fetchone()
        if row:
            return dict(zip(columns, row))
        return None

    def get_user_stats(self, user_id):
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT username, games_played, wins, losses, draws FROM users WHERE user_id = ?",
            (user_id,)
        )
        return cursor.fetchone()


db = Database()


# Генерация WebApp ссылки с данными
def generate_webapp_url(user_id, game_id=None, mode="online"):
    params = {
        "user_id": user_id,
        "mode": mode
    }
    if game_id:
        params["game_id"] = game_id

    params_str = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{WEB_APP_URL}?{params_str}"


# Команда /start
@dp.message(CommandStart())
async def cmd_start(message: Message):
    user_id = message.from_user.id
    
    # Создаем новую игру
    game_id = db.create_game(user_id)

    keyboard = InlineKeyboardBuilder()
    keyboard.row(
        types.InlineKeyboardButton(
            text="🎮 Играть онлайн",
            web_app=WebAppInfo(url=generate_webapp_url(user_id, game_id, "online"))
        )
    )
    
    keyboard.row(
        types.InlineKeyboardButton(
            text="📱 Играть оффлайн",
            web_app=WebAppInfo(url=generate_webapp_url(user_id, mode="offline"))
        )
    )

    await message.answer(
        f"🎮 *Крестики-Нолики*\n\n"
        f"👤 Ваш ID: `{user_id}`\n"
        f"🆔 Game ID: `{game_id}`\n\n"
        f"*Как играть:*\n"
        f"1. Откройте \"Играть онлайн\" и поделитесь Game ID с другом\n"
        f"2. Или выберите \"Играть оффлайн\" для игры в одиночку\n\n"
        f"*Выберите действие:*",
        parse_mode="Markdown",
        reply_markup=keyboard.as_markup()
    )


# Команда для быстрого создания игры
@dp.message(Command("game"))
async def cmd_game(message: Message):
    user_id = message.from_user.id
    game_id = db.create_game(user_id)

    keyboard = InlineKeyboardBuilder()
    keyboard.row(
        types.InlineKeyboardButton(
            text="🎮 Играть",
            web_app=WebAppInfo(url=generate_webapp_url(user_id, game_id, "online"))
        )
    )

    await message.answer(
        f"🎮 *Новая игра создана!*\n\n"
        f"Game ID: `{game_id}`\n\n"
        f"Отправьте этот ID другу, чтобы он мог присоединиться командой:\n"
        f"`/join {game_id}`\n\n"
        f"Или откройте игровой интерфейс:",
        parse_mode="Markdown",
        reply_markup=keyboard.as_markup()
    )


# Команда для присоединения
@dp.message(Command("join"))
async def cmd_join(message: Message):
    try:
        game_id = message.text.split()[1]
        user_id = message.from_user.id

        if db.join_game(game_id, user_id):
            keyboard = InlineKeyboardBuilder()
            keyboard.row(
                types.InlineKeyboardButton(
                    text="🎮 Перейти к игре",
                    web_app=WebAppInfo(url=generate_webapp_url(user_id, game_id, "online"))
                )
            )

            await message.answer(
                f"✅ Вы присоединились к игре!\n"
                f"Game ID: `{game_id}`\n\n"
                f"Нажмите кнопку ниже, чтобы начать:",
                parse_mode="Markdown",
                reply_markup=keyboard.as_markup()
            )
        else:
            await message.answer("❌ Не удалось присоединиться. Игра не найдена или уже начата.")
    except IndexError:
        await message.answer("Использование: /join <game_id>")


# Команда для просмотра статистики
@dp.message(Command("stats"))
async def cmd_stats(message: Message):
    user_id = message.from_user.id
    stats = db.get_user_stats(user_id)
    
    if stats:
        username, games_played, wins, losses, draws = stats
        await message.answer(
            f"📊 *Статистика пользователя*:\n\n"
            f"👤 Username: @{username or 'Не указан'}\n"
            f"🎮 Игр сыграно: {games_played}\n"
            f"🏆 Побед: {wins}\n"
            f"💥 Поражений: {losses}\n"
            f"🤝 Ничьих: {draws}\n\n"
            f"Ваш ID: `{user_id}`",
            parse_mode="Markdown"
        )
    else:
        await message.answer(
            f"📊 У вас пока нет статистики.\n"
            f"Ваш ID: `{user_id}`\n\n"
            f"Сыграйте хотя бы одну игру, чтобы появилась статистика."
        )


# Обработчик callback для inline-кнопок
@dp.callback_query(F.data.startswith("webapp_"))
async def webapp_callback(callback: CallbackQuery):
    data = callback.data.split("_")
    if len(data) >= 3:
        user_id = callback.from_user.id
        game_id = data[2] if len(data) > 2 else None

        await callback.message.edit_reply_markup(
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(
                    text="🎮 Перейти в игру",
                    web_app=WebAppInfo(url=generate_webapp_url(user_id, game_id))
                )
            ]])
        )
        await callback.answer()


# Запуск бота
async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())