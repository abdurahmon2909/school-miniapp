import type { Lesson, RegistrationProfile } from "../types/app";
import { formatTime, getCurrentLesson, getDayStatus, getNextLesson, isCurrentLesson } from "../utils/times";
import { getInitials } from "../utils/telegram";

type TopTeacher = {
  teacher_name: string;
  avg_score: number;
  total_votes: number;
  last_updated?: string;
};

type Props = {
  loading: boolean;
  error: string;
  lessons: Lesson[];
  weekday?: string;
  className?: string;
  profile: RegistrationProfile;
  photoUrl: string;
  studentAverageGradeText: string;
  announcements: string[];
  fakeZakovatTop: { class_name: string; points: number }[];
  topTeachers?: TopTeacher[];
  onOpenSchedule: () => void;
};

export default function HomeTab({
  loading,
  error,
  lessons,
  weekday,
  className,
  profile,
  photoUrl,
  studentAverageGradeText,
  announcements,
  fakeZakovatTop,
  topTeachers = [],
  onOpenSchedule,
}: Props) {
  const currentLesson = getCurrentLesson(lessons);
  const nextLesson = getNextLesson(lessons);
  const dayStatus = getDayStatus(lessons);
  const initials = getInitials(undefined, undefined, profile.selected_name);

  const roleLabel = profile.role === "teacher" ? "O‘qituvchi" : "O‘quvchi";
  const subjectInfo = profile.subject_name || "Fan ko‘rsatilmagan";
  const classInfo = className || profile.class_name || "-";

  function renderLessonCard(lesson: Lesson, compact = false) {
    const current = isCurrentLesson(lesson.start_time, lesson.end_time);

    return (
      <div
        key={lesson.poll_id || `${lesson.lesson_number}-${lesson.subject_name}`}
        className={`schedule-item ${current ? "schedule-item-current" : ""}`}
      >
        <div className="schedule-time">{formatTime(lesson.start_time)}</div>

        <div className="schedule-body">
          <div className="schedule-title-row">
            <div className="schedule-subject">{lesson.subject_name || "Fan nomi yo‘q"}</div>
            {current && <span className="current-pill">Hozir</span>}
          </div>

          <div className="schedule-teacher-list">
            {lesson.teachers.length > 0 ? (
              lesson.teachers.map((teacher, index) => (
                <div className="schedule-teacher" key={`${teacher}-${index}`}>
                  {teacher}
                </div>
              ))
            ) : (
              <div className="schedule-teacher schedule-teacher-empty">O‘qituvchi ko‘rsatilmagan</div>
            )}
          </div>

          {!compact && (
            <div className="schedule-range">
              {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderTopTeachersCard() {
    if (profile.role === "teacher") {
      return (
        <div className="info-stat-card">
          <div className="info-stat-label">Fan</div>
          <div className="info-stat-value small-value">{subjectInfo}</div>
        </div>
      );
    }

    return (
      <div className="info-stat-card">
        <div className="info-stat-label">TOP o‘qituvchilar</div>

        {topTeachers.length === 0 ? (
          <div className="info-stat-value small-value">Hali reyting yo‘q</div>
        ) : (
          <div className="top-teachers-mini-list">
            {topTeachers.slice(0, 3).map((teacher, index) => (
              <div className="top-teacher-mini-row" key={`${teacher.teacher_name}-${index}`}>
                <span className="top-teacher-mini-name">
                  {index + 1}. {teacher.teacher_name}
                </span>
                <span className="top-teacher-mini-score">
                  {Number(teacher.avg_score || 0).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="main-hero">
        <div className="main-hero-top">
          <div className="main-hero-left">
            <div className="main-school-id">155-Maktab</div>
            <div className="main-hero-title">School tizimi</div>

            <div className="main-hero-marquee">
              <div className="main-hero-marquee-track">
                <div className="main-hero-marquee-seq">
                  {announcements.map((item, index) => (
                    <span className="main-hero-news-item" key={`a-${index}`}>
                      📣 {item}
                    </span>
                  ))}
                </div>

                <div className="main-hero-marquee-seq" aria-hidden="true">
                  {announcements.map((item, index) => (
                    <span className="main-hero-news-item" key={`b-${index}`}>
                      📣 {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="main-profile-short">
            <div className="main-profile-text">
              <div className="main-profile-name">{profile.selected_name}</div>
              <div className="main-profile-role">{roleLabel}</div>
              <div className="main-profile-average">{studentAverageGradeText}</div>
              {profile.role !== "teacher" && <div className="profile-class-line">{classInfo}</div>}
              {profile.role === "teacher" && <div className="main-profile-subinfo">{subjectInfo}</div>}
            </div>

            <div className="main-avatar-ring">
              {photoUrl ? (
                <img src={photoUrl} alt="avatar" className="main-avatar-img" />
              ) : (
                <div className="main-avatar">{initials}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="info-stat-card">
          <div className="info-stat-label">Holat</div>
          <div className="info-stat-value small-value">{dayStatus}</div>
        </div>

        {renderTopTeachersCard()}
      </div>

      <div className="big-section-card next-lesson-card">
        <div className="big-section-head">
          <h2>Keyingi dars</h2>
        </div>

        {!nextLesson ? (
          <div className="empty-inline-text">Keyingi dars topilmadi</div>
        ) : (
          <div className="next-lesson-row">
            <div className="next-lesson-time">
              {formatTime(nextLesson.start_time)} - {formatTime(nextLesson.end_time)}
            </div>
            <div className="next-lesson-main">
              <div className="next-lesson-subject">{nextLesson.subject_name}</div>
              <div className="next-lesson-teacher">
                {nextLesson.teachers?.join(", ") || "O‘qituvchi ko‘rsatilmagan"}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="big-section-card">
        <div className="big-section-head">
          <h2>Bugungi jadval</h2>
          <button type="button" className="section-link-btn" onClick={onOpenSchedule}>
            Barchasi
          </button>
        </div>

        {loading ? (
          <div className="state-card inside-state-card">
            <div className="state-title">Yuklanmoqda...</div>
          </div>
        ) : error ? (
          <div className="state-card error-card inside-state-card">
            <div className="state-title">Xatolik</div>
            <div className="state-text">{error}</div>
          </div>
        ) : lessons.length === 0 ? (
          <div className="state-card inside-state-card">
            <div className="state-title">Bugun dars topilmadi</div>
            <div className="state-text">Jadvalda bugungi kun uchun darslar yo‘q.</div>
          </div>
        ) : (
          <div className="schedule-list">{lessons.slice(0, 4).map((lesson) => renderLessonCard(lesson, true))}</div>
        )}
      </div>

      <div className="bottom-info-grid">
        <div className="mini-info-card">
          <div className="mini-info-title">Zakovat TOP</div>

          <div className="mini-list">
            {fakeZakovatTop.map((item, index) => (
              <div className="mini-list-row" key={`${item.class_name}-${index}`}>
                <span>
                  {index + 1}. {item.class_name}
                </span>
                <strong>{item.points}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="mini-info-card">
          <div className="mini-info-title">E'lonlar</div>

          <div className="announcement-list">
            {announcements.slice(0, 3).map((item, index) => (
              <div className="announcement-line" key={`${item}-${index}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {weekday && <div className="home-footer-note">{weekday} kuni darslar ko‘rsatilgan</div>}
      {currentLesson && <div className="home-footer-note">Hozir {currentLesson.lesson_number}-dars davom etmoqda</div>}
    </>
  );
}