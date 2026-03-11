from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from aiogram import Bot

from keyboards import open_mini_app_keyboard
from sheets_service import SheetsService


WEEKDAY_MAP = {
    "Monday": "Dushanba",
    "Tuesday": "Seshanba",
    "Wednesday": "Chorshanba",
    "Thursday": "Payshanba",
    "Friday": "Juma",
    "Saturday": "Shanba",
    "Sunday": "Yakshanba",
}


class PollScheduler:
    def __init__(
        self,
        bot: Bot,
        sheets: SheetsService,
        mini_app_url: str,
        timezone_name: str,
        poll_hour: int,
        poll_minute: int,
    ) -> None:
        self.bot = bot
        self.sheets = sheets
        self.mini_app_url = mini_app_url
        self.timezone = ZoneInfo(timezone_name)
        self.poll_hour = poll_hour
        self.poll_minute = poll_minute
        self._last_run_key: str | None = None

    async def run_forever(self) -> None:
        while True:
            try:
                await self._tick()
            except Exception as e:
                print(f"[poll_scheduler] error: {e}")

            await asyncio.sleep(30)

    async def _tick(self) -> None:
        now = datetime.now(self.timezone)
        run_key = now.strftime("%Y-%m-%d %H:%M")

        if now.hour != self.poll_hour or now.minute != self.poll_minute:
            return

        if self._last_run_key == run_key:
            return

        self._last_run_key = run_key
        await self._create_and_send_daily_polls(now)

    async def _create_and_send_daily_polls(self, now: datetime) -> None:
        all_users = self.sheets.get_all_users()
        weekday_uz = WEEKDAY_MAP[now.strftime("%A")]
        poll_date = now.strftime("%Y-%m-%d")
        end_time = f"{poll_date} 23:59:59"
        created_at = now.strftime("%Y-%m-%d %H:%M:%S")

        for user in all_users:
            role = str(user.get("role", "")).strip().lower()
            if role != "student":
                continue

            telegram_id = str(user.get("telegram_id", "")).strip()
            class_name = str(user.get("class_name", "")).strip()
            selected_name = str(user.get("selected_name", "")).strip()

            if not telegram_id or not class_name or not selected_name:
                continue

            lessons = self.sheets.get_schedule_for_class_and_weekday(
                class_name=class_name,
                weekday=weekday_uz,
            )

            created_count = 0

            for lesson in lessons:
                subject_name = str(lesson.get("subject_name", "")).strip()
                teacher_1 = str(lesson.get("teacher_1", "")).strip()
                teacher_2 = str(lesson.get("teacher_2", "")).strip()
                lesson_number = int(lesson.get("lesson_number", 0) or 0)

                exists = self.sheets.poll_exists_for_user_and_day(
                    telegram_id=int(telegram_id),
                    poll_date=poll_date,
                    subject_name=subject_name,
                    lesson_number=lesson_number,
                )

                if exists:
                    continue

                self.sheets.append_poll_session(
                    telegram_id=int(telegram_id),
                    selected_name=selected_name,
                    class_name=class_name,
                    poll_date=poll_date,
                    subject_name=subject_name,
                    teacher_1=teacher_1,
                    teacher_2=teacher_2,
                    lesson_number=lesson_number,
                    created_at=created_at,
                    end_time=end_time,
                    status="active",
                )
                created_count += 1

            if created_count > 0:
                text = (
                    "📊 Bugungi darslar bo‘yicha ovoz berish boshlandi.\n\n"
                    f"Siz uchun {created_count} ta fan bo‘yicha so‘rov tayyorlandi.\n"
                    "So‘rovlar web app ichida ochiladi."
                )

                await self.bot.send_message(
                    chat_id=int(telegram_id),
                    text=text,
                    reply_markup=open_mini_app_keyboard(self.mini_app_url),
                )