from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo


def open_mini_app_kb(mini_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="📱 Открыть школьную систему",
                    web_app=WebAppInfo(url=mini_app_url),
                )
            ]
        ]
    )