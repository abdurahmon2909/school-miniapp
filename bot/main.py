import asyncio
from aiogram import Bot, Dispatcher

from config import load_config
from start import setup_start_handlers


async def main() -> None:
    config = load_config()

    if not config.bot_token:
        raise ValueError("BOT_TOKEN не найден в .env")

    if not config.mini_app_url:
        raise ValueError("MINI_APP_URL не найден в .env")

    bot = Bot(token=config.bot_token)
    dp = Dispatcher()

    dp.include_router(setup_start_handlers(config))

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())