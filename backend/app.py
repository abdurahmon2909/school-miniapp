from __future__ import annotations

import json
import os
from datetime import datetime
from functools import lru_cache
from typing import Any
from zoneinfo import ZoneInfo

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

TZ = ZoneInfo("Asia/Tashkent")

WEEKDAY_MAP = {
    "Monday": "Dushanba",
    "Tuesday": "Seshanba",
    "Wednesday": "Chorshanba",
    "Thursday": "Payshanba",
    "Friday": "Juma",
    "Saturday": "Shanba",
    "Sunday": "Yakshanba",
}


app = FastAPI(title="School Mini App Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_local() -> datetime:
    return datetime.now(TZ)


def today_weekday_uz() -> str:
    return WEEKDAY_MAP.get(now_local().strftime("%A"), now_local().strftime("%A"))


def today_iso() -> str:
    return now_local().strftime("%Y-%m-%d")


def now_str() -> str:
    return now_local().strftime("%Y-%m-%d %H:%M:%S")


def normalize(value: Any) -> str:
    return str(value or "").strip()


def normalize_lower(value: Any) -> str:
    return normalize(value).lower()


def to_bool(value: Any, default: bool = False) -> bool:
    text = normalize_lower(value)
    if text in {"1", "true", "yes", "ha", "active", "on"}:
        return True
    if text in {"0", "false", "no", "yoq", "yo'q", "off", "inactive"}:
        return False
    return default


def to_int(value: Any, default: int = 0) -> int:
    text = normalize(value)
    if text.isdigit():
        return int(text)
    try:
        return int(float(text))
    except Exception:
        return default


def split_teachers_from_row(row: dict[str, Any]) -> list[str]:
    t1 = normalize(row.get("teacher_1"))
    t2 = normalize(row.get("teacher_2"))
    return [t for t in [t1, t2] if t]


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
        return gc.open_by_key(GOOGLE_SHEET_ID)
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


def get_next_id(ws_name: str, id_column: str) -> int:
    rows = get_all_records(ws_name)
    max_id = 0
    for row in rows:
        max_id = max(max_id, to_int(row.get(id_column), 0))
    return max_id + 1


def is_poll_allowed_for_row(row: dict[str, Any]) -> bool:
    return to_bool(row.get("poll_allowed"), default=True)


def get_today_lessons_for_student(class_name: str) -> list[dict[str, Any]]:
    weekday = today_weekday_uz()
    rows = get_all_records("schedule")

    lessons: list[dict[str, Any]] = []
    for row in rows:
        if normalize(row.get("class_name")) != normalize(class_name):
            continue
        if normalize(row.get("weekday")) != weekday:
            continue

        lessons.append(
            {
                "lesson_number": to_int(row.get("lesson_number")),
                "start_time": normalize(row.get("start_time")),
                "end_time": normalize(row.get("end_time")),
                "subject_name": normalize(row.get("subject_name")),
                "teachers": split_teachers_from_row(row),
                "poll_allowed": is_poll_allowed_for_row(row),
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

        teachers = split_teachers_from_row(row)
        if teacher_name not in teachers:
            continue

        lessons.append(
            {
                "lesson_number": to_int(row.get("lesson_number")),
                "start_time": normalize(row.get("start_time")),
                "end_time": normalize(row.get("end_time")),
                "subject_name": normalize(row.get("subject_name")),
                "teachers": teachers,
                "class_name": normalize(row.get("class_name")),
                "poll_allowed": False,
            }
        )

    lessons.sort(key=lambda x: (x["start_time"], x["lesson_number"]))
    return lessons


def get_today_poll_sessions_for_user(telegram_id: int) -> list[dict[str, Any]]:
    rows = get_all_records("poll_sessions")
    today = today_iso()

    result = []
    for row in rows:
        if normalize(row.get("telegram_id")) != str(telegram_id):
            continue
        if normalize(row.get("poll_date")) != today:
            continue
        result.append(row)
    return result


def get_poll_answers_by_poll_ids(poll_ids: set[int]) -> list[dict[str, Any]]:
    if not poll_ids:
        return []

    rows = get_all_records("poll_answers")
    result = []
    for row in rows:
        if to_int(row.get("poll_id")) in poll_ids:
            result.append(row)
    return result


def find_existing_poll_session(
    telegram_id: int,
    class_name: str,
    subject_name: str,
    lesson_number: int,
    teacher_name: str,
    selected_name: str,
) -> dict[str, Any] | None:
    rows = get_all_records("poll_sessions")
    today = today_iso()

    for row in rows:
        if normalize(row.get("telegram_id")) != str(telegram_id):
            continue
        if normalize(row.get("poll_date")) != today:
            continue
        if normalize(row.get("class_name")) != class_name:
            continue
        if normalize(row.get("subject_name")) != subject_name:
            continue
        if to_int(row.get("lesson_number")) != lesson_number:
            continue

        teachers = [
            normalize(row.get("teacher_1")),
            normalize(row.get("teacher_2")),
        ]
        if teacher_name not in teachers:
            continue

        if selected_name and normalize(row.get("selected_name")) not in {"", selected_name}:
            continue

        return row

    return None


def create_poll_session(
    telegram_id: int,
    selected_name: str,
    class_name: str,
    subject_name: str,
    teacher_1: str,
    teacher_2: str,
    lesson_number: int,
) -> int:
    ws = safe_ws("poll_sessions")
    poll_id = get_next_id("poll_sessions", "poll_id")
    created_at = now_str()
    poll_date = today_iso()
    end_time = f"{poll_date} 23:59:59"

    ws.append_row(
        [
            poll_id,
            telegram_id,
            selected_name,
            class_name,
            poll_date,
            subject_name,
            teacher_1,
            teacher_2,
            lesson_number,
            created_at,
            end_time,
            "active",
        ],
        value_input_option="USER_ENTERED",
    )

    return poll_id


def update_teacher_rating_summary(teacher_name: str) -> None:
    answers_rows = get_all_records("poll_answers")

    total_votes = 0
    score_sum = 0

    for row in answers_rows:
        if normalize(row.get("chosen_teacher")) != teacher_name:
            continue

        score = to_int(row.get("score_value"), 0)
        if score < 1 or score > 10:
            continue

        total_votes += 1
        score_sum += score

    avg_score = round(score_sum / total_votes, 2) if total_votes > 0 else 0
    last_updated = now_str()

    ws = safe_ws("teacher_rating_summary")
    rows = ws.get_all_records()

    existing_row_index = None
    for idx, row in enumerate(rows, start=2):
        if normalize(row.get("teacher_name")) == teacher_name:
            existing_row_index = idx
            break

    values = [
        teacher_name,
        avg_score,
        total_votes,
        last_updated,
    ]

    if existing_row_index:
        ws.update(f"A{existing_row_index}:D{existing_row_index}", [values])
    else:
        ws.append_row(values, value_input_option="USER_ENTERED")


def append_teacher_feedback(
    poll_id: int,
    teacher_name: str,
    score_value: int,
    anonymous_comment: str,
) -> None:
    comment = normalize(anonymous_comment)
    if not comment:
        return

    ws = safe_ws("teacher_feedback")
    feedback_id = get_next_id("teacher_feedback", "feedback_id")

    ws.append_row(
        [
            feedback_id,
            poll_id,
            teacher_name,
            score_value,
            comment,
            now_str(),
        ],
        value_input_option="USER_ENTERED",
    )


def get_teacher_rating_summary_map() -> dict[str, dict[str, Any]]:
    rows = get_all_records("teacher_rating_summary")
    result: dict[str, dict[str, Any]] = {}

    for row in rows:
        teacher_name = normalize(row.get("teacher_name"))
        if not teacher_name:
            continue

        result[teacher_name] = {
            "teacher_name": teacher_name,
            "avg_score": float(normalize(row.get("avg_score")) or 0),
            "total_votes": to_int(row.get("total_votes"), 0),
            "last_updated": normalize(row.get("last_updated")),
        }

    return result


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
    answered_at: str = ""


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
    return {"ok": True, "time": now_str()}


@app.get("/debug/sheets")
def debug_sheets():
    titles = [ws.title for ws in get_spreadsheet().worksheets()]
    return {"ok": True, "sheets": titles}


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

    if profile_data["role"] == "teacher":
        summary_map = get_teacher_rating_summary_map()
        profile_data["rating"] = summary_map.get(
            profile_data["selected_name"],
            {"teacher_name": profile_data["selected_name"], "avg_score": 0, "total_votes": 0, "last_updated": ""},
        )
    else:
        profile_data["rating"] = None

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
        full_name = normalize(row.get("full_name"))
        class_name = normalize(row.get("class_name"))

        if not full_name or not class_name:
            continue

        classes_set.add(class_name)
        students.append(
            {
                "name": full_name,
                "class_name": class_name,
            }
        )

    subjects_set: set[str] = set()
    teachers: list[dict[str, str]] = []

    for row in teachers_rows:
        teacher_name = normalize(row.get("teacher_name"))
        subject_name = normalize(row.get("subject"))

        if not teacher_name or not subject_name:
            continue

        subjects_set.add(subject_name)
        teachers.append(
            {
                "name": teacher_name,
                "subject_name": subject_name,
                "telegram_id": normalize(row.get("telegram_id")),
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

    values = [
        str(payload.telegram_id),
        normalize(payload.first_name),
        normalize(payload.last_name),
        normalize(payload.username),
        role,
        selected_name,
        class_name,
        subject_name,
        now_str(),
    ]

    if existing_row_index:
        ws.update(f"A{existing_row_index}:I{existing_row_index}", [values])
    else:
        ws.append_row(values, value_input_option="USER_ENTERED")

    return {
        "ok": True,
        "profile": {
            "telegram_id": payload.telegram_id,
            "role": role,
            "selected_name": selected_name,
            "class_name": class_name,
            "subject_name": subject_name,
            "username": normalize(payload.username),
            "first_name": normalize(payload.first_name),
            "last_name": normalize(payload.last_name),
        },
    }


@app.get("/announcements")
def announcements():
    rows = get_all_records("announcements")
    today = today_iso()

    result = []
    for row in rows:
        text = normalize(row.get("text"))
        if not text:
            continue

        if not to_bool(row.get("is_active"), default=True):
            continue

        starts_at = normalize(row.get("starts_at"))
        ends_at = normalize(row.get("ends_at"))
        sort_order = to_int(row.get("sort_order"), 9999)

        if starts_at and today < starts_at:
            continue
        if ends_at and today > ends_at:
            continue

        result.append(
            {
                "id": normalize(row.get("id")),
                "text": text,
                "_sort_order": sort_order,
            }
        )

    result.sort(key=lambda x: x["_sort_order"])

    return {
        "announcements": [{"id": r["id"], "text": r["text"]} for r in result]
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
    else:
        raise HTTPException(status_code=400, detail="Noto‘g‘ri role")

    rated_teachers_by_lesson: dict[tuple[int, str], list[str]] = {}

    if role == "student":
        sessions = get_today_poll_sessions_for_user(payload.telegram_id)
        poll_ids = {to_int(s.get("poll_id")) for s in sessions}
        answers = get_poll_answers_by_poll_ids(poll_ids)

        sessions_map: dict[int, dict[str, Any]] = {
            to_int(s.get("poll_id")): s for s in sessions
        }

        for answer in answers:
            poll_id = to_int(answer.get("poll_id"))
            session = sessions_map.get(poll_id)
            if not session:
                continue

            lesson_number = to_int(session.get("lesson_number"))
            subject_name = normalize(session.get("subject_name"))
            chosen_teacher = normalize(answer.get("chosen_teacher"))

            key = (lesson_number, subject_name)
            rated_teachers_by_lesson.setdefault(key, [])
            if chosen_teacher and chosen_teacher not in rated_teachers_by_lesson[key]:
                rated_teachers_by_lesson[key].append(chosen_teacher)

    result_lessons = []
    for lesson in base_lessons:
        lesson_number = to_int(lesson.get("lesson_number"))
        subject_name = normalize(lesson.get("subject_name"))
        teachers = lesson.get("teachers", [])

        rated_teachers = rated_teachers_by_lesson.get((lesson_number, subject_name), [])
        rated = len(rated_teachers) > 0

        item = {
            "lesson_number": lesson_number,
            "start_time": normalize(lesson.get("start_time")),
            "end_time": normalize(lesson.get("end_time")),
            "subject_name": subject_name,
            "teachers": teachers,
            "rated": rated,
            "rated_teachers": rated_teachers,
            "poll_allowed": bool(lesson.get("poll_allowed")) if role == "student" else False,
        }

        if role == "teacher":
            item["class_name"] = normalize(lesson.get("class_name"))

        result_lessons.append(item)

    return {
        "telegram_id": payload.telegram_id,
        "role": role,
        "selected_name": selected_name,
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

    selected_name = normalize(registration.get("selected_name"))
    class_name = normalize(registration.get("class_name"))
    subject_name = normalize(payload.subject_name)
    teacher_name = normalize(payload.teacher_name)

    if not class_name:
        raise HTTPException(status_code=400, detail="class_name topilmadi")

    if not subject_name:
        raise HTTPException(status_code=400, detail="subject_name majburiy")

    if not teacher_name:
        raise HTTPException(status_code=400, detail="teacher_name majburiy")

    today_lessons = get_today_lessons_for_student(class_name)

    target_lesson = None
    for lesson in today_lessons:
        if to_int(lesson.get("lesson_number")) != payload.lesson_number:
            continue
        if normalize(lesson.get("subject_name")) != subject_name:
            continue
        if teacher_name not in lesson.get("teachers", []):
            continue
        target_lesson = lesson
        break

    if not target_lesson:
        raise HTTPException(status_code=400, detail="Bugungi darsdan mos teacher topilmadi")

    if not bool(target_lesson.get("poll_allowed")):
        raise HTTPException(status_code=400, detail="Bu dars uchun baholash o‘chiq emas")

    existing_session = find_existing_poll_session(
        telegram_id=payload.telegram_id,
        class_name=class_name,
        subject_name=subject_name,
        lesson_number=payload.lesson_number,
        teacher_name=teacher_name,
        selected_name=selected_name,
    )

    if existing_session:
        poll_id = to_int(existing_session.get("poll_id"))
    else:
        teachers = target_lesson.get("teachers", [])
        teacher_1 = teachers[0] if len(teachers) > 0 else ""
        teacher_2 = teachers[1] if len(teachers) > 1 else ""
        poll_id = create_poll_session(
            telegram_id=payload.telegram_id,
            selected_name=selected_name,
            class_name=class_name,
            subject_name=subject_name,
            teacher_1=teacher_1,
            teacher_2=teacher_2,
            lesson_number=payload.lesson_number,
        )

    answers_rows = get_all_records("poll_answers")
    for row in answers_rows:
        if to_int(row.get("poll_id")) != poll_id:
            continue
        if normalize(row.get("telegram_id")) != str(payload.telegram_id):
            continue
        if normalize(row.get("chosen_teacher")) != teacher_name:
            continue
        raise HTTPException(status_code=400, detail="Bu o‘qituvchi allaqachon baholangan")

    answer_id = get_next_id("poll_answers", "answer_id")

    opened_at = normalize(payload.opened_at)
    answered_at = normalize(payload.answered_at) or now_str()

    response_seconds = 0
    if opened_at:
        try:
            dt_open = datetime.strptime(opened_at, "%Y-%m-%d %H:%M:%S").replace(tzinfo=TZ)
            dt_ans = datetime.strptime(answered_at, "%Y-%m-%d %H:%M:%S").replace(tzinfo=TZ)
            response_seconds = max(0, int((dt_ans - dt_open).total_seconds()))
        except Exception:
            response_seconds = 0

    safe_ws("poll_answers").append_row(
        [
            answer_id,
            poll_id,
            payload.telegram_id,
            class_name,
            subject_name,
            "manual",
            teacher_name,
            payload.score_value,
            normalize(payload.anonymous_comment),
            opened_at,
            answered_at,
            response_seconds,
        ],
        value_input_option="USER_ENTERED",
    )

    append_teacher_feedback(
        poll_id=poll_id,
        teacher_name=teacher_name,
        score_value=payload.score_value,
        anonymous_comment=payload.anonymous_comment,
    )

    update_teacher_rating_summary(teacher_name)

    return {
        "ok": True,
        "message": "Baholash saqlandi",
        "poll_id": poll_id,
        "answer_id": answer_id,
        "teacher_rating_updated": True,
    }


@app.get("/top-teachers")
def top_teachers(limit: int = 5):
    rows = get_all_records("teacher_rating_summary")

    items = []
    for row in rows:
        teacher_name = normalize(row.get("teacher_name"))
        if not teacher_name:
            continue

        items.append(
            {
                "teacher_name": teacher_name,
                "avg_score": float(normalize(row.get("avg_score")) or 0),
                "total_votes": to_int(row.get("total_votes"), 0),
                "last_updated": normalize(row.get("last_updated")),
            }
        )

    items.sort(key=lambda x: (-x["avg_score"], -x["total_votes"], x["teacher_name"]))
    return {
        "top_teachers": items[: max(1, min(limit, 20))]
    }


@app.get("/teacher-rating")
def teacher_rating(teacher_name: str):
    teacher_name = normalize(teacher_name)
    if not teacher_name:
        raise HTTPException(status_code=400, detail="teacher_name majburiy")

    summary_map = get_teacher_rating_summary_map()
    return {
        "teacher": summary_map.get(
            teacher_name,
            {
                "teacher_name": teacher_name,
                "avg_score": 0,
                "total_votes": 0,
                "last_updated": "",
            },
        )
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)