import { useMemo, useState } from "react";
import type {
  RegistrationOptionsResponse,
  RegistrationProfile,
  TeacherOption,
  UserRole,
} from "../types/app";

type Props = {
  telegramId?: number;
  firstName: string;
  lastName: string;
  username: string;
  backendUrl: string;
  onRegistered: (profile: RegistrationProfile) => void;
};

export default function RegistrationGate({
  telegramId,
  firstName,
  lastName,
  username,
  backendUrl,
  onRegistered,
}: Props) {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [role, setRole] = useState<UserRole | "">("");
  const [options, setOptions] = useState<RegistrationOptionsResponse | null>(null);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");

  const filteredStudents = useMemo(() => {
    if (!options || !selectedClass) return [];
    return options.students.filter((s) => s.class_name === selectedClass);
  }, [options, selectedClass]);

  const filteredTeachers = useMemo(() => {
    if (!options || !selectedSubject) return [];
    return options.teachers.filter((t: TeacherOption) => t.subject_name === selectedSubject);
  }, [options, selectedSubject]);

  async function loadOptions(nextRole: UserRole) {
    try {
      setLoadingOptions(true);
      setError("");

      const res = await fetch(`${backendUrl}/registration-options`, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("Ro‘yxatdan o‘tish ma’lumotlarini yuklab bo‘lmadi");
      }

      const json = (await res.json()) as RegistrationOptionsResponse;
      setOptions(json);
      setRole(nextRole);
    } catch (err: any) {
      setError(err?.message || "Xatolik yuz berdi");
    } finally {
      setLoadingOptions(false);
    }
  }

  async function submitRegistration() {
    try {
      if (!telegramId) {
        throw new Error("Telegram ID topilmadi");
      }

      if (!role) {
        throw new Error("Rolni tanlang");
      }

      let selected_name = "";
      let class_name = "";
      let subject_name = "";

      if (role === "student") {
        if (!selectedClass) throw new Error("Sinfni tanlang");
        if (!selectedStudent) throw new Error("O‘quvchini tanlang");

        selected_name = selectedStudent;
        class_name = selectedClass;
      }

      if (role === "teacher") {
        if (!selectedSubject) throw new Error("Fanni tanlang");
        if (!selectedTeacher) throw new Error("O‘qituvchini tanlang");

        selected_name = selectedTeacher;
        subject_name = selectedSubject;
      }

      setSubmitting(true);
      setError("");

      const payload = {
        telegram_id: telegramId,
        first_name: firstName,
        last_name: lastName,
        username,
        role,
        selected_name,
        class_name,
        subject_name,
      };

      const res = await fetch(`${backendUrl}/register-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.detail || "Ro‘yxatdan o‘tishda xatolik");
      }

      onRegistered(json.profile || payload);
    } catch (err: any) {
      setError(err?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="registration-shell">
      <div className="registration-card">
        <div className="registration-top">
          <div className="registration-school">155-Maktab</div>
          <div className="registration-title">Ro‘yxatdan o‘tish</div>
          <div className="registration-subtitle">
            Tizimdan foydalanish uchun o‘zingizni tanlang
          </div>
        </div>

        {!role && (
          <div className="registration-role-grid">
            <button
              className="registration-role-btn"
              onClick={() => loadOptions("student")}
              disabled={loadingOptions}
            >
              👨‍🎓 O‘quvchi
            </button>

            <button
              className="registration-role-btn"
              onClick={() => loadOptions("teacher")}
              disabled={loadingOptions}
            >
              👨‍🏫 O‘qituvchi
            </button>
          </div>
        )}

        {loadingOptions && <div className="registration-info">Yuklanmoqda...</div>}

        {role === "student" && options && (
          <div className="registration-form">
            <label className="registration-label">Sinfni tanlang</label>
            <select
              className="registration-select"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudent("");
              }}
            >
              <option value="">Sinfni tanlang</option>
              {options.classes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label className="registration-label">O‘quvchini tanlang</label>
            <select
              className="registration-select"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={!selectedClass}
            >
              <option value="">O‘quvchini tanlang</option>
              {filteredStudents.map((student) => (
                <option key={`${student.class_name}-${student.name}`} value={student.name}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {role === "teacher" && options && (
          <div className="registration-form">
            <label className="registration-label">Fanni tanlang</label>
            <select
              className="registration-select"
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTeacher("");
              }}
            >
              <option value="">Fanni tanlang</option>
              {options.subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label className="registration-label">O‘qituvchini tanlang</label>
            <select
              className="registration-select"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              disabled={!selectedSubject}
            >
              <option value="">O‘qituvchini tanlang</option>
              {filteredTeachers.map((teacher) => (
                <option key={`${teacher.subject_name}-${teacher.name}`} value={teacher.name}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {role && (
          <div className="registration-actions">
            <button
              className="secondary-btn registration-back-btn"
              type="button"
              onClick={() => {
                if (submitting) return;
                setRole("");
                setSelectedClass("");
                setSelectedStudent("");
                setSelectedSubject("");
                setSelectedTeacher("");
              }}
              disabled={submitting}
            >
              Ortga
            </button>

            <button
              className="primary-btn registration-submit-btn"
              type="button"
              onClick={submitRegistration}
              disabled={submitting}
            >
              {submitting ? "Saqlanmoqda..." : "Davom etish"}
            </button>
          </div>
        )}

        {error && <div className="registration-error">{error}</div>}
      </div>
    </div>
  );
}