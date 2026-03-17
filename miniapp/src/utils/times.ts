import type { Lesson } from "../types/app";

function timeToMinutes(value: string): number {
  const text = String(value || "").trim();
  if (!text) return -1;

  const parts = text.split(":");
  if (parts.length < 2) return -1;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return -1;

  return hours * 60 + minutes;
}

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function formatTime(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "--:--";

  const parts = text.split(":");
  if (parts.length < 2) return text;

  const hh = parts[0].padStart(2, "0");
  const mm = parts[1].padStart(2, "0");

  return `${hh}:${mm}`;
}

export function isCurrentLesson(lesson: Pick<Lesson, "start_time" | "end_time">): boolean {
  const start = timeToMinutes(lesson.start_time);
  const end = timeToMinutes(lesson.end_time);
  const now = getNowMinutes();

  if (start < 0 || end < 0) return false;

  return now >= start && now < end;
}

export function getCurrentLesson(lessons: Lesson[]): Lesson | null {
  for (const lesson of lessons) {
    if (isCurrentLesson(lesson)) {
      return lesson;
    }
  }

  return null;
}

export function getNextLesson(lessons: Lesson[]): Lesson | null {
  const now = getNowMinutes();

  const futureLessons = lessons
    .filter((lesson) => {
      const start = timeToMinutes(lesson.start_time);
      return start > now;
    })
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  return futureLessons[0] || null;
}

export function getDayStatus(lessons: Lesson[]): string {
  if (!lessons.length) {
    return "Bugun dars yo‘q";
  }

  const currentLesson = getCurrentLesson(lessons);
  if (currentLesson) {
    return "Dars jarayonda";
  }

  const nextLesson = getNextLesson(lessons);
  if (nextLesson) {
    return "Keyingi dars kutilmoqda";
  }

  return "Darslar tugagan";
}