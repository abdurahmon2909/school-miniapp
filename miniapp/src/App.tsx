import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

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

const BACKEND_URL = "https://school-miniapp-production-c830.up.railway.app";

function formatTime(time: string) {
  if (!time) return "";
  return time.slice(0, 5);
}

function isCurrentLesson(start: string, end: string) {
  if (!start || !end) return false;

  const now = new Date();

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return false;
  }

  const startDate = new Date();
  startDate.setHours(sh, sm, 0, 0);

  const endDate = new Date();
  endDate.setHours(eh, em, 0, 0);

  return now >= startDate && now <= endDate;
}

function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<TodayLessonsResponse | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const tgUser = getTelegramUser();
  const firstName = tgUser?.first_name || "Foydalanuvchi";
  const telegramId = tgUser?.id;

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadTodayLessons() {
      try {
        setLoading(true);
        setError("");

        if (!telegramId) {
          throw new Error("Telegram user ID topilmadi");
        }

        const response = await fetch(`${BACKEND_URL}/today-lessons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegram_id: telegramId,
          }),
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.detail || "Backend xatolik qaytardi");
        }

        setData(json);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch");
      } finally {
        setLoading(false);
      }
    }

    loadTodayLessons();
  }, [telegramId]);

  const lessons = useMemo(() => data?.lessons || [], [data, nowTick]);

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <div className="app-title">School155</div>
      </div>

      <div className="page">
        <div className="hero-card">
          <div className="hero-school">155-Maktab</div>
          <div className="hero-title">Asosiy</div>
          <div className="hero-subtitle">Salom, {firstName}</div>
        </div>

        <div className="section-header">
          <div>
            <h2>Bugungi darslar</h2>
            {data && (
              <p className="section-meta">
                {data.weekday} • {data.class_name}
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="state-card">
            <div className="state-title">Yuklanmoqda...</div>
          </div>
        )}

        {!loading && error && (
          <div className="state-card error-card">
            <div className="state-title">Xatolik</div>
            <div className="state-text">{error}</div>
          </div>
        )}

        {!loading && !error && lessons.length === 0 && (
          <div className="state-card">
            <div className="state-title">Bugun dars topilmadi</div>
            <div className="state-text">
              Jadvalda bugungi kun uchun darslar yo‘q yoki class/weekday mos
              kelmadi.
            </div>
          </div>
        )}

        {!loading && !error && lessons.length > 0 && (
          <div className="lessons-list">
            {lessons.map((lesson) => {
              const current = isCurrentLesson(
                lesson.start_time,
                lesson.end_time
              );

              return (
                <div
                  key={lesson.poll_id || `${lesson.lesson_number}-${lesson.subject_name}`}
                  className={`lesson-card ${current ? "current-lesson pulse" : ""}`}
                >
                  <div className="lesson-top">
                    <div className="lesson-title-wrap">
                      <div className="lesson-title-row">
                        <h3 className="lesson-title">
                          {lesson.lesson_number}. {lesson.subject_name || "Fan nomi yo‘q"}
                        </h3>

                        {current && <span className="live-badge">🟢 Hozir</span>}
                      </div>

                      <div className="lesson-time">
                        {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                      </div>
                    </div>

                    <button
                      className={`rate-btn ${lesson.rated ? "rated-btn" : ""}`}
                      disabled={!lesson.poll_allowed}
                      onClick={() => {
                        if (!lesson.poll_allowed) return;
                        alert(
                          `Baholash oynasi keyin ulanadi.\n\nFan: ${lesson.subject_name}`
                        );
                      }}
                    >
                      {lesson.rated ? "✓ Baholandi" : "⭐ Baholang"}
                    </button>
                  </div>

                  <div className="teachers-block">
                    {lesson.teachers.length > 0 ? (
                      lesson.teachers.map((teacher, index) => (
                        <div className="teacher-line" key={`${teacher}-${index}`}>
                          {teacher}
                        </div>
                      ))
                    ) : (
                      <div className="teacher-line empty-teacher">
                        O‘qituvchi ko‘rsatilmagan
                      </div>
                    )}
                  </div>

                  {lesson.rated && lesson.rated_teachers.length > 0 && (
                    <div className="rated-info">
                      Baholangan: {lesson.rated_teachers.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}