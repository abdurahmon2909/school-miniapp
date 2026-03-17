export type Lesson = {
  poll_id: number;
  lesson_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  teachers: string[];
  rated: boolean;
  rated_teachers: string[];
  poll_allowed: boolean;
};

export type TodayLessonsResponse = {
  telegram_id: number;
  class_name: string;
  date: string;
  weekday: string;
  lessons: Lesson[];
};

export type TabKey = "home" | "schedule" | "zakovat" | "profile";

export type UserRole = "student" | "teacher";

export type RegistrationProfile = {
  telegram_id: number;
  role: UserRole;
  selected_name: string;
  class_name?: string;
  subject_name?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type RegistrationStatusResponse = {
  registered: boolean;
  profile?: RegistrationProfile | null;
};

export type StudentOption = {
  name: string;
  class_name: string;
};

export type TeacherOption = {
  name: string;
  subject_name: string;
};

export type RegistrationOptionsResponse = {
  classes: string[];
  students: StudentOption[];
  subjects: string[];
  teachers: TeacherOption[];
};

export type Announcement = {
  id?: number | string;
  text: string;
};

export type AnnouncementsResponse = {
  announcements: Announcement[];
};