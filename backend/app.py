from __future__ import annotations

import json
import os
from datetime import datetime
from functools import lru_cache
from typing import Any

import gspread
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2.service_account import Credentials
from pydantic import BaseModel, Field


GOOGLE_CREDS = os.getenv("GOOGLE_CREDS", "").strip()
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "").strip()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


app = FastAPI(title="School Mini App Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


WEEKDAY_MAP = {
    "Monday": "Dushanba",
    "Tuesday": "Seshanba",
    "Wednesday": "Chorshanba",
    "Thursday": "Payshanba",
    "Friday": "Juma",
    "Saturday": "Shanba",
    "Sunday": "Yakshanba",
}


def now_local() -> datetime:
    return datetime.now()


def today_weekday_uz() -> str:
    return WEEKDAY_MAP.get(now_local().strftime("%A"), now_local().strftime("%A"))


def today_iso() -> str:
    return now_local().strftime("%Y-%m-%d")


def normalize(value: Any) -> str:
    return str(value or "").strip()


def normalize_lower(value: Any) -> str:
    return normalize(value).lower()


def split_teachers(raw: str) -> list[str]:
    value = normalize(raw)
    if not value:
        return []

    parts = []
    for chunk in value.replace(";", ",").split(","):
        item = chunk.strip()
        if item:
            parts.append(item)
    return parts


def to_bool(value: Any, default: bool = False) -> bool:
    text = normalize_lower(value)
    if text in {"1", "true", "yes", "ha", "active", "on"}:
        return True
    if text in {"0", "false", "no", "yoq", "yo'q", "off", "inactive"}:
        return False
    return default


@lru_cache(maxsize=1)
def get_spreadsheet():
    if not GOOGLE_CREDS:
        raise HTTPException(status_code=500, detail="GOOGLE_CREDS topilmadi")

    if not GOOGLE_SHEET_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_SHEET_ID topilmadi")

    try:
        creds_info = json.loads(GOOGLE_CREDS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GOOGLE_CREDS JSON xato: {e}")

    try:
        credentials = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
        gc = gspread.authorize(credentials)
        spreadsheet = gc.open_by_key(GOOGLE_SHEET_ID)
        return spreadsheet
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Sheet ulanish xatosi: {e}")


def safe_ws(title: str):
    try:
        spreadsheet = get_spreadsheet()
        return spreadsheet.worksheet(title)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail=f"'{title}' varaq topilmadi")


def get_all_records(ws_name: str) -> list[dict[str, Any]]:
    ws = safe_ws(ws_name)
    return ws.get_all_records()


def find_registration_by_telegram_id(telegram_id: int) -> dict[str, Any] | None:
    rows = get_all_records("registrations")
    for row in rows:
        if normalize(row.get("telegram_id")) == str(telegram_id):
            return row
    return None


def get_next_poll_id() -> int:
    rows = get_all_records("poll_answers")
    max_id = 0
    for row in rows:
        raw = normalize(row.get("id"))
        if raw.isdigit():
            max_id = max(max_id, int(raw))
    return max_id + 1


def get_today_lessons_for_student(class_name: str) -> list[dict[str, Any]]:
    weekday = today_weekday_uz()
    rows = get_all_records("schedule")

    lessons: list[dict[str, Any]] = []
    for row in rows:
        if normalize(row.get("class_name")) != normalize(class_name):
            continue
        if normalize(row.get("weekday")) != weekday:
            continue

        teachers = split_teachers(row.get("teacher_name", ""))

        lessons.append(
            {
                "poll_id": int(normalize(row.get("id")) or "0"),
                "lesson_number": int(normalize(row.get("lesson_number")) or "0"),
                "start_time": normalize(row.get("start_time")),
                "end_time": normalize(row.get("end_time")),
                "subject_name": normalize(row.get("subject_name")),
                "teachers": teachers,
            }
        )

    lessons.sort(key=lambda x: x["lesson_number"])
    return lessons


def get_today_lessons_for_teacher(teacher_name: str) -> list[dict[str, Any]]:
    weekday = today_weekday_uz()
    rows = get_all_records("schedule")

    lessons: list[dict[str, Any]] = []
    for row in rows:
        if normalize(row.get("weekday")) != weekday:
            continue

        teachers = split_teachers(row.get("teacher_name", ""))
        if teacher_name not in teachers:
            continue

        lessons.append(
            {
                "poll_id": int(normalize(row.get("id")) or "0"),
                "lesson_number": int(normalize(row.get("lesson_number")) or "0"),
                "start_time": normalize(row.get("start_time")),
                "end_time": normalize(row.get("end_time")),
                "subject_name": normalize(row.get("subject_name")),
                "teachers": teachers,
                "class_name": normalize(row.get("class_name")),
            }
        )

    lessons.sort(key=lambda x: (x["start_time"], x["lesson_number"]))
    return lessons


def get_today_ratings_for_user(telegram_id: int) -> list[dict[str, Any]]:
    rows = get_all_records("poll_answers")
    today = today_iso()

    result = []
    for row in rows:
        if normalize(row.get("telegram_id")) != str(telegram_id):
            continue
        if normalize(row.get("date")) != today:
            continue
        result.append(row)
    return result


def is_poll_allowed() -> bool:
    return True


class TelegramIdRequest(BaseModel):
    telegram_id: int


class SubmitRatingRequest(BaseModel):
    telegram_id: int
    lesson_number: int
    subject_name: str
    teacher_name: str
    score_value: int = Field(ge=1, le=10)
    anonymous_comment: str = ""
    opened_at: str = ""


class RegisterProfileRequest(BaseModel):
    telegram_id: int
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    role: str
    selected_name: str
    class_name: str = ""
    subject_name: str = ""


@app.get("/")
def root():
    return {"ok": True, "service": "school-miniapp-backend"}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/profile")
def profile(payload: TelegramIdRequest):
    row = find_registration_by_telegram_id(payload.telegram_id)

    if not row:
        return {
            "registered": False,
            "profile": None,
        }

    profile_data = {
        "telegram_id": payload.telegram_id,
        "role": normalize_lower(row.get("role")) or "student",
        "selected_name": normalize(row.get("selected_name")),
        "class_name": normalize(row.get("class_name")),
        "subject_name": normalize(row.get("subject_name")),
        "username": normalize(row.get("username")),
        "first_name": normalize(row.get("first_name")),
        "last_name": normalize(row.get("last_name")),
    }

    return {
        "registered": True,
        "profile": profile_data,
    }


@app.get("/registration-options")
def registration_options():
    students_rows = get_all_records("students_list")
    teachers_rows = get_all_records("teachers_list")

    classes_set: set[str] = set()
    students: list[dict[str, str]] = []

    for row in students_rows:
        name = normalize(row.get("name"))
        class_name = normalize(row.get("class_name"))

        if not name or not class_name:
            continue

        classes_set.add(class_name)
        students.append(
            {
                "name": name,
                "class_name": class_name,
            }
        )

    subjects_set: set[str] = set()
    teachers: list[dict[str, str]] = []

    for row in teachers_rows:
        name = normalize(row.get("name"))
        subject_name = normalize(row.get("subject_name"))

        if not name or not subject_name:
            continue

        subjects_set.add(subject_name)
        teachers.append(
            {
                "name": name,
                "subject_name": subject_name,
            }
        )

    return {
        "classes": sorted(classes_set),
        "students": students,
        "subjects": sorted(subjects_set),
        "teachers": teachers,
    }


@app.post("/register-profile")
def register_profile(payload: RegisterProfileRequest):
    role = normalize_lower(payload.role)
    selected_name = normalize(payload.selected_name)
    class_name = normalize(payload.class_name)
    subject_name = normalize(payload.subject_name)

    if role not in {"student", "teacher"}:
        raise HTTPException(status_code=400, detail="Noto‘g‘ri role")

    if not selected_name:
        raise HTTPException(status_code=400, detail="selected_name majburiy")

    if role == "student" and not class_name:
        raise HTTPException(status_code=400, detail="O‘quvchi uchun class_name majburiy")

    if role == "teacher" and not subject_name:
        raise HTTPException(status_code=400, detail="O‘qituvchi uchun subject_name majburiy")

    ws = safe_ws("registrations")
    rows = ws.get_all_records()

    existing_row_index = None
    for idx, row in enumerate(rows, start=2):
        if normalize(row.get("telegram_id")) == str(payload.telegram_id):
            existing_row_index = idx
            break

    now_str = now_local().strftime("%Y-%m-%d %H:%M:%S")

    values = [
        str(payload.telegram_id),
        normalize(payload.first_name),
        normalize(payload.last_name),
        normalize(payload.username),
        role,
        selected_name,
        class_name,
        subject_name,
        now_str,
    ]

    if existing_row_index:
        ws.update(f"A{existing_row_index}:I{existing_row_index}", [values])
    else:
        ws.append_row(values, value_input_option="USER_ENTERED")

    profile_data = {
        "telegram_id": payload.telegram_id,
        "role": role,
        "selected_name": selected_name,
        "class_name": class_name,
        "subject_name": subject_name,
        "username": normalize(payload.username),
        "first_name": normalize(payload.first_name),
        "last_name": normalize(payload.last_name),
    }

    return {
        "ok": True,
        "profile": profile_data,
    }


@app.get("/announcements")
def announcements():
    rows = get_all_records("announcements")
    today_str = today_iso()

    result = []
    for row in rows:
        text = normalize(row.get("text"))
        if not text:
            continue

        is_active = to_bool(row.get("is_active"), default=True)
        if not is_active:
            continue

        starts_at = normalize(row.get("starts_at"))
        ends_at = normalize(row.get("ends_at"))
        sort_order = normalize(row.get("sort_order")) or "9999"

        if starts_at and today_str < starts_at:
            continue
        if ends_at and today_str > ends_at:
            continue

        result.append(
            {
                "id": normalize(row.get("id")) or "",
                "text": text,
                "_sort_order": int(sort_order) if sort_order.isdigit() else 9999,
            }
        )

    result.sort(key=lambda x: x["_sort_order"])

    return {
        "announcements": [
            {"id": item["id"], "text": item["text"]}
            for item in result
        ]
    }


@app.post("/today-lessons")
def today_lessons(payload: TelegramIdRequest):
    registration = find_registration_by_telegram_id(payload.telegram_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Foydalanuvchi ro‘yxatdan o‘tmagan")

    role = normalize_lower(registration.get("role"))
    selected_name = normalize(registration.get("selected_name"))
    class_name = normalize(registration.get("class_name"))

    if role == "student":
        if not class_name:
            raise HTTPException(status_code=400, detail="O‘quvchi uchun class_name topilmadi")
        base_lessons = get_today_lessons_for_student(class_name)
    elif role == "teacher":
        if not selected_name:
            raise HTTPException(status_code=400, detail="O‘qituvchi nomi topilmadi")
        base_lessons = get_today_lessons_for_teacher(selected_name)
        class_name = class_name or "-"
    else:
        raise HTTPException(status_code=400, detail="Noto‘g‘ri role")

    today_user_ratings = get_today_ratings_for_user(payload.telegram_id)

    result_lessons = []
    for lesson in base_lessons:
        lesson_number = lesson.get("lesson_number")
        subject_name = normalize(lesson.get("subject_name"))
        teachers = lesson.get("teachers", [])

        matching_ratings = []
        for rating in today_user_ratings:
            if int(normalize(rating.get("lesson_number")) or "0") != int(lesson_number or 0):
                continue
            if normalize(rating.get("subject_name")) != subject_name:
                continue
            matching_ratings.append(rating)

        rated_teachers = [
            normalize(r.get("teacher_name"))
            for r in matching_ratings
            if normalize(r.get("teacher_name"))
        ]
        rated = len(rated_teachers) > 0

        result_lessons.append(
            {
                "poll_id": int(lesson.get("poll_id") or 0),
                "lesson_number": int(lesson_number or 0),
                "start_time": normalize(lesson.get("start_time")),
                "end_time": normalize(lesson.get("end_time")),
                "subject_name": subject_name,
                "teachers": teachers,
                "rated": rated,
                "rated_teachers": rated_teachers,
                "poll_allowed": is_poll_allowed() if role == "student" else False,
            }
        )

    return {
        "telegram_id": payload.telegram_id,
        "class_name": class_name,
        "date": today_iso(),
        "weekday": today_weekday_uz(),
        "lessons": result_lessons,
    }


@app.post("/submit-rating")
def submit_rating(payload: SubmitRatingRequest):
    registration = find_registration_by_telegram_id(payload.telegram_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Foydalanuvchi ro‘yxatdan o‘tmagan")

    role = normalize_lower(registration.get("role"))
    if role != "student":
        raise HTTPException(status_code=403, detail="Faqat o‘quvchi baho bera oladi")

    student_name = normalize(registration.get("selected_name"))
    class_name = normalize(registration.get("class_name"))
    teacher_name = normalize(payload.teacher_name)
    subject_name = normalize(payload.subject_name)

    if not teacher_name:
        raise HTTPException(status_code=400, detail="teacher_name majburiy")

    if not subject_name:
        raise HTTPException(status_code=400, detail="subject_name majburiy")

    if not is_poll_allowed():
        raise HTTPException(status_code=400, detail="Baholash vaqti yopilgan")

    ws = safe_ws("poll_answers")
    rows = ws.get_all_records()
    today_str = today_iso()

    for row in rows:
        if normalize(row.get("telegram_id")) != str(payload.telegram_id):
            continue
        if normalize(row.get("date")) != today_str:
            continue
        if int(normalize(row.get("lesson_number")) or "0") != payload.lesson_number:
            continue
        if normalize(row.get("subject_name")) != subject_name:
            continue
        if normalize(row.get("teacher_name")) != teacher_name:
            continue

        raise HTTPException(status_code=400, detail="Bu o‘qituvchi bugun allaqachon baholangan")

    next_id = get_next_poll_id()
    created_at = now_local().strftime("%Y-%m-%d %H:%M:%S")

    ws.append_row(
        [
            next_id,
            payload.telegram_id,
            student_name,
            class_name,
            payload.lesson_number,
            subject_name,
            teacher_name,
            payload.score_value,
            normalize(payload.anonymous_comment),
            normalize(payload.opened_at),
            created_at,
            today_str,
        ],
        value_input_option="USER_ENTERED",
    )

    return {
        "ok": True,
        "message": "Baholash saqlandi",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)