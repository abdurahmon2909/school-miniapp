import { useEffect, useMemo, useRef, useState } from "react";
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
const RATE_ENDPOINT = `${BACKEND_URL}/submit-rating`;

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

function getInitials(firstName: string, lastName: string) {
  const a = firstName?.trim()?.[0] || "";
  const b = lastName?.trim()?.[0] || "";
  return `${a}${b}`.toUpperCase() || "U";
}

function getWeekdayLabel(weekday?: string) {
  if (!weekday) return "";
  return weekday;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<TodayLessonsResponse | null>(null);
  const [, setNowTick] = useState(Date.now());

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

  const lessons = useMemo(() => data?.lessons || [], [data]);

  const currentLesson = useMemo(() => {
    return lessons.find((lesson) =>
      isCurrentLesson(lesson.start_time, lesson.end_time)
    );
  }, [lessons]);

  const initials = getInitials(firstName, lastName);

  const studentAverageGrade = "O‘rtacha: —";

  const fakeZakovatTop = useMemo(() => {
    const currentClass = data?.class_name || "8-A";

    return [
      { class_name: currentClass, points: 1280 },
      { class_name: "9-B", points: 1210 },
      { class_name: "7-A", points: 1160 },
    ];
  }, [data?.class_name]);

  const announcements = useMemo(() => {
    const items: string[] = [];

    if (currentLesson) {
      items.push(
        `${currentLesson.lesson_number}-dars: ${currentLesson.subject_name} hozir davom etmoqda`
      );
    }

    if (data?.weekday) {
      items.push(`${data.weekday} kuni darslar ko‘rsatilgan`);
    }

    if (lessons.length > 0) {
      items.push(`Bugun ${lessons.length} ta dars`);
    }

    items.push("Zakovat turniri ertaga 14:00 da");
    items.push("Kutubxonaga yangi kitoblar keldi");
    items.push("Yangi e’lonlar tez orada shu bo‘limga ulanadi");

    return items;
  }, [currentLesson, data?.weekday, lessons.length]);

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
        lesson_number: selectedLesson.lesson_number,
        subject_name: selectedLesson.subject_name,
        teacher_name: selectedTeacher.trim(),
        score_value: scoreValue,
        anonymous_comment: comment.trim(),
        opened_at: new Date().toISOString().slice(0, 19).replace("T", " "),
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
            <div className="schedule-subject">
              {lesson.subject_name || "Fan nomi yo‘q"}
            </div>

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
              <div className="schedule-teacher schedule-teacher-empty">
                O‘qituvchi ko‘rsatilmagan
              </div>
            )}
          </div>

          {!compact && (
            <>
              <div className="schedule-range">
                {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
              </div>

              <div className="lesson-actions-row">
                <button
                  className={`rate-btn ${lesson.rated ? "rated-btn" : ""}`}
                  disabled={!lesson.poll_allowed || lesson.rated}
                  onClick={() => openRateModal(lesson)}
                >
                  {lesson.rated ? "✓ Baholangan" : "⭐ Baholang"}
                </button>
              </div>

              {lesson.rated && lesson.rated_teachers.length > 0 && (
                <div className="rated-info">
                  Baholangan: {lesson.rated_teachers.join(", ")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderHomeTab() {
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
                <div className="main-profile-name">
                  {firstName} {lastName}
                </div>
                <div className="main-profile-role">O‘quvchi</div>
                <div className="main-profile-average">{studentAverageGrade}</div>
              </div>

              <div className="main-avatar-ring">
                <div className="main-avatar">{initials}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-grid stats-grid-single">
          <div className="info-stat-card">
            <div className="info-stat-label">Sinf</div>
            <div className="info-stat-value">{data?.class_name || "-"}</div>
          </div>
        </div>

        <div className="big-section-card">
          <div className="big-section-head">
            <h2>Bugungi jadval</h2>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => setActiveTab("schedule")}
            >
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
              <div className="state-text">
                Jadvalda bugungi kun uchun darslar yo‘q.
              </div>
            </div>
          ) : (
            <div className="schedule-list">
              {lessons.slice(0, 4).map((lesson) => renderLessonCard(lesson, true))}
            </div>
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
      </>
    );
  }

  function renderScheduleTab() {
    return (
      <>
        <div className="inner-page-head">
          <div className="inner-page-title">Dars jadvali</div>
          <div className="inner-page-subtitle">
            {data ? `${getWeekdayLabel(data.weekday)} • ${data.class_name}` : "Bugungi jadval"}
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
            <div className="state-text">
              Jadvalda bugungi kun uchun darslar yo‘q.
            </div>
          </div>
        ) : (
          <div className="schedule-list schedule-list-full">
            {lessons.map((lesson) => renderLessonCard(lesson))}
          </div>
        )}
      </>
    );
  }

  function renderZakovatTab() {
    return (
      <>
        <div className="inner-page-head">
          <div className="inner-page-title">Zakovat</div>
          <div className="inner-page-subtitle">
            Maktab reyting va faollik bo‘limi
          </div>
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
        <div className="inner-page-head">
          <div className="inner-page-title">Profil</div>
          <div className="inner-page-subtitle">Shaxsiy ma’lumotlar</div>
        </div>

        <div className="profile-card">
          <div className="profile-avatar-ring">
            <div className="profile-avatar">{initials}</div>
          </div>

          <div className="profile-name">
            {firstName} {lastName}
          </div>

          <div className="profile-role-badge">O‘quvchi</div>
          <div className="profile-average-text">{studentAverageGrade}</div>

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
      <main className="app-content">
        <div className={`page ${activeTab !== "home" ? "with-bottom-nav" : ""}`}>
          {renderActiveTab()}
        </div>
      </main>

      <div className="bottom-nav">
        <button
          className={`bottom-nav-item ${
            activeTab === "home" ? "bottom-nav-item-active" : ""
          }`}
          onClick={() => setActiveTab("home")}
        >
          <span className="bottom-nav-icon">🏠</span>
          <span className="bottom-nav-label">Asosiy</span>
        </button>

        <button
          className={`bottom-nav-item ${
            activeTab === "schedule" ? "bottom-nav-item-active" : ""
          }`}
          onClick={() => setActiveTab("schedule")}
        >
          <span className="bottom-nav-icon">📚</span>
          <span className="bottom-nav-label">Jadval</span>
        </button>

        <button
          className={`bottom-nav-item ${
            activeTab === "zakovat" ? "bottom-nav-item-active" : ""
          }`}
          onClick={() => setActiveTab("zakovat")}
        >
          <span className="bottom-nav-icon">🧠</span>
          <span className="bottom-nav-label">Zakovat</span>
        </button>

        <button
          className={`bottom-nav-item ${
            activeTab === "profile" ? "bottom-nav-item-active" : ""
          }`}
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
                    className={`teacher-select-btn ${
                      active ? "teacher-select-btn-active" : ""
                    }`}
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