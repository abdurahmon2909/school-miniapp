export default function ZakovatTab() {
  return (
    <>
      <div className="inner-page-head">
        <div className="inner-page-title">Zakovat</div>
        <div className="inner-page-subtitle">Maktab reyting va faollik bo‘limi</div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">🏆</div>
          <div className="feature-title">Top jamoalar</div>
          <div className="feature-text">Bu yerda keyin Zakovat reytinglari ko‘rinadi.</div>
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