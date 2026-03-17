export type TabKey = "home" | "schedule" | "zakovat" | "profile";

export type UserRole = "student" | "teacher";

export type Lesson = {
  poll_id?: number;
  lesson_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  teachers: string[];
  rated: boolean;
  rated_teachers: string[];
  poll_allowed: boolean;
  class_name?: string;
};

export type TodayLessonsResponse = {
  telegram_id: number;
  role: string;
  selected_name: string;
  full_name: string;
  class_name: string;
  date: string;
  weekday: string;
  lessons: Lesson[];
  average_grade?: string | number;
};

export type TeacherRating = {
  teacher_name: string;
  avg_score: number;
  total_votes: number;
  last_updated: string;
};

export type RegistrationProfile = {
  telegram_id: number;
  full_name: string;
  role: string;
  class_name: string;
  subject?: string;
  phone?: string;
  username?: string;
  average_grade?: string | number | null;
};

export type MeResponse = {
  ok: boolean;
  registered: boolean;
  profile: RegistrationProfile | null;
};

export type RegistrationStatusResponse = {
  registered: boolean;
  profile: RegistrationProfile | null;
};

export type StudentOption = {
  name: string;
  class_name: string;
};

export type TeacherOption = {
  name: string;
  subject_name: string;
  telegram_id?: string;
};

export type RegistrationOptionsResponse = {
  classes: string[];
  students: StudentOption[];
  subjects: string[];
  teachers: TeacherOption[];
};

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

export type AnnouncementItem = {
  id: string;
  text: string;
};

export type AnnouncementsResponse = {
  announcements: AnnouncementItem[];
};

export type TopTeacher = {
  teacher_name: string;
  avg_score: number;
  total_votes: number;
  last_updated?: string;
};

export type TopTeachersResponse = {
  top_teachers: TopTeacher[];
};

export type TeacherRatingResponse = {
  teacher: TeacherRating;
};