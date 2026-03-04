import { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import "./SettingsMenu.css";

const SettingsMenu = () => {
  const { t, lang, applyLang } = useLang();
  const { theme, applyTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleToggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { theme: newTheme }, { merge: true });
    } catch {
      // silent
    }
  };

  const handleToggleLang = async () => {
    const newLang = lang === "en" ? "lv" : "en";
    applyLang(newLang);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { lang: newLang }, { merge: true });
    } catch {
      // silent
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        className="settings-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="settings-dropdown">
          {/* Theme toggle */}
          <button className="settings-row" onClick={handleToggleTheme}>
            <span className="settings-row-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
            <span>{t.theme}</span>
            <span className="settings-row-value">{theme === "dark" ? t.switchToLight : t.switchToDark}</span>
          </button>

          {/* Language toggle */}
          <button className="settings-row" onClick={handleToggleLang}>
            <span className="settings-row-icon">🌐</span>
            <span>{t.language}</span>
            <span className="settings-row-value">{lang === "en" ? "EN" : "LV"}</span>
          </button>

          <div className="settings-divider" />

          {/* Settings */}
          <button className="settings-row" onClick={() => { setOpen(false); navigate("/settings"); }}>
            <span className="settings-row-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </span>
            <span>{t.settings}</span>
          </button>

          <div className="settings-divider" />

          {/* Sign out */}
          <button className="settings-row settings-row--danger" onClick={handleSignOut}>
            <span className="settings-row-icon">🚪</span>
            <span>{t.signOut}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
