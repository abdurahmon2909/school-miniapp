from __future__ import annotations

import json
import os
import time
from datetime import datetime
from threading import Lock
from zoneinfo import ZoneInfo

import gspread
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2.service_account import Credentials
from pydantic import BaseModel, Field


GOOGLE_CREDS = os.getenv("GOOGLE_CREDS", "").strip()
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "").strip()

if not GOOGLE_CREDS:
    raise ValueError("GOOGLE_CREDS topilmadi")

if not GOOGLE_SHEET_ID:
    raise ValueError("GOOGLE_SHEET_ID topilmadi")


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


def now_tashkent() -> datetime:
    return datetime.now(TZ)


def now_str() -> str:
    return now_tashkent().strftime("%Y-%m-%d %H:%M:%S")


def today_date_str() -> str:
    return now_tashkent().strftime("%Y-%m-%d")


def weekday_uz() -> str:
    return WEEKDAY_MAP[now_tashkent().strftime("%A")]


class SheetsDB:
    CACHE_TTL_SECONDS = 20

    def __init__(self) -> None:
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]

        creds_dict = json.loads(GOOGLE_CREDS)
        creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")

        credentials = Credentials.from_service_account_info(
            creds_dict,
            scopes=scopes,
        )

        client = gspread.authorize(credentials)
        self.sh = client.open_by_key(GOOGLE_SHEET_ID)

        self.users_ws = self.sh.worksheet("users")
        self.schedule_ws = self.sh.worksheet("schedule")
        self.poll_sessions_ws = self.sh.worksheet("poll_sessions")
        self.poll_answers_ws = self.sh.worksheet("poll_answers")
        self.teacher_feedback_ws = self.sh.worksheet("teacher_feedback")

        self._cache: dict[str, dict] = {}
        self._lock = Lock()

    @staticmethod
    def _safe_int(value, default=0) -> int:
        try:
            return int(value)
        except Exception:
            return default

    def _get_cached_records(self, cache_key: str, worksheet) -> list[dict]:
        now_ts = time.time()

        with self._lock:
            cached = self._cache.get(cache_key)
            if cached and now_ts - cached["ts"] < self.CACHE_TTL_SECONDS:
                return cached["rows"]

        rows = worksheet.get_all_records()

        with self._lock:
            self._cache[cache_key] = {
                "ts": now_ts,
                "rows": rows,
            }

        return rows

    def _invalidate_cache(self, *cache_keys: str) -> None:
        with self._lock:
            for key in cache_keys:
                self._cache.pop(key, None)

    def _next_id_from_rows(self, rows: list[dict], column_name: str) -> int:
        max_id = 0
        for row in rows:
            try:
                max_id = max(max_id, int(row.get(column_name, 0) or 0))
            except Exception:
                continue
        return max_id + 1

    def get_users_rows(self) -> list[dict]:
        return self._get_cached_records("users", self.users_ws)

    def get_schedule_rows(self) -> list[dict]:
        return self._get_cached_records("schedule", self.schedule_ws)

    def get_poll_sessions_rows(self) -> list[dict]:
        return self._get_cached_records("poll_sessions", self.poll_sessions_ws)

    def get_poll_answers_rows(self) -> list[dict]:
        return self._get_cached_records("poll_answers", self.poll_answers_ws)

    def get_teacher_feedback_rows(self) -> list[dict]:
        return self._get_cached_records("teacher_feedback", self.teacher_feedback_ws)

    def get_user_by_telegram_id(self, telegram_id: int) -> dict | None:
        rows = self.get_users_rows()
        tg_id_str = str(telegram_id)

        for row in rows:
            if str(row.get("telegram_id", "")).strip() == tg_id_str:
                return row
        return None

    def get_today_lessons_for_class(self, class_name: str) -> list[dict]:
        target_day = weekday_uz()
        rows = self.get_schedule_rows()
        result: list[dict] = []

        class_name = class_name.strip()

        for row in rows:
            if str(row.get("class_name", "")).strip() != class_name:
                continue
            if str(row.get("weekday", "")).strip() != target_day:
                continue

            result.append(
                {
                    "class_name": str(row.get("class_name", "")).strip(),
                    "weekday": str(row.get("weekday", "")).strip(),
                    "lesson_number": self._safe_int(row.get("lesson_number", 0)),
                    "start_time": str(row.get("start_time", "")).strip(),
                    "end_time": str(row.get("end_time", "")).strip(),
                    "subject_name": str(row.get("subject_name", "")).strip(),
                    "teacher_1": str(row.get("teacher_1", "")).strip(),
                    "teacher_2": str(row.get("teacher_2", "")).strip(),
                    "poll_allowed": str(row.get("poll_allowed", "")).strip().upper(),
                }
            )

        result.sort(key=lambda x: x["lesson_number"])
        return result

    def find_poll_session(
        self,
        telegram_id: int,
        poll_date: str,
        subject_name: str,
        lesson_number: int,
    ) -> dict | None:
        rows = self.get_poll_sessions_rows()
        tg_id_str = str(telegram_id)
        subject_name = subject_name.strip()

        for row in rows:
            if (
                str(row.get("telegram_id", "")).strip() == tg_id_str
                and str(row.get("poll_date", "")).strip() == poll_date
                and str(row.get("subject_name", "")).strip() == subject_name
                and self._safe_int(row.get("lesson_number", 0)) == lesson_number
            ):
                return row
        return None

    def create_poll_session_if_missing(
        self,
        telegram_id: int,
        selected_name: str,
        class_name: str,
        subject_name: str,
        teacher_1: str,
        teacher_2: str,
        lesson_number: int,
    ) -> int:
        poll_date = today_date_str()

        existing = self.find_poll_session(
            telegram_id=telegram_id,
            poll_date=poll_date,
            subject_name=subject_name,
            lesson_number=lesson_number,
        )
        if existing:
            return self._safe_int(existing.get("poll_id", 0))

        rows = self.get_poll_sessions_rows()
        poll_id = self._next_id_from_rows(rows, "poll_id")

        self.poll_sessions_ws.append_row(
            [
                poll_id,
                str(telegram_id),
                selected_name,
                class_name,
                poll_date,
                subject_name,
                teacher_1,
                teacher_2,
                lesson_number,
                now_str(),
                f"{poll_date} 23:59:59",
                "active",
            ],
            value_input_option="USER_ENTERED",
        )

        self._invalidate_cache("poll_sessions")
        return poll_id

    def get_answers_for_poll(self, poll_id: int, telegram_id: int) -> list[dict]:
        rows = self.get_poll_answers_rows()
        result: list[dict] = []
        tg_id_str = str(telegram_id)

        for row in rows:
            if (
                self._safe_int(row.get("poll_id", 0)) == poll_id
                and str(row.get("telegram_id", "")).strip() == tg_id_str
            ):
                result.append(row)

        return result

    def has_answer_for_teacher(
        self,
        poll_id: int,
        telegram_id: int,
        teacher_name: str,
    ) -> bool:
        rows = self.get_answers_for_poll(poll_id, telegram_id)
        teacher_name = teacher_name.strip()

        for row in rows:
            if str(row.get("chosen_teacher", "")).strip() == teacher_name:
                return True
        return False

    def append_poll_answer(
        self,
        poll_id: int,
        telegram_id: int,
        class_name: str,
        subject_name: str,
        chosen_teacher: str,
        score_value: int,
        anonymous_comment: str,
        opened_at: str,
    ) -> int:
        rows = self.get_poll_answers_rows()
        answer_id = self._next_id_from_rows(rows, "answer_id")
        answered_at = now_str()

        try:
            dt_opened = datetime.strptime(opened_at, "%Y-%m-%d %H:%M:%S")
            dt_answered = datetime.strptime(answered_at, "%Y-%m-%d %H:%M:%S")
            response_seconds = int((dt_answered - dt_opened).total_seconds())
        except Exception:
            response_seconds = 0

        self.poll_answers_ws.append_row(
            [
                answer_id,
                poll_id,
                str(telegram_id),
                class_name,
                subject_name,
                "manual",
                chosen_teacher,
                score_value,
                anonymous_comment,
                opened_at,
                answered_at,
                response_seconds,
            ],
            value_input_option="USER_ENTERED",
        )

        self._invalidate_cache("poll_answers")
        return answer_id

    def append_teacher_feedback(
        self,
        poll_id: int,
        teacher_name: str,
        score_value: int,
        anonymous_comment: str,
    ) -> int:
        rows = self.get_teacher_feedback_rows()
        feedback_id = self._next_id_from_rows(rows, "feedback_id")

        self.teacher_feedback_ws.append_row(
            [
                feedback_id,
                poll_id,
                teacher_name,
                score_value,
                anonymous_comment,
                now_str(),
            ],
            value_input_option="USER_ENTERED",
        )

        self._invalidate_cache("teacher_feedback")
        return feedback_id


