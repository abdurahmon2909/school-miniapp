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
            photo_url?: string;
          };
        };
      };
    };
  }
}

export function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user;
}

export function getTelegramPhoto() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url || "";
}

export function getInitials(firstName?: string, lastName?: string, fullName?: string) {
  if (fullName?.trim()) {
    const parts = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";

    return `${first}${second}`.toUpperCase() || "U";
  }

  const a = firstName?.trim()?.[0] || "";
  const b = lastName?.trim()?.[0] || "";
  return `${a}${b}`.toUpperCase() || "U";
}