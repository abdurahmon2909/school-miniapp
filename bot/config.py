import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    bot_token: str
    mini_app_url: str
    google_sheet_name: str
    poll_hour: int
    poll_minute: int


def load_config() -> Config:
    return Config(
        bot_token=os.getenv("BOT_TOKEN", "").strip(),
        mini_app_url=os.getenv("MINI_APP_URL", "").strip(),
        google_sheet_name=os.getenv("GOOGLE_SHEET_NAME", "").strip(),
        poll_hour=int(os.getenv("POLL_HOUR", "14")),
        poll_minute=int(os.getenv("POLL_MINUTE", "0")),
    )