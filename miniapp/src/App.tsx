import { useEffect, useMemo, useState } from "react";

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type Lesson = {
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

type TodayLessonsResponse = {
  telegram_id: number;
  class_name: string;
  date: string;
  weekday: string;
  lessons: Lesson[];
};

declare global {
  interface Window {
    Telegram?: any;
  }
}

const API_BASE = "school-miniapp-production-c830.up.railway.app";

export default function App() {
  const [tgUser, setTgUser] = useState<TgUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [score, setScore] = useState<number>(10);
  const [comment, setComment] = useState<string>("");
  const [openedAt, setOpenedAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setLoading(false);
      return;
    }

    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;
    if (user) {
      setTgUser(user);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tgUser?.id) return;

    fetch(`${API_BASE}/today-lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ telegram_id: tgUser.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "API error");
        }
        return res.json() as Promise<TodayLessonsResponse>;
      })
      .then((data) => {
        setLessons(data.lessons || []);
      })
      .catch((err) => {
        console.error(err);
        alert("Bugungi darslarni yuklab bo‘lmadi");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tgUser]);

  const openLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedTeacher(lesson.teachers[0] || "");
    setScore(10);
    setComment("");

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const opened = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setOpenedAt(opened);
  };

  const closeLesson = () => {
    setSelectedLesson(null);
    setSelectedTeacher("");
    setComment("");
    setScore(10);
    setOpenedAt("");
  };

  const submitRating = async () => {
    if (!tgUser?.id || !selectedLesson || !selectedTeacher) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/submit-rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: tgUser.id,
          lesson_number: selectedLesson.lesson_number,
          subject_name: selectedLesson.subject_name,
          teacher_name: selectedTeacher,
          score_value: score,
          anonymous_comment: comment,
          opened_at: openedAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Submit error");
      }

      setLessons((prev) =>
        prev.map((item) =>
          item.poll_id === selectedLesson.poll_id
            ? {
                ...item,
                rated: true,
                rated_teachers: [...item.rated_teachers, selectedTeacher],
              }
            : item
        )
      );

      alert("Baholash yuborildi");
      closeLesson();
    } catch (error: any) {
      alert(error.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const greeting = useMemo(() => {
    if (!tgUser) return "O‘quvchi";
    return tgUser.first_name || "O‘quvchi";
  }, [tgUser]);

  if (loading) {
    return (
      <div style={{ padding: 20, fontFamily: "sans-serif" }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (!tgUser) {
    return (
      <div style={{ padding: 20, fontFamily: "sans-serif" }}>
        Telegram orqali ochilmagan
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", background: "#f4f8ff", minHeight: "100vh" }}>
      <div style={{ background: "linear-gradient(90deg,#2f6bff,#5b8cff)", color: "white", borderRadius: 18, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.9 }}>155-Maktab</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Asosiy</div>
        <div style={{ marginTop: 8, fontSize: 14 }}>Salom, {greeting}</div>
      </div>

      <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 18 }}>
        Bugungi darslar
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {lessons.map((lesson) => (
          <button
            key={lesson.poll_id}
            onClick={() => openLesson(lesson)}
            style={{
              textAlign: "left",
              border: "none",
              borderRadius: 18,
              background: "white",
              padding: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {lesson.lesson_number}. {lesson.subject_name}
                </div>
                <div style={{ fontSize: 13, color: "#5f6b7a", marginTop: 4 }}>
                  {lesson.start_time} - {lesson.end_time}
                </div>
                <div style={{ fontSize: 14, color: "#334155", marginTop: 8 }}>
                  {lesson.teachers.join(" / ")}
                </div>
              </div>

              <div style={{ minWidth: 110, textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: lesson.rated ? "#d9f7e7" : "#fff4c2",
                    color: lesson.rated ? "#127a3f" : "#9a6b00",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {lesson.rated ? "✔ Baholangan" : "⭐ Baholang"}
                </div>

                {lesson.rated_teachers.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                    {lesson.rated_teachers.length} ta fikr
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedLesson && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "white",
              borderRadius: 24,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {selectedLesson.subject_name}
            </div>

            <div style={{ marginTop: 14, fontSize: 14, color: "#475569" }}>
              O‘qituvchini tanlang
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {selectedLesson.teachers.map((teacher) => (
                <button
                  key={teacher}
                  onClick={() => setSelectedTeacher(teacher)}
                  style={{
                    border: selectedTeacher === teacher ? "2px solid #2563eb" : "1px solid #dbe2ea",
                    background: selectedTeacher === teacher ? "#eff6ff" : "white",
                    borderRadius: 14,
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {teacher}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, fontSize: 14, color: "#475569" }}>
              Baho (1–10)
            </div>

            <input
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              style={{ width: "100%", marginTop: 8 }}
            />

            <div style={{ marginTop: 6, fontWeight: 700 }}>
              {score} ball
            </div>

            <div style={{ marginTop: 16, fontSize: 14, color: "#475569" }}>
              Anonim izoh (ixtiyoriy)
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                marginTop: 8,
                borderRadius: 14,
                border: "1px solid #dbe2ea",
                padding: 12,
                resize: "none",
                fontFamily: "sans-serif",
              }}
              placeholder="Izoh qoldiring..."
            />

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={closeLesson}
                style={{
                  flex: 1,
                  border: "1px solid #dbe2ea",
                  background: "white",
                  borderRadius: 14,
                  padding: 12,
                  cursor: "pointer",
                }}
              >
                Bekor qilish
              </button>

              <button
                onClick={submitRating}
                disabled={submitting || !selectedTeacher}
                style={{
                  flex: 1,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  borderRadius: 14,
                  padding: 12,
                  cursor: "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}