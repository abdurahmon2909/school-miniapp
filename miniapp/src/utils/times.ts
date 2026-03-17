import type { Lesson } from "../types/app";

export function formatTime(time: string) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function parseTimeToDate(time: string) {
  if (!time) return null;

  const [h, m] = time.split(":").map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

export function isCurrentLesson(start: string, end: string) {
  if (!start || !end) return false;

  const now = new Date();
  const startDate = parseTimeToDate(start);
  const endDate = parseTimeToDate(end);

  if (!startDate || !endDate) return false;

  return now >= startDate && now <= endDate;
}

export function getCurrentLesson(lessons: Lesson[]) {
  return lessons.find((lesson) => isCurrentLesson(lesson.start_time, lesson.end_time)) || null;
}

export function getNextLesson(lessons: Lesson[]) {
  const now = new Date();

  const futureLessons = lessons
    .map((lesson) => ({
      lesson,
      start: parseTimeToDate(lesson.start_time),
    }))
    .filter((item) => item.start && item.start > now)
    .sort((a, b) => (a.start!.getTime() - b.start!.getTime()));

  return futureLessons[0]?.lesson || null;
}

export function getDayStatus(lessons: Lesson[]) {
  const now = new Date();

  if (!lessons.length) {
    return "Bugun dars yo‘q";
  }

  const current = getCurrentLesson(lessons);
  if (current) return "Hozir dars";

  const parsed = lessons
    .map((lesson) => ({
      start: parseTimeToDate(lesson.start_time),
      end: parseTimeToDate(lesson.end_time),
    }))
    .filter((item) => item.start && item.end);

  if (!parsed.length) return "Holat noma’lum";

  const firstLesson = parsed.reduce((min, item) =>
    item.start!.getTime() < min.start!.getTime() ? item : min
  );
  const lastLesson = parsed.reduce((max, item) =>
    item.end!.getTime() > max.end!.getTime() ? item : max
  );

  if (now < firstLesson.start!) return "Darslar hali boshlanmagan";
  if (now > lastLesson.end!) return "Darslar tugagan";

  return "Tanaffus";
}