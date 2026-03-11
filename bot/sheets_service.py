from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any

import gspread
from google.oauth2.service_account import Credentials


class SheetsService:
    def __init__(self, sheet_name: str) -> None:
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]

        google_creds = os.getenv("GOOGLE_CREDS", "").strip()
        if not google_creds:
            raise ValueError("GOOGLE_CREDS topilmadi")

        creds_dict = json.loads(google_creds)

        credentials = Credentials.from_service_account_info(
            creds_dict,
            scopes=scopes,
        )

        client = gspread.authorize(credentials)
        self.spreadsheet = client.open(sheet_name)

        self.users_ws = self.spreadsheet.worksheet("users")
        self.students_ws = self.spreadsheet.worksheet("students_list")
        self.teachers_ws = self.spreadsheet.worksheet("teachers_list")
        self.schedule_ws = self.spreadsheet.worksheet("schedule")
        self.poll_sessions_ws = self.spreadsheet.worksheet("poll_sessions")

    @staticmethod
    def _now_str() -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ---------------- USERS ----------------

    def get_all_users(self) -> list[dict[str, Any]]:
        return self.users_ws.get_all_records()

    def user_by_telegram_id(self, telegram_id: int) -> dict[str, Any] | None:
        rows = self.users_ws.get_all_records()
        for row in rows:
            if str(row.get("telegram_id", "")).strip() == str(telegram_id):
                return row
        return None

    def append_user(
        self,
        telegram_id: int,
        first_name: str,
        last_name: str,
        username: str,
        role: str,
        class_name: str,
        selected_name: str,
    ) -> None:
        self.users_ws.append_row(
            [
                str(telegram_id),
                first_name,
                last_name,
                username,
                role,
                class_name,
                self._now_str(),
                selected_name,
            ],
            value_input_option="USER_ENTERED",
        )

    # ---------------- STUDENTS ----------------

    def get_student_classes(self) -> list[str]:
        rows = self.students_ws.get_all_records()
        classes = sorted(
            {
                str(row.get("class_name", "")).strip()
                for row in rows
                if str(row.get("class_name", "")).strip()
            }
        )
        return classes

    def get_students_by_class(self, class_name: str) -> list[str]:
        rows = self.students_ws.get_all_records()
        students = [
            str(row.get("full_name", "")).strip()
            for row in rows
            if str(row.get("class_name", "")).strip() == class_name
            and str(row.get("full_name", "")).strip()
        ]
        return students

    # ---------------- TEACHERS ----------------

    def get_teacher_subjects(self) -> list[str]:
        rows = self.teachers_ws.get_all_records()
        subjects = sorted(
            {
                str(row.get("subject", "")).strip()
                for row in rows
                if str(row.get("subject", "")).strip()
            }
        )
        return subjects

    def get_teachers_by_subject(self, subject: str) -> list[str]:
        rows = self.teachers_ws.get_all_records()
        teachers = [
            str(row.get("teacher_name", "")).strip()
            for row in rows
            if str(row.get("subject", "")).strip() == subject
            and str(row.get("teacher_name", "")).strip()
        ]
        return teachers

    def update_teacher_telegram_id(self, teacher_name: str, telegram_id: int) -> bool:
        rows = self.teachers_ws.get_all_records()
        if not rows:
            return False

        header = self.teachers_ws.row_values(1)
        telegram_id_col = header.index("telegram_id") + 1

        for row_index, row in enumerate(rows, start=2):
            if str(row.get("teacher_name", "")).strip() == teacher_name:
                self.teachers_ws.update_cell(row_index, telegram_id_col, str(telegram_id))
                return True

        return False

    # ---------------- SCHEDULE ----------------

    def get_schedule_for_class_and_weekday(
        self,
        class_name: str,
        weekday: str,
    ) -> list[dict[str, Any]]:
        rows = self.schedule_ws.get_all_records()
        result: list[dict[str, Any]] = []

        for row in rows:
            row_class = str(row.get("class_name", "")).strip()
            row_weekday = str(row.get("weekday", "")).strip()
            poll_allowed = str(row.get("poll_allowed", "")).strip().upper()

            if row_class != class_name:
                continue
            if row_weekday != weekday:
                continue
            if poll_allowed != "TRUE":
                continue

            result.append(row)

        result.sort(key=lambda x: int(x.get("lesson_number", 0) or 0))
        return result

    # ---------------- POLL SESSIONS ----------------

    def get_all_poll_sessions(self) -> list[dict[str, Any]]:
        return self.poll_sessions_ws.get_all_records()

    def poll_exists_for_user_and_day(
        self,
        telegram_id: int,
        poll_date: str,
        subject_name: str,
        lesson_number: int,
    ) -> bool:
        rows = self.poll_sessions_ws.get_all_records()

        for row in rows:
            if (
                str(row.get("telegram_id", "")).strip() == str(telegram_id)
                and str(row.get("poll_date", "")).strip() == poll_date
                and str(row.get("subject_name", "")).strip() == str(subject_name).strip()
                and str(row.get("lesson_number", "")).strip() == str(lesson_number)
            ):
                return True

        return False

    def next_poll_id(self) -> int:
        rows = self.poll_sessions_ws.get_all_records()
        if not rows:
            return 1

        max_id = 0
        for row in rows:
            try:
                max_id = max(max_id, int(row.get("poll_id", 0) or 0))
            except Exception:
                continue
        return max_id + 1

    def append_poll_session(
        self,
        telegram_id: int,
        selected_name: str,
        class_name: str,
        poll_date: str,
        subject_name: str,
        teacher_1: str,
        teacher_2: str,
        lesson_number: int,
        created_at: str,
        end_time: str,
        status: str = "active",
    ) -> int:
        poll_id = self.next_poll_id()

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
                created_at,
                end_time,
                status,
            ],
            value_input_option="USER_ENTERED",
        )

        return poll_id