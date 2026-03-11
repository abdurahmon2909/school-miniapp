import { useEffect, useState } from "react";

function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (!tg) return;

    tg.ready();
    tg.expand();

    const telegramUser = tg.initDataUnsafe?.user;

    if (telegramUser) {
      setUser(telegramUser);
    }
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>🏫 155-Maktab tizimi</h1>

      {user ? (
        <div>
          <h2>👤 Profil</h2>
          <p><b>ID:</b> {user.id}</p>
          <p><b>Ism:</b> {user.first_name}</p>
          <p><b>Familiya:</b> {user.last_name}</p>
          <p><b>Username:</b> @{user.username}</p>
        </div>
      ) : (
        <p>Telegram orqali ochilmagan</p>
      )}
    </div>
  );
}

export default App;