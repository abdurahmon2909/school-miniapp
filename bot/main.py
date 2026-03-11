import asyncio

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from config import load_config
from handlers_start import build_start_router
from poll_scheduler import PollScheduler
from sheets_service import SheetsService


async def main() -> None:
    config = load_config()

    if not config.bot_token:
        raise ValueError("BOT_TOKEN topilmadi")

    if not config.mini_app_url:
        raise ValueError("MINI_APP_URL topilmadi")

    if not config.google_sheet_name:
        raise ValueError("GOOGLE_SHEET_NAME topilmadi")

    bot = Bot(token=config.bot_token)
    dp = Dispatcher(storage=MemoryStorage())

    sheets = SheetsService(sheet_name=config.google_sheet_name)

    dp.include_router(build_start_router(sheets, config.mini_app_url))

    scheduler = PollScheduler(
        bot=bot,
        sheets=sheets,
        mini_app_url=config.mini_app_url,
        poll_hour=config.poll_hour,
        poll_minute=config.poll_minute,
        timezone_name="Asia/Tashkent",
    )

    asyncio.create_task(scheduler.run_forever())

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())