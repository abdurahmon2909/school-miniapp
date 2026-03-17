import type { Lesson } from "../types/app";

type Props = {
  selectedLesson: Lesson | null;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  scoreValue: number | null;
  setScoreValue: (value: number) => void;
  comment: string;
  setComment: (value: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function RateModal({
  selectedLesson,
  selectedTeacher,
  setSelectedTeacher,
  scoreValue,
  setScoreValue,
  comment,
  setComment,
  submitting,
  onClose,
  onSubmit,
}: Props) {
  if (!selectedLesson) return null;

  const teachers = selectedLesson.teachers || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head modal-head-fixed">
          <div className="modal-head-content">
            <h3 className="modal-title">{selectedLesson.subject_name}</h3>
            <div className="modal-subtitle">O‘qituvchini tanlang</div>
          </div>

          <button
            type="button"
            className="icon-close-btn modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Yopish"
          >
            ×
          </button>
        </div>

        <div className="teacher-select-list">
          {teachers.map((teacher, index) => {
            const active = selectedTeacher === teacher;

            return (
              <button
                key={`${teacher}-${index}`}
                type="button"
                className={`teacher-select-btn ${active ? "teacher-select-btn-active" : ""}`}
                onClick={() => setSelectedTeacher(teacher)}
                disabled={submitting}
              >
                {teacher}
              </button>
            );
          })}
        </div>

        <div className="score-block">
          <div className="score-label">Bahoni tanlang</div>

          <div className="score-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                type="button"
                className={`score-btn ${scoreValue === score ? "score-btn-active" : ""}`}
                onClick={() => setScoreValue(score)}
                disabled={submitting}
              >
                {score}
              </button>
            ))}
          </div>
        </div>

        <div className="comment-block">
          <textarea
            className="comment-textarea"
            placeholder="Izoh qoldiring..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={submitting}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={submitting}
          >
            Bekor qilish
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={onSubmit}
            disabled={submitting || !selectedTeacher || scoreValue === null}
          >
            {submitting ? "Yuborilmoqda..." : "Yuborish"}
          </button>
        </div>
      </div>
    </div>
  );
}