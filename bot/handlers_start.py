from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from keyboards import list_keyboard, open_mini_app_keyboard, role_keyboard
from sheets_service import SheetsService
from states import RegistrationStates


def build_start_router(sheets: SheetsService, mini_app_url: str) -> Router:
    router = Router()

    @router.message(CommandStart())
    async def cmd_start(message: Message, state: FSMContext) -> None:
        if not message.from_user:
            return

        telegram_id = message.from_user.id
        existing_user = sheets.user_by_telegram_id(telegram_id)

        await state.clear()

        if existing_user:
            await message.answer(
                "Siz allaqachon ro‘yxatdan o‘tgansiz.\n\n👇 Tizimga kirish uchun tugmani bosing.",
                reply_markup=open_mini_app_keyboard(mini_app_url),
            )
            return

        await state.set_state(RegistrationStates.choosing_role)
        await message.answer(
            "Assalomu alaykum.\n\nSiz kimsiz?",
            reply_markup=role_keyboard(),
        )

    @router.callback_query(RegistrationStates.choosing_role, F.data.startswith("role:"))
    async def choose_role(callback: CallbackQuery, state: FSMContext) -> None:
        if not callback.data or not callback.message:
            return

        role = callback.data.split(":", 1)[1]
        await state.update_data(role=role)

        if role == "student":
            classes = sheets.get_student_classes()
            await state.set_state(RegistrationStates.choosing_student_class)
            await callback.message.edit_text(
                "Sinfingizni tanlang:",
                reply_markup=list_keyboard("student_class", classes, row_width=2),
            )
        else:
            subjects = sheets.get_teacher_subjects()
            await state.set_state(RegistrationStates.choosing_teacher_subject)
            await callback.message.edit_text(
                "Faningizni tanlang:",
                reply_markup=list_keyboard("teacher_subject", subjects, row_width=2),
            )

        await callback.answer()

    @router.callback_query(
        RegistrationStates.choosing_student_class,
        F.data.startswith("student_class:")
    )
    async def choose_student_class(callback: CallbackQuery, state: FSMContext) -> None:
        if not callback.data or not callback.message:
            return

        class_name = callback.data.split(":", 1)[1]
        students = sheets.get_students_by_class(class_name)

        await state.update_data(class_name=class_name)
        await state.set_state(RegistrationStates.choosing_student_name)

        await callback.message.edit_text(
            "O‘zingizni tanlang:",
            reply_markup=list_keyboard("student_name", students, row_width=1),
        )
        await callback.answer()

    @router.callback_query(
        RegistrationStates.choosing_student_name,
        F.data.startswith("student_name:")
    )
    async def choose_student_name(callback: CallbackQuery, state: FSMContext) -> None:
        if not callback.data or not callback.from_user or not callback.message:
            return

        selected_name = callback.data.split(":", 1)[1]
        data = await state.get_data()
        class_name = data.get("class_name", "")
        role = data.get("role", "student")

        user = callback.from_user

        sheets.append_user(
            telegram_id=user.id,
            first_name=user.first_name or "",
            last_name=user.last_name or "",
            username=user.username or "",
            role=role,
            class_name=class_name,
            selected_name=selected_name,
        )

        await state.clear()

        await callback.message.edit_text(
            f"Ro‘yxatdan o‘tish yakunlandi.\n\nSiz: {selected_name}\nSinf: {class_name}"
        )
        await callback.message.answer(
            "👇 Endi tizimga kirishingiz mumkin.",
            reply_markup=open_mini_app_keyboard(mini_app_url),
        )
        await callback.answer()

    @router.callback_query(
        RegistrationStates.choosing_teacher_subject,
        F.data.startswith("teacher_subject:")
    )
    async def choose_teacher_subject(callback: CallbackQuery, state: FSMContext) -> None:
        if not callback.data or not callback.message:
            return

        subject = callback.data.split(":", 1)[1]
        teachers = sheets.get_teachers_by_subject(subject)

        await state.update_data(subject=subject)
        await state.set_state(RegistrationStates.choosing_teacher_name)

        await callback.message.edit_text(
            "O‘zingizni tanlang:",
            reply_markup=list_keyboard("teacher_name", teachers, row_width=1),
        )
        await callback.answer()

    @router.callback_query(
        RegistrationStates.choosing_teacher_name,
        F.data.startswith("teacher_name:")
    )
    async def choose_teacher_name(callback: CallbackQuery, state: FSMContext) -> None:
        if not callback.data or not callback.from_user or not callback.message:
            return

        selected_name = callback.data.split(":", 1)[1]
        data = await state.get_data()
        role = data.get("role", "teacher")

        user = callback.from_user

        sheets.append_user(
            telegram_id=user.id,
            first_name=user.first_name or "",
            last_name=user.last_name or "",
            username=user.username or "",
            role=role,
            class_name="",
            selected_name=selected_name,
        )

        sheets.update_teacher_telegram_id(selected_name, user.id)

        await state.clear()

        await callback.message.edit_text(
            f"Ro‘yxatdan o‘tish yakunlandi.\n\nSiz: {selected_name}"
        )
        await callback.message.answer(
            "👇 Endi tizimga kirishingiz mumkin.",
            reply_markup=open_mini_app_keyboard(mini_app_url),
        )
        await callback.answer()

    return router