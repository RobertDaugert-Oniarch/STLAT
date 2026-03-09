import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import LangToggle from "../../components/LangToggle/LangToggle";
import "../LoginPage/LoginPage.css";

const PasswordResetPage = () => {
  const { t } = useLang();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/invalid-email") setError(t.errorInvalidEmail);
      else if (code === "auth/too-many-requests") setError(t.errorTooManyRequests);
      else if (code === "auth/network-request-failed") setError(t.errorNetworkFailed);
      else setError(t.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="login-page">
        <ThemeToggle />
        <LangToggle />
        <div className="login-bg-shape login-bg-shape--1" />
        <div className="login-bg-shape login-bg-shape--2" />
        <div className="login-bg-shape login-bg-shape--3" />

        <div className="login-card username-reveal">
          <div className="login-header">
            <h1 className="login-title">{t.resetSent}</h1>
            <p className="login-subtitle">{t.resetEmailSentDesc}</p>
          </div>
          <button
            className="login-button"
            onClick={() => navigate("/login")}
          >
            {t.backToLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <ThemeToggle />
      <LangToggle />
      <div className="login-bg-shape login-bg-shape--1" />
      <div className="login-bg-shape login-bg-shape--2" />
      <div className="login-bg-shape login-bg-shape--3" />

      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">{t.resetPasswordTitle}</h1>
          <p className="login-subtitle">{t.resetPasswordSubtitle}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email" className="login-label">
              {t.email}
            </label>
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? t.loading : t.sendResetEmail}
          </button>
        </form>

        <p className="login-toggle">
          <button
            type="button"
            className="login-toggle-btn"
            onClick={() => navigate("/login")}
          >
            {t.backToLogin}
          </button>
        </p>
      </div>
    </div>
  );
};

export default PasswordResetPage;
