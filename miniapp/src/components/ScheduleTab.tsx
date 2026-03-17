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
          {[weekday, className].filter(Boolean).join(" • ")}
        </div>
      </div>

      <section className="schedule-page-list">
        {error ? (
          <div className="state-card inside-state-card error-card">
            <div className="state-text">{error}</div>
          </div>
        ) : loading ? (
          <div className="state-card inside-state-card">
            <div className="state-text">Darslar yuklanmoqda...</div>
          </div>
        ) : lessons.length === 0 ? (
          <div className="state-card inside-state-card">
            <div className="state-text">Bugun darslar yo‘q</div>
          </div>
        ) : (
          lessons.map((lesson) => {
            const current = isCurrentLesson(lesson);
            const canRate = lesson.poll_allowed && !lesson.rated;

            return (
              <div
                key={`${lesson.lesson_number}-${lesson.subject_name}`}
                className={`schedule-page-card ${current ? "schedule-page-card-current" : ""}`}
              >
                <div className="schedule-page-card-left">
                  <div className="schedule-page-lesson-number">{lesson.lesson_number}</div>
                </div>

                <div className="schedule-page-card-body">
                  <div className="schedule-page-card-head">
                    <div className="schedule-page-subject">{lesson.subject_name}</div>
                    {current && <div className="current-pill">Hozir</div>}
                  </div>

                  <div className="schedule-page-time">
                    {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                  </div>

                  <div className="schedule-page-teachers">
                    {lesson.teachers.length > 0 ? (
                      lesson.teachers.map((teacher, index) => (
                        <div className="schedule-page-teacher" key={`${teacher}-${index}`}>
                          {teacher}
                        </div>
                      ))
                    ) : (
                      <div className="schedule-page-teacher schedule-teacher-empty">
                        O‘qituvchi ko‘rsatilmagan
                      </div>
                    )}
                  </div>

                  <div className="schedule-page-actions">
                    {lesson.rated ? (
                      <button className="rate-btn rated-btn" disabled>
                        Baholangan
                      </button>
                    ) : (
                      <button
                        className="rate-btn"
                        disabled={!canRate}
                        onClick={() => onOpenRateModal(lesson)}
                      >
                        Baholash
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}