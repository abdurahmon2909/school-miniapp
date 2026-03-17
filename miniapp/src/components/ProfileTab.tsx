import type { RegistrationProfile } from "../types/app";
import { getInitials } from "../utils/telegram";

type Props = {
  profile: RegistrationProfile;
  telegramId?: number;
  username?: string;
  weekday?: string;
  photoUrl: string;
  studentAverageGradeText: string;
};

export default function ProfileTab({
  profile,
  telegramId,
  username,
  weekday,
  photoUrl,
  studentAverageGradeText,
}: Props) {
  const profileName = profile.full_name || "Foydalanuvchi";
  const roleLabel = profile.role === "teacher" ? "O‘qituvchi" : "O‘quvchi";

  const subLine =
    profile.role === "teacher"
      ? profile.subject || "Fan kiritilmagan"
      : profile.class_name || "Sinf kiritilmagan";

  return (
    <section className="profile-card">
      <div className="profile-avatar-ring">
        <div className="profile-avatar">
          {photoUrl ? (
            <img className="profile-avatar-img" src={photoUrl} alt={profileName} />
          ) : (
            getInitials(profileName)
          )}
        </div>
      </div>

      <div className="profile-name">{profileName}</div>
      <div className="profile-role-badge">{roleLabel}</div>
      <div className="profile-average-text">{studentAverageGradeText}</div>
      <div className="profile-class-line">{subLine}</div>

      <div className="profile-info-list">
        <div className="profile-info-row">
          <span>F.I.Sh</span>
          <strong>{profile.full_name || "-"}</strong>
        </div>

        <div className="profile-info-row">
          <span>Rol</span>
          <strong>{roleLabel}</strong>
        </div>

        <div className="profile-info-row">
          <span>Sinf</span>
          <strong>{profile.class_name || "-"}</strong>
        </div>

        <div className="profile-info-row">
          <span>Fan</span>
          <strong>{profile.subject || "-"}</strong>
        </div>

        <div className="profile-info-row">
          <span>Telefon</span>
          <strong>{profile.phone || "-"}</strong>
        </div>

        <div className="profile-info-row">
          <span>Username</span>
          <strong>{profile.username || username || "-"}</strong>
        </div>

        <div className="profile-info-row">
          <span>Telegram ID</span>
          <strong>{telegramId || profile.telegram_id || "-"}</strong>
        </div>

        <div className="profile-info-row">
          <span>Bugungi kun</span>
          <strong>{weekday || "-"}</strong>
        </div>
      </div>
    </section>
  );
}