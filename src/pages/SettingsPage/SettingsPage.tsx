import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { USERS, QUIZ_RESULTS, TEST_HISTORY, USERNAMES } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { getFirebaseErrorMessage, getFirebaseErrorCode } from "../../utils/firebaseErrors";
import BgShapes from "../../components/BgShapes/BgShapes";
import "./SettingsPage.css";

interface SettingsSelectOption {
  value: string;
  label: string;
}

const SettingsSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SettingsSelectOption[];
}) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div className="stn-dropdown" ref={ref}>
      <button
        ref={triggerRef}
        className="stn-dropdown-trigger"
        onClick={handleToggle}
        type="button"
      >
        {selected?.label}
        <svg
          className={`stn-dropdown-chevron${open ? " open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="stn-dropdown-menu"
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`stn-dropdown-item${opt.value === value ? " active" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              type="button"
            >
              {opt.label}
              {opt.value === value && (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

const SettingsPage = () => {
  const { t, lang, applyLang } = useLang();
  const { theme, applyTheme } = useTheme();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthGuard();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");

    const loadSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, USERS, user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.fullUsername ?? "");
          if (data.theme === "light" || data.theme === "dark") applyTheme(data.theme);
          if (data.lang === "en" || data.lang === "lv") applyLang(data.lang);
          if (user.email && data.email !== user.email) {
            await setDoc(doc(db, USERS, user.uid), { email: user.email }, { merge: true });
          }
        }
      } catch (err) {
        console.warn("SettingsPage: Firestore read failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, applyTheme, applyLang]);

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    applyTheme(newTheme);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, USERS, user.uid), { theme: newTheme }, { merge: true });
    } catch (err) {
      console.warn("SettingsPage: Failed to save theme", err);
    }
  };

  const handleLangChange = async (newLang: "en" | "lv") => {
    applyLang(newLang);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, USERS, user.uid), { lang: newLang }, { merge: true });
    } catch (err) {
      console.warn("SettingsPage: Failed to save language", err);
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setError("");
    try {
      if (username) {
        await deleteDoc(doc(db, USERNAMES, username));
      }
      await deleteDoc(doc(db, USERS, user.uid));
      await deleteDoc(doc(db, QUIZ_RESULTS, user.uid));
      const sessionsSnap = await getDocs(collection(db, TEST_HISTORY, user.uid, "sessions"));
      await Promise.all(sessionsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteUser(user);
      navigate("/login");
    } catch (err: unknown) {
      setShowDeleteConfirm(false);
      setError(getFirebaseErrorMessage(getFirebaseErrorCode(err), t));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="settings-page">
        <p className="settings-page-loading">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <BgShapes prefix="settings" />

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
                className="settings-action-btn settings-action-btn--neutral"
                onClick={() => navigate("/settings/email")}
              >
                {t.change}
              </button>
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.password}</span>
                <span className="settings-field-value settings-field-value--masked">••••••••••••</span>
              </div>
              <button
                className="settings-action-btn settings-action-btn--neutral"
                onClick={() => navigate("/settings/password")}
              >
                {t.change}
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
              <span className="settings-field-label">{t.theme}</span>
              <SettingsSelect
                value={theme}
                onChange={(v) => handleThemeChange(v as "light" | "dark")}
                options={[
                  { value: "light", label: t.themeLight },
                  { value: "dark", label: t.themeDark },
                ]}
              />
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <span className="settings-field-label">{t.language}</span>
              <SettingsSelect
                value={lang}
                onChange={(v) => handleLangChange(v as "en" | "lv")}
                options={[
                  { value: "en", label: t.langEnglish },
                  { value: "lv", label: t.langLatvian },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Other section */}
        <section className="settings-section">
          <h2 className="settings-section-heading">{t.other}</h2>
          <div className="settings-card">
            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-danger-title">{t.accountDeletion}</span>
                <span className="settings-field-label">{t.accountDeletionDesc}</span>
              </div>
              <button
                className="settings-action-btn settings-action-btn--danger"
                onClick={() => { setError(""); setShowDeleteConfirm(true); }}
              >
                {t.delete}
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
