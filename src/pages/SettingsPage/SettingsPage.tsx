import { useState, useEffect } from "react";
import { onAuthStateChanged, sendPasswordResetEmail, deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import "./SettingsPage.css";

const SettingsPage = () => {
  const { t, lang, toggleLang, applyLang } = useLang();
  const { theme, toggleTheme, applyTheme } = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setEmail(user.email ?? "");

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.fullUsername ?? "");
          if (data.theme === "light" || data.theme === "dark") applyTheme(data.theme);
          if (data.lang === "en" || data.lang === "lv") applyLang(data.lang);
        }
      } catch {
        // Firestore read may fail
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate, applyTheme, applyLang]);

  const handleThemeToggle = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    toggleTheme();
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { theme: newTheme }, { merge: true });
    } catch {}
  };

  const handleLangToggle = async () => {
    const newLang = lang === "en" ? "lv" : "en";
    toggleLang();
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { lang: newLang }, { merge: true });
    } catch {}
  };

  const handlePasswordDelete = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    setError("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch {
      setError(t.unexpectedError);
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setError("");
    try {
      await deleteUser(user);
      navigate("/login");
    } catch {
      setShowDeleteConfirm(false);
      setError(t.unexpectedError);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <p className="settings-page-loading">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-bg-shape settings-bg-shape--1" />
      <div className="settings-bg-shape settings-bg-shape--2" />
      <div className="settings-bg-shape settings-bg-shape--3" />

      <div className="settings-layout">
        <div className="settings-topbar">
          <button className="settings-back-btn" onClick={() => navigate("/profile")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t.backToProfile}
          </button>
          <h1 className="settings-page-title">{t.settingsPageTitle}</h1>
        </div>

        {/* Account section */}
        <section className="settings-section">
          <h2 className="settings-section-heading">{t.account}</h2>
          <div className="settings-card">
            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.username}</span>
                <span className="settings-field-value">{username}</span>
              </div>
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.email}</span>
                <span className="settings-field-value">{email}</span>
              </div>
              <button
                className="settings-action-btn settings-action-btn--danger"
                onClick={() => { setError(""); setShowDeleteConfirm(true); }}
              >
                {t.delete}
              </button>
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.password}</span>
                <span className="settings-field-value settings-field-value--masked">••••••••••••</span>
              </div>
              <button
                className="settings-action-btn settings-action-btn--danger"
                onClick={handlePasswordDelete}
                disabled={resetSent}
              >
                {resetSent ? t.resetSent : t.delete}
              </button>
            </div>
          </div>
          {error && <p className="settings-page-error">{error}</p>}
        </section>

        {/* Settings section */}
        <section className="settings-section">
          <h2 className="settings-section-heading">{t.settings}</h2>
          <div className="settings-card">
            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.theme}</span>
                <span className="settings-field-value">
                  {theme === "dark" ? t.switchToLight : t.switchToDark}
                </span>
              </div>
              <button className="settings-toggle-btn" onClick={handleThemeToggle}>
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.language}</span>
                <span className="settings-field-value">
                  {lang === "en" ? "English" : "Latviešu"}
                </span>
              </div>
              <button className="settings-toggle-btn" onClick={handleLangToggle}>
                {lang === "en" ? "LV" : "EN"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <div className="settings-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="settings-modal-title">{t.confirmDeleteAccount}</h3>
            <p className="settings-modal-desc">{t.confirmDeleteDesc}</p>
            <div className="settings-modal-actions">
              <button
                className="settings-modal-btn settings-modal-btn--cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t.cancel}
              </button>
              <button
                className="settings-modal-btn settings-modal-btn--confirm"
                onClick={handleDeleteAccount}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
