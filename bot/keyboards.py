from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo


def role_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="👨‍🎓 O‘quvchi", callback_data="role:student")],
            [InlineKeyboardButton(text="👨‍🏫 O‘qituvchi", callback_data="role:teacher")],
        ]
    )


def list_keyboard(prefix: str, values: list[str], row_width: int = 1) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    current_row: list[InlineKeyboardButton] = []

    for value in values:
        current_row.append(
            InlineKeyboardButton(
                text=value,
                callback_data=f"{prefix}:{value}",
            )
        )
        if len(current_row) >= row_width:
            rows.append(current_row)
            current_row = []

    if current_row:
        rows.append(current_row)

    return InlineKeyboardMarkup(inline_keyboard=rows)


def open_mini_app_keyboard(url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="📱 Ochiq tizim",
                    web_app=WebAppInfo(url=url),
                )
            ]
        ]
    )