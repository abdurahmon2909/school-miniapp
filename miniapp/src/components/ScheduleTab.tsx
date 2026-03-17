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
  return (
    <>
      <div className="inner-page-head">
        <div className="inner-page-title">Dars jadvali</div>
        <div className="inner-page-subtitle">
          {weekday || "Bugungi kun"}
          {className ? ` • ${className}` : ""}
        </div>
      </div>

      <div className="big-section-card">
        {error ? (
          <div className="empty-inline-text">{error}</div>
        ) : loading ? (
          <div className="empty-inline-text">Jadval yuklanmoqda...</div>
        ) : lessons.length === 0 ? (
          <div className="empty-inline-text">Bugun darslar yo‘q</div>
        ) : (
          <div className="schedule-list">
            {lessons.map((lesson) => {
              const current = isCurrentLesson(lesson);
              const canRate = lesson.poll_allowed && !lesson.rated;

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
                      {lesson.teachers.length > 0 ? (
                        lesson.teachers.map((teacher, index) => (
                          <div className="schedule-teacher" key={`${teacher}-${index}`}>
                            {teacher}
                          </div>
                        ))
                      ) : (
                        <div className="schedule-teacher schedule-teacher-empty">
                          O‘qituvchi ko‘rsatilmagan
                        </div>
                      )}
                    </div>

                    {lesson.rated && lesson.rated_teachers.length > 0 && (
                      <div className="rated-info">
                        Baholangan: {lesson.rated_teachers.join(", ")}
                      </div>
                    )}

                    {lesson.poll_allowed && (
                      <div className="lesson-actions-row">
                        <button
                          className={`rate-btn ${lesson.rated ? "rated-btn" : ""}`}
                          disabled={!canRate}
                          onClick={() => onOpenRateModal(lesson)}
                        >
                          {lesson.rated ? "Baholangan" : "Baholash"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}