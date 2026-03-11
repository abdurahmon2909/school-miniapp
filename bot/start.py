from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from config import Config
from main_menu import open_mini_app_kb


def setup_start_handlers(config: Config) -> Router:
    local_router = Router()

    @local_router.message(CommandStart())
    async def start_handler(message: Message) -> None:
        await message.answer(
            "🏫 Добро пожаловать в школьную систему.\n\nНажми кнопку ниже, чтобы открыть Mini App.",
            reply_markup=open_mini_app_kb(config.mini_app_url),
        )

    return local_router