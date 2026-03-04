import { useState, useEffect } from "react";
import { onAuthStateChanged, updateEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import "./EmailChangePage.css";

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const EmailChangePage = () => {
  const { t } = useLang();
  const navigate = useNavigate();

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentEmail(user.email ?? "");
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !newEmail.trim()) return;

    setError("");
    setSaving(true);

    try {
      await updateEmail(user, newEmail.trim());
      await setDoc(doc(db, "users", user.uid), { email: newEmail.trim() }, { merge: true });
      setSuccess(true);
      setTimeout(() => navigate("/settings"), 1800);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/requires-recent-login") {
        setError("Please sign out and sign in again before changing your email.");
      } else if (code === "auth/email-already-in-use") {
        setError("This email address is already in use.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(t.unexpectedError);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="echange-page">
        <p className="echange-loading">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="echange-page">
      <div className="echange-bg-shape echange-bg-shape--1" />
      <div className="echange-bg-shape echange-bg-shape--2" />
      <div className="echange-bg-shape echange-bg-shape--3" />

      <div className="echange-layout">
        <div className="echange-topbar">
          <h1 className="echange-title">{t.emailChangePage}</h1>
        </div>

        <div className="echange-card">
          {/* Current email */}
          <div className="echange-field echange-field--column">
            <span className="echange-field-label">{t.currentEmail}</span>
            <span className="echange-field-value">{currentEmail}</span>
          </div>

          <div className="echange-divider" />

          {/* New email input */}
          <div className="echange-field echange-field--column">
            <label className="echange-field-label" htmlFor="new-email">
              {t.newEmail}
            </label>
            <input
              id="new-email"
              type="email"
              className="echange-input"
              placeholder={t.newEmailPlaceholder}
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setError(""); }}
              disabled={saving || success}
              autoComplete="email"
            />
          </div>
        </div>

        {error && <p className="echange-error">{error}</p>}
        {success && <p className="echange-success">{t.emailUpdated}</p>}

        <div className="echange-actions">
          <button
            className="echange-btn echange-btn--cancel"
            onClick={() => navigate("/settings")}
            disabled={saving}
          >
            {t.cancel}
          </button>
          <button
            className="echange-btn echange-btn--save"
            onClick={handleSave}
            disabled={saving || !isValidEmail(newEmail.trim()) || success}
          >
            {saving ? t.loading : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailChangePage;
