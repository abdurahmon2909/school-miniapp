import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close?: () => void;
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

type TabKey = "home" | "schedule" | "zakovat" | "profile";

const BACKEND_URL = "https://school-miniapp-production-c830.up.railway.app";
const TODAY_LESSONS_ENDPOINT = `${BACKEND_URL}/today-lessons`;
const RATE_ENDPOINT = `${BACKEND_URL}/rate-teacher`;

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
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<TodayLessonsResponse | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [scoreValue, setScoreValue] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  const tgUser = getTelegramUser();
  const firstName = tgUser?.first_name || "Foydalanuvchi";
  const lastName = tgUser?.last_name || "";
  const username = tgUser?.username || "";
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
    void loadTodayLessons();

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramId]);

  const lessons = useMemo(() => data?.lessons || [], [data, nowTick]);

  const currentLesson = useMemo(() => {
    return lessons.find((lesson) =>
      isCurrentLesson(lesson.start_time, lesson.end_time)
    );
  }, [lessons, nowTick]);

  function showToast(message: string) {
    setToastMessage(message);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
    }, 1800);
  }

  async function loadTodayLessons() {
    try {
      setLoading(true);
      setError("");

      if (!telegramId) {
        throw new Error("Telegram user ID topilmadi");
      }

      const response = await fetch(TODAY_LESSONS_ENDPOINT, {
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

  function openRateModal(lesson: Lesson) {
    if (!lesson.poll_allowed || lesson.rated) return;

    setSelectedLesson(lesson);
    setSelectedTeacher(lesson.teachers[0] || "");
    setScoreValue(null);
    setComment("");
  }

  function closeRateModal() {
    if (submitting) return;
    setSelectedLesson(null);
    setSelectedTeacher("");
    setScoreValue(null);
    setComment("");
  }

  async function submitRating() {
    try {
      if (!telegramId) {
        throw new Error("Telegram ID topilmadi");
      }

      if (!selectedLesson) {
        throw new Error("Dars tanlanmagan");
      }

      if (!selectedTeacher.trim()) {
        throw new Error("O‘qituvchini tanlang");
      }

      if (scoreValue === null) {
        throw new Error("Baho tanlang");
      }

      setSubmitting(true);

      const payload = {
        telegram_id: telegramId,
        poll_id: selectedLesson.poll_id,
        chosen_teacher: selectedTeacher.trim(),
        score_value: scoreValue,
        anonymous_comment: comment.trim(),
      };

      const response = await fetch(RATE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.detail || "Baholashda xatolik yuz berdi");
      }

      closeRateModal();
      setActiveTab("home");
      await loadTodayLessons();
      showToast("Baholash yuborildi");
    } catch (err: any) {
      showToast(err?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  function renderHomeTab() {
    return (
      <>
        <div className="hero-card">
          <div className="hero-school">155-Maktab</div>
          <div className="hero-title">Asosiy</div>
          <div className="hero-subtitle">Salom, {firstName}</div>
        </div>

        {currentLesson && (
          <div className="info-banner current-banner">
            <div className="info-banner-label">🟢 Hozirgi dars</div>
            <div className="info-banner-title">
              {currentLesson.lesson_number}. {currentLesson.subject_name}
            </div>
            <div className="info-banner-text">
              {formatTime(currentLesson.start_time)} -{" "}
              {formatTime(currentLesson.end_time)}
            </div>
          </div>
        )}

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

        {renderLessonsContent()}
      </>
    );
  }

  function renderScheduleTab() {
    return (
      <>
        <div className="hero-card secondary-hero">
          <div className="hero-school">155-Maktab</div>
          <div className="hero-title">Dars jadvali</div>
          <div className="hero-subtitle">
            {data ? `${data.weekday} • ${data.class_name}` : "Bugungi jadval"}
          </div>
        </div>

        <div className="section-header">
          <div>
            <h2>Dars jadvali</h2>
            <p className="section-meta">Bugungi darslar ro‘yxati</p>
          </div>
        </div>

        {renderLessonsContent()}
      </>
    );
  }

  function renderZakovatTab() {
    return (
      <>
        <div className="hero-card zakovat-hero">
          <div className="hero-school">155-Maktab</div>
          <div className="hero-title">Zakovat</div>
          <div className="hero-subtitle">Maktab reyting va faollik bo‘limi</div>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <div className="feature-title">Top jamoalar</div>
            <div className="feature-text">
              Bu yerda keyin Zakovat reytinglari ko‘rinadi.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <div className="feature-title">Kitoblar do‘koni</div>
            <div className="feature-text">
              Zakovat ballari bilan kitob olish bo‘limi shu yerda bo‘ladi.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <div className="feature-title">Faollik</div>
            <div className="feature-text">
              O‘quvchilar va sinflarning ijtimoiy faollik ko‘rsatkichlari.
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderProfileTab() {
    return (
      <>
        <div className="hero-card profile-hero">
          <div className="hero-school">155-Maktab</div>
          <div className="hero-title">Profil</div>
          <div className="hero-subtitle">Shaxsiy ma’lumotlar</div>
        </div>

        <div className="profile-card">
          <div className="profile-avatar-ring">
            <div className="profile-avatar">
              {firstName?.[0]?.toUpperCase() || "U"}
            </div>
          </div>

          <div className="profile-name">
            {firstName} {lastName}
          </div>

          <div className="profile-info-list">
            <div className="profile-info-row">
              <span>Telegram ID</span>
              <strong>{telegramId || "-"}</strong>
            </div>

            <div className="profile-info-row">
              <span>Username</span>
              <strong>{username ? `@${username}` : "-"}</strong>
            </div>

            <div className="profile-info-row">
              <span>Sinf</span>
              <strong>{data?.class_name || "-"}</strong>
            </div>

            <div className="profile-info-row">
              <span>Bugungi kun</span>
              <strong>{data?.weekday || "-"}</strong>
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderLessonsContent() {
    if (loading) {
      return (
        <div className="state-card">
          <div className="state-title">Yuklanmoqda...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="state-card error-card">
          <div className="state-title">Xatolik</div>
          <div className="state-text">{error}</div>
        </div>
      );
    }

    if (lessons.length === 0) {
      return (
        <div className="state-card">
          <div className="state-title">Bugun dars topilmadi</div>
          <div className="state-text">
            Jadvalda bugungi kun uchun darslar yo‘q.
          </div>
        </div>
      );
    }

    return (
      <div className="lessons-list">
        {lessons.map((lesson) => {
          const current = isCurrentLesson(lesson.start_time, lesson.end_time);

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
                  disabled={!lesson.poll_allowed || lesson.rated}
                  onClick={() => openRateModal(lesson)}
                >
                  {lesson.rated ? "✓ Baholangan" : "⭐ Baholang"}
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
    );
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "home":
        return renderHomeTab();
      case "schedule":
        return renderScheduleTab();
      case "zakovat":
        return renderZakovatTab();
      case "profile":
        return renderProfileTab();
      default:
        return renderHomeTab();
    }
  }

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <div className="app-title">School155</div>
      </div>

      <div className="page with-bottom-nav">{renderActiveTab()}</div>

      <div className="bottom-nav">
        <button
          className={`bottom-nav-item ${activeTab === "home" ? "bottom-nav-item-active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          <span className="bottom-nav-icon">🏠</span>
          <span className="bottom-nav-label">Asosiy</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === "schedule" ? "bottom-nav-item-active" : ""}`}
          onClick={() => setActiveTab("schedule")}
        >
          <span className="bottom-nav-icon">📘</span>
          <span className="bottom-nav-label">Jadval</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === "zakovat" ? "bottom-nav-item-active" : ""}`}
          onClick={() => setActiveTab("zakovat")}
        >
          <span className="bottom-nav-icon">🧠</span>
          <span className="bottom-nav-label">Zakovat</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === "profile" ? "bottom-nav-item-active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <span className="bottom-nav-icon">👤</span>
          <span className="bottom-nav-label">Profil</span>
        </button>
      </div>

      {selectedLesson && (
        <div className="modal-overlay" onClick={closeRateModal}>
          <div className="rate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 className="modal-title">
                  {selectedLesson.subject_name || "Fan"}
                </h3>
                <p className="modal-subtitle">O‘qituvchini tanlang</p>
              </div>

              <button className="icon-close-btn" onClick={closeRateModal}>
                ×
              </button>
            </div>

            <div className="teacher-select-list">
              {selectedLesson.teachers.map((teacher) => {
                const active = selectedTeacher === teacher;

                return (
                  <button
                    key={teacher}
                    type="button"
                    className={`teacher-select-btn ${active ? "teacher-select-btn-active" : ""}`}
                    onClick={() => setSelectedTeacher(teacher)}
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
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeRateModal}
                disabled={submitting}
              >
                Bekor qilish
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={submitRating}
                disabled={submitting}
              >
                {submitting ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="top-toast">{toastMessage}</div>}
    </div>
  );
}