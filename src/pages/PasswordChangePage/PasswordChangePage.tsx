import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import { validatePassword, isPasswordValid } from "../../utils/passwordValidation";
import "../EmailChangePage/EmailChangePage.css";
import "./PasswordChangePage.css";

const PasswordChangePage = () => {
  const { t } = useLang();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPwdFocused, setNewPwdFocused] = useState(false);

  const pwdCheck = validatePassword(newPassword);
  const canSave =
    currentPassword.length > 0 &&
    isPasswordValid(pwdCheck) &&
    newPassword === confirmPassword;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !user.email || !canSave) return;

    setError("");
    setSaving(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess(true);
      setTimeout(() => navigate("/settings"), 1800);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError(t.wrongPassword);
      } else if (code === "auth/requires-recent-login") {
        setError(t.errorRequiresRecentLogin);
      } else if (code === "auth/too-many-requests") {
        setError(t.errorTooManyRequests);
      } else if (code === "auth/network-request-failed") {
        setError(t.errorNetworkFailed);
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
          <h1 className="echange-title">{t.passwordChangePage}</h1>
        </div>

        <div className="echange-card">
          {/* Current password */}
          <div className="echange-field echange-field--column">
            <label className="echange-field-label" htmlFor="current-password">
              {t.currentPassword}
            </label>
            <input
              id="current-password"
              type="password"
              className="echange-input"
              placeholder={t.currentPasswordPlaceholder}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setError(""); }}
              disabled={saving || success}
              autoComplete="current-password"
            />
          </div>

          <div className="echange-divider" />

          {/* New password */}
          <div className="echange-field echange-field--column">
            <label className="echange-field-label" htmlFor="new-password">
              {t.newPassword}
            </label>
            <input
              id="new-password"
              type="password"
              className="echange-input"
              placeholder={t.newPasswordPlaceholder}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              onFocus={() => setNewPwdFocused(true)}
              onBlur={() => setNewPwdFocused(false)}
              disabled={saving || success}
              autoComplete="new-password"
            />
            {(newPwdFocused || newPassword.length > 0) && (
              <ul className="pchange-pwd-reqs">
                <li className={pwdCheck.minLength ? "met" : ""}>{t.pwdMinLength}</li>
                <li className={pwdCheck.hasLowercase ? "met" : ""}>{t.pwdLowercase}</li>
                <li className={pwdCheck.hasUppercase ? "met" : ""}>{t.pwdUppercase}</li>
                <li className={pwdCheck.hasDigit ? "met" : ""}>{t.pwdDigit}</li>
                <li className={pwdCheck.hasSymbol ? "met" : ""}>{t.pwdSymbol}</li>
              </ul>
            )}
          </div>

          <div className="echange-divider" />

          {/* Confirm new password */}
          <div className="echange-field echange-field--column">
            <label className="echange-field-label" htmlFor="confirm-password">
              {t.confirmNewPassword}
            </label>
            <input
              id="confirm-password"
              type="password"
              className="echange-input"
              placeholder={t.confirmNewPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              disabled={saving || success}
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && <p className="echange-error">{error}</p>}
        {success && <p className="echange-success">{t.passwordUpdated}</p>}

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
            disabled={saving || !canSave || success}
          >
            {saving ? t.loading : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangePage;
