import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import HomeTab from "./components/HomeTab";
import ProfileTab from "./components/ProfileTab";
import RateModal from "./components/RateModal";
import ScheduleTab from "./components/ScheduleTab";
import ZakovatTab from "./components/ZakovatTab";

import type {
  AnnouncementsResponse,
  Lesson,
  MeResponse,
  RegistrationProfile,
  TabKey,
  TodayLessonsResponse,
  TopTeachersResponse,
} from "./types/app";

import { getTelegramPhoto, getTelegramUser } from "./utils/telegram";

const BACKEND_URL = "https://school-miniapp-production-c830.up.railway.app";
const ME_ENDPOINT = `${BACKEND_URL}/me`;
const TODAY_LESSONS_ENDPOINT = `${BACKEND_URL}/today-lessons`;
const RATE_ENDPOINT = `${BACKEND_URL}/submit-rating`;
const ANNOUNCEMENTS_ENDPOINT = `${BACKEND_URL}/announcements`;
const TOP_TEACHERS_ENDPOINT = `${BACKEND_URL}/top-teachers`;

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

  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profile, setProfile] = useState<RegistrationProfile | null>(null);

  const [remoteAnnouncements, setRemoteAnnouncements] = useState<string[]>([]);
  const [topTeachers, setTopTeachers] = useState<TopTeachersResponse["top_teachers"]>([]);

  const tgUser = getTelegramUser();
  const photoUrl = getTelegramPhoto();

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
    if (!telegramId) {
      setCheckingProfile(false);
      return;
    }

    void checkRegistration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramId]);

  useEffect(() => {
    if (!profile || !telegramId) return;

    void loadTodayLessons();
    void loadAnnouncements();
    void loadTopTeachers();

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, telegramId]);

  const lessons = useMemo(() => data?.lessons || [], [data]);

  const studentAverageGradeText = useMemo(() => {
    if (!profile) return "—";

    if (profile.role === "teacher") {
      return "—";
    }

    const avg = profile.average_grade ?? data?.average_grade ?? "—";
    const avgText = String(avg).trim();

    return avgText || "—";
  }, [profile, data]);

  const fakeZakovatTop = useMemo(() => {
    const currentClass = data?.class_name || profile?.class_name || "8-A";

    return [
      { class_name: currentClass, points: 1280 },
      { class_name: "9-B", points: 1210 },
      { class_name: "7-A", points: 1160 },
    ];
  }, [data?.class_name, profile?.class_name]);

  const announcements = useMemo(() => {
    if (remoteAnnouncements.length > 0) return remoteAnnouncements;

    const items: string[] = [];

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
  }, [remoteAnnouncements, data?.weekday, lessons.length]);

  function showToast(message: string) {
    setToastMessage(message);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
    }, 1800);
  }

  async function checkRegistration() {
    try {
      setCheckingProfile(true);

      if (!telegramId) {
        setProfile(null);
        return;
      }

      const response = await fetch(`${ME_ENDPOINT}?telegram_id=${telegramId}`, {
        method: "GET",
      });

      if (!response.ok) {
        setProfile(null);
        return;
      }

      const json = (await response.json()) as MeResponse;

      if (json?.ok && json?.registered && json?.profile) {
        setProfile(json.profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setCheckingProfile(false);
    }
  }

  async function loadAnnouncements() {
    try {
      const response = await fetch(ANNOUNCEMENTS_ENDPOINT, {
        method: "GET",
      });

      if (!response.ok) return;

      const json = (await response.json()) as AnnouncementsResponse;
      const items = (json?.announcements || [])
        .map((item) => item.text?.trim())
        .filter(Boolean);

      setRemoteAnnouncements(items);
    } catch {
      setRemoteAnnouncements([]);
    }
  }

  async function loadTopTeachers() {
    try {
      const response = await fetch(TOP_TEACHERS_ENDPOINT, {
        method: "GET",
      });

      if (!response.ok) {
        setTopTeachers([]);
        return;
      }

      const json = (await response.json()) as TopTeachersResponse;
      setTopTeachers(json?.top_teachers || []);
    } catch {
      setTopTeachers([]);
    }
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
        const backendMessage = String(json?.detail || "").trim();

        if (backendMessage === "Foydalanuvchi ro‘yxatdan o‘tmagan") {
          throw new Error("Profil topilmadi. Botda ro‘yxatdan o‘tib, Mini App’ni qayta oching");
        }

        throw new Error(backendMessage || "Backend xatolik qaytardi");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch");
      setData(null);
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
      await loadTopTeachers();
      showToast("Baholash yuborildi");
    } catch (err: any) {
      showToast(err?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  function renderActiveTab() {
    if (!profile) return null;

    switch (activeTab) {
      case "home":
        return (
          <HomeTab
            loading={loading}
            error={error}
            lessons={lessons}
            weekday={data?.weekday}
            className={data?.class_name || profile.class_name}
            profile={profile}
            photoUrl={photoUrl}
            studentAverageGradeText={studentAverageGradeText}
            announcements={announcements}
            fakeZakovatTop={fakeZakovatTop}
            topTeachers={topTeachers}
            onOpenSchedule={() => setActiveTab("schedule")}
          />
        );

      case "schedule":
        return (
          <ScheduleTab
            loading={loading}
            error={error}
            lessons={lessons}
            weekday={data?.weekday}
            className={data?.class_name || profile.class_name}
            onOpenRateModal={openRateModal}
          />
        );

      case "zakovat":
        return <ZakovatTab />;

      case "profile":
        return (
          <ProfileTab
            profile={profile}
            telegramId={telegramId}
            username={username}
            weekday={data?.weekday}
            photoUrl={photoUrl}
            studentAverageGradeText={studentAverageGradeText}
          />
        );

      default:
        return null;
    }
  }

  if (checkingProfile) {
    return (
      <div className="app-shell">
        <main className="app-content">
          <div className="page">
            <div className="state-card">
              <div className="state-title">Yuklanmoqda...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-shell">
        <main className="app-content">
          <div className="page">
            <div className="registration-card registration-locked-card">
              <div className="registration-top">
                <div className="registration-school">155-Maktab</div>
                <div className="registration-title">Ro‘yxatdan o‘tish</div>
                <div className="registration-subtitle">
                  Mini App’dan foydalanish uchun avval Telegram botda ro‘yxatdan o‘ting.
                </div>
              </div>

              <div className="registration-info-box">
                <div className="registration-info-line">1. Telegram botga kiring</div>
                <div className="registration-info-line">
                  2. <strong>/start</strong> bosing
                </div>
                <div className="registration-info-line">
                  3. O‘zingizni tanlab ro‘yxatdan o‘ting
                </div>
                <div className="registration-info-line">
                  4. So‘ng Mini App’ni qayta oching
                </div>
              </div>

              <div className="registration-bot-note">@maktab155bot</div>
            </div>
          </div>
        </main>
      </div>
    );
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
          <span className="bottom-nav-icon">📚</span>
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

      <RateModal
        selectedLesson={selectedLesson}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        scoreValue={scoreValue}
        setScoreValue={setScoreValue}
        comment={comment}
        setComment={setComment}
        submitting={submitting}
        onClose={closeRateModal}
        onSubmit={submitRating}
      />

      {toastMessage && <div className="top-toast">{toastMessage}</div>}
    </div>
  );
}