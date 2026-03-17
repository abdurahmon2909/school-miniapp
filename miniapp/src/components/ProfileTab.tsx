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
  const initials = getInitials(undefined, undefined, profile.selected_name);
  const roleLabel = profile.role === "teacher" ? "O‘qituvchi" : "O‘quvchi";

  return (
    <>
      <div className="inner-page-head">
        <div className="inner-page-title">Profil</div>
        <div className="inner-page-subtitle">Shaxsiy ma’lumotlar</div>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-ring">
          {photoUrl ? (
            <img src={photoUrl} alt="avatar" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar">{initials}</div>
          )}
        </div>

        <div className="profile-name">{profile.selected_name}</div>
        <div className="profile-role-badge">{roleLabel}</div>
        <div className="profile-average-text">{studentAverageGradeText}</div>

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
            <span>Rol</span>
            <strong>{roleLabel}</strong>
          </div>

          <div className="profile-info-row">
            <span>Sinf</span>
            <strong>{profile.class_name || "-"}</strong>
          </div>

          <div className="profile-info-row">
            <span>Fan</span>
            <strong>{profile.subject_name || "-"}</strong>
          </div>

          <div className="profile-info-row">
            <span>Bugungi kun</span>
            <strong>{weekday || "-"}</strong>
          </div>
        </div>
      </div>
    </>
  );
}