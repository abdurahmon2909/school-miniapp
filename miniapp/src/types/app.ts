// ===== Общие типы =====

export type TabKey = "home" | "schedule" | "zakovat" | "profile";

// ===== Урок =====

export type Lesson = {
  lesson_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  teachers: string[];
  rated: boolean;
  rated_teachers: string[];
  poll_allowed: boolean;
};

// ===== Сегодняшние уроки =====

export type TodayLessonsResponse = {
  telegram_id: number;
  role: "student" | "teacher";
  selected_name: string;
  class_name: string;
  date: string;
  weekday: string;
  lessons: Lesson[];
};

// ===== Профиль =====

export type TeacherRating = {
  teacher_name: string;
  avg_score: number;
  total_votes: number;
  last_updated: string;
};

export type RegistrationProfile = {
  telegram_id: number;
  role: "student" | "teacher";
  selected_name: string;
  class_name: string;
  subject_name: string;
  username: string;
  first_name: string;
  last_name: string;

  // добавлено под рейтинг
  rating?: TeacherRating | null;
};

// ===== Ответ профиля =====

export type RegistrationStatusResponse = {
  registered: boolean;
  profile: RegistrationProfile | null;
};

// ===== Регистрация =====

export type RegistrationOptionsResponse = {
  classes: string[];
  students: {
    name: string;
    class_name: string;
  }[];
  subjects: string[];
  teachers: {
    name: string;
    subject_name: string;
    telegram_id?: string;
  }[];
};

// ===== Оценка =====

export type SubmitRatingPayload = {
  telegram_id: number;
  lesson_number: number;
  subject_name: string;
  teacher_name: string;
  score_value: number;
  anonymous_comment?: string;
  opened_at?: string;
  answered_at?: string;
};

export type SubmitRatingResponse = {
  ok: boolean;
  message: string;
  poll_id?: number;
  answer_id?: number;
  teacher_rating_updated?: boolean;
};

// ===== Объявления =====

export type AnnouncementItem = {
  id: string;
  text: string;
};

export type AnnouncementsResponse = {
  announcements: AnnouncementItem[];
};

// ===== ТОП учителей =====

export type TopTeacher = {
  teacher_name: string;
  avg_score: number;
  total_votes: number;
  last_updated?: string;
};

export type TopTeachersResponse = {
  top_teachers: TopTeacher[];
};

// ===== Рейтинг конкретного учителя =====

export type TeacherRatingResponse = {
  teacher: TeacherRating;
};