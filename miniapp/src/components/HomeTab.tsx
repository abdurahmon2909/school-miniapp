import type { Lesson, RegistrationProfile, TopTeacher } from "../types/app";
import {
  formatTime,
  getCurrentLesson,
  getDayStatus,
  getNextLesson,
  isCurrentLesson,
} from "../utils/times";
import { getInitials } from "../utils/telegram";

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

  const roleLabel = profile.role === "teacher" ? "O‘qituvchi" : "O‘quvchi";
  const profileName = profile.full_name || "Foydalanuvchi";

  const profileSubInfo =
    profile.role === "teacher"
      ? profile.subject || "Fan kiritilmagan"
      : className || profile.class_name || "Sinf kiritilmagan";

  const topTeachersToShow =
    topTeachers.length > 0
      ? topTeachers.slice(0, 5).map((item) => ({
          name: item.teacher_name,
          score: Number(item.avg_score || 0),
        }))
      : [
          { name: "O‘qituvchilar reytingi ulanmoqda", score: 0 },
          { name: "Ma’lumot yo‘q", score: 0 },
        ];

  return (
    <>
      <section className="main-hero compact-hero">
        <div className="main-hero-top compact-hero-top">
          <div className="main-hero-left">
            <div className="main-school-id">155-Maktab</div>
            <div className="main-hero-title">School tizimi</div>

            <div className="main-hero-marquee">
              <div className="main-hero-marquee-track">
                <div className="main-hero-marquee-seq">
                  {announcements.map((item, index) => (
                    <span className="main-hero-news-item" key={`a-${index}`}>
                      {item}
                    </span>
                  ))}
                </div>

                <div className="main-hero-marquee-seq" aria-hidden="true">
                  {announcements.map((item, index) => (
                    <span className="main-hero-news-item" key={`b-${index}`}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="main-profile-short top-right-profile">
            <div className="main-profile-text profile-text-right">
              <div className="main-profile-name">{profileName}</div>
              <div className="main-profile-role">{roleLabel}</div>
              {profile.role !== "teacher" && (
                <div className="main-profile-average">{studentAverageGradeText}</div>
              )}
              <div className="main-profile-subinfo">{profileSubInfo}</div>
            </div>

            <div className="main-avatar-ring compact-avatar-ring">
              <div className="main-avatar">
                {photoUrl ? (
                  <img className="main-avatar-img" src={photoUrl} alt={profileName} />
                ) : (
                  getInitials(profileName)
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid single-stat-grid">
        <div className="info-stat-card">
          <div className="info-stat-label">Bugungi holat</div>
          <div className="info-stat-value small-value">
            {loading ? "Yuklanmoqda..." : dayStatus}
          </div>
        </div>

        <div className="info-stat-card compact-top-teachers-card">
          <div className="info-stat-label">Top 5 Ustozlar</div>

          <div className="top-teachers-inline-list">
            {topTeachersToShow.slice(0, 5).map((item, index) => (
              <div className="top-teacher-inline-row" key={`${item.name}-${index}`}>
                <span className="top-teacher-inline-rank">{index + 1}.</span>
                <span className="top-teacher-inline-name">{item.name}</span>
                <span className="top-teacher-inline-score">
                  {item.score > 0 ? item.score.toFixed(1) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="big-section-card">
        <div className="big-section-head">
          <h2>Bugungi darslar</h2>
          <button className="section-link-btn" onClick={onOpenSchedule}>
            Barchasi
          </button>
        </div>

        {error ? (
          <div className="empty-inline-text">{error}</div>
        ) : loading ? (
          <div className="empty-inline-text">Darslar yuklanmoqda...</div>
        ) : currentLesson ? (
          <div className="next-lesson-row">
            <div className="next-lesson-time">
              {formatTime(currentLesson.start_time)} - {formatTime(currentLesson.end_time)}
            </div>

            <div>
              <div className="next-lesson-subject">{currentLesson.subject_name}</div>
              <div className="next-lesson-teacher">
                {currentLesson.teachers.join(", ") || "O‘qituvchi ko‘rsatilmagan"}
              </div>
            </div>
          </div>
        ) : nextLesson ? (
          <div className="next-lesson-row">
            <div className="next-lesson-time">
              {formatTime(nextLesson.start_time)} - {formatTime(nextLesson.end_time)}
            </div>

            <div>
              <div className="next-lesson-subject">{nextLesson.subject_name}</div>
              <div className="next-lesson-teacher">
                {nextLesson.teachers.join(", ") || "O‘qituvchi ko‘rsatilmagan"}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-inline-text">Bugun darslar yo‘q</div>
        )}

        {!!lessons.length && (
          <div className="schedule-list schedule-list-full">
            {lessons.slice(0, 3).map((lesson) => {
              const current = isCurrentLesson(lesson);

              return (
                <div
                  key={`${lesson.lesson_number}-${lesson.subject_name}`}
                  className={`schedule-item ${current ? "schedule-item-current" : ""}`}
                >
                  <div className="schedule-time">{lesson.lesson_number}</div>

                  <div className="schedule-body">
                    <div className="schedule-title-row">
                      <div className="schedule-subject">{lesson.subject_name}</div>
                      {current && <div className="current-pill">Hozir</div>}
                    </div>

                    <div className="schedule-range">
                      {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                    </div>

                    <div className="schedule-teacher-list">
                      {lesson.teachers.map((teacher, idx) => (
                        <div className="schedule-teacher" key={`${teacher}-${idx}`}>
                          {teacher}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bottom-info-grid">
        <div className="mini-info-card">
          <div className="mini-info-title">Zakovat TOP</div>

          <div className="mini-list">
            {fakeZakovatTop.map((item, index) => (
              <div className="mini-list-row" key={`${item.class_name}-${index}`}>
                <span>{item.class_name}</span>
                <strong>{item.points}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {weekday && <div className="home-footer-note">{weekday}</div>}
    </>
  );
}