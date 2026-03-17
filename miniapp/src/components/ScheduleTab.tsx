import type { Lesson } from "../types/app";
import { formatTime, isCurrentLesson } from "../utils/times";

type Props = {
  loading: boolean;
  error: string;
  lessons: Lesson[];
  weekday?: string;
  className?: string;
  onOpenRateModal: (lesson: Lesson) => void;
};

export default function ScheduleTab({
  loading,
  error,
  lessons,
  weekday,
  className,
  onOpenRateModal,
}: Props) {
  function renderLessonCard(lesson: Lesson) {
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

          <div className="schedule-range">
            {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
          </div>

          <div className="lesson-actions-row">
            <button
              className={`rate-btn ${lesson.rated ? "rated-btn" : ""}`}
              disabled={!lesson.poll_allowed || lesson.rated}
              onClick={() => onOpenRateModal(lesson)}
            >
              {lesson.rated ? "✓ Baholangan" : "⭐ Baholang"}
            </button>
          </div>

          {lesson.rated && lesson.rated_teachers.length > 0 && (
            <div className="rated-info">Baholangan: {lesson.rated_teachers.join(", ")}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="inner-page-head">
        <div className="inner-page-title">Dars jadvali</div>
        <div className="inner-page-subtitle">
          {weekday || "Bugungi jadval"} {className ? `• ${className}` : ""}
        </div>
      </div>

      {loading ? (
        <div className="state-card">
          <div className="state-title">Yuklanmoqda...</div>
        </div>
      ) : error ? (
        <div className="state-card error-card">
          <div className="state-title">Xatolik</div>
          <div className="state-text">{error}</div>
        </div>
      ) : lessons.length === 0 ? (
        <div className="state-card">
          <div className="state-title">Bugun dars topilmadi</div>
          <div className="state-text">Jadvalda bugungi kun uchun darslar yo‘q.</div>
        </div>
      ) : (
        <div className="schedule-list schedule-list-full">{lessons.map((lesson) => renderLessonCard(lesson))}</div>
      )}
    </>
  );
}