import { useMemo } from "react";
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
  const teachers = useMemo(() => selectedLesson?.teachers || [], [selectedLesson]);

  if (!selectedLesson) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{selectedLesson.subject_name || "Fan"}</h3>
            <p className="modal-subtitle">O‘qituvchini tanlang</p>
          </div>

          <button className="icon-close-btn" onClick={onClose} disabled={submitting}>
            ×
          </button>
        </div>

        <div className="teacher-select-list">
          {teachers.map((teacher) => {
            const active = selectedTeacher === teacher;

            return (
              <button
                key={teacher}
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
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
              const active = scoreValue === score;

              return (
                <button
                  key={score}
                  type="button"
                  className={`score-btn ${active ? "score-btn-active" : ""}`}
                  onClick={() => setScoreValue(score)}
                  disabled={submitting}
                >
                  {score}
                </button>
              );
            })}
          </div>
        </div>

        <div className="comment-block">
          <textarea
            className="comment-textarea"
            placeholder="Izoh qoldiring..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
            disabled={submitting}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={submitting}>
            Bekor qilish
          </button>

          <button type="button" className="primary-btn" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Yuborilmoqda..." : "Yuborish"}
          </button>
        </div>
      </div>
    </div>
  );
}