db_instance: SheetsDB | None = None


def get_db() -> SheetsDB:
    global db_instance
    if db_instance is None:
        db_instance = SheetsDB()
    return db_instance

app = FastAPI(title="School MiniApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TodayLessonsRequest(BaseModel):
    telegram_id: int


class SubmitRatingRequest(BaseModel):
    telegram_id: int
    lesson_number: int
    subject_name: str
    teacher_name: str
    score_value: int = Field(ge=1, le=10)
    anonymous_comment: str = ""
    opened_at: str


@app.get("/health")
def health():
    return {"ok": True, "time": now_str()}


@app.get("/health-db")
def health_db():
    try:
        db = get_db()
        _ = db.users_ws.title
        return {"ok": True, "db": True, "time": now_str()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


@app.post("/today-lessons")
def today_lessons(payload: TodayLessonsRequest):
    db = get_db()

    user = db.get_user_by_telegram_id(payload.telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = str(user.get("role", "")).strip().lower()
    if role != "student":
        raise HTTPException(status_code=403, detail="Only students can rate lessons")

    class_name = str(user.get("class_name", "")).strip()
    selected_name = str(user.get("selected_name", "")).strip()

    if not class_name or not selected_name:
        raise HTTPException(status_code=400, detail="User registration data is incomplete")

    lessons = db.get_today_lessons_for_class(class_name)
    result = []

    for lesson in lessons:
        teacher_1 = lesson["teacher_1"]
        teacher_2 = lesson["teacher_2"]

        poll_id = db.create_poll_session_if_missing(
            telegram_id=payload.telegram_id,
            selected_name=selected_name,
            class_name=class_name,
            subject_name=lesson["subject_name"],
            teacher_1=teacher_1,
            teacher_2=teacher_2,
            lesson_number=lesson["lesson_number"],
        )

        answers = db.get_answers_for_poll(poll_id, payload.telegram_id)
        rated = len(answers) > 0

        rated_teachers = [
            str(a.get("chosen_teacher", "")).strip()
            for a in answers
            if str(a.get("chosen_teacher", "")).strip()
        ]

        teachers = [t for t in [teacher_1, teacher_2] if t]

        result.append(
            {
                "poll_id": poll_id,
                "lesson_number": lesson["lesson_number"],
                "start_time": lesson["start_time"],
                "end_time": lesson["end_time"],
                "subject_name": lesson["subject_name"],
                "teachers": teachers,
                "rated": rated,
                "rated_teachers": rated_teachers,
                "poll_allowed": lesson["poll_allowed"] == "TRUE",
            }
        )

    return {
        "telegram_id": payload.telegram_id,
        "class_name": class_name,
        "date": today_date_str(),
        "weekday": weekday_uz(),
        "lessons": result,
    }


@app.post("/submit-rating")
def submit_rating(payload: SubmitRatingRequest):
    db = get_db()

    user = db.get_user_by_telegram_id(payload.telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = str(user.get("role", "")).strip().lower()
    if role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit ratings")

    class_name = str(user.get("class_name", "")).strip()
    selected_name = str(user.get("selected_name", "")).strip()

    if not class_name or not selected_name:
        raise HTTPException(status_code=400, detail="User registration data is incomplete")

    lessons = db.get_today_lessons_for_class(class_name)

    lesson = None
    for item in lessons:
        if (
            item["lesson_number"] == payload.lesson_number
            and item["subject_name"] == payload.subject_name
        ):
            lesson = item
            break

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found for today")

    allowed_teachers = [t for t in [lesson["teacher_1"], lesson["teacher_2"]] if t]
    if payload.teacher_name not in allowed_teachers:
        raise HTTPException(status_code=400, detail="Teacher is not assigned to this lesson")

    poll_id = db.create_poll_session_if_missing(
        telegram_id=payload.telegram_id,
        selected_name=selected_name,
        class_name=class_name,
        subject_name=lesson["subject_name"],
        teacher_1=lesson["teacher_1"],
        teacher_2=lesson["teacher_2"],
        lesson_number=lesson["lesson_number"],
    )

    if db.has_answer_for_teacher(poll_id, payload.telegram_id, payload.teacher_name):
        raise HTTPException(
            status_code=400,
            detail="This teacher is already rated for this lesson today",
        )

    answer_id = db.append_poll_answer(
        poll_id=poll_id,
        telegram_id=payload.telegram_id,
        class_name=class_name,
        subject_name=lesson["subject_name"],
        chosen_teacher=payload.teacher_name,
        score_value=payload.score_value,
        anonymous_comment=payload.anonymous_comment.strip(),
        opened_at=payload.opened_at,
    )

    feedback_id = db.append_teacher_feedback(
        poll_id=poll_id,
        teacher_name=payload.teacher_name,
        score_value=payload.score_value,
        anonymous_comment=payload.anonymous_comment.strip(),
    )

    return {
        "ok": True,
        "answer_id": answer_id,
        "feedback_id": feedback_id,
        "poll_id": poll_id,
        "subject_name": lesson["subject_name"],
        "teacher_name": payload.teacher_name,
        "rated": True,
        "message": "Baholash muvaffaqiyatli yuborildi",
    }
