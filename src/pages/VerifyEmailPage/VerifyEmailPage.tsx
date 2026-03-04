import { useState, useEffect } from "react";
import { onAuthStateChanged, sendEmailVerification, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import LangToggle from "../../components/LangToggle/LangToggle";
import "../LoginPage/LoginPage.css";
import "./VerifyEmailPage.css";

const RESEND_COOLDOWN = 60;

const VerifyEmailPage = () => {
  const { t } = useLang();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      if (user.emailVerified) {
        navigate("/profile");
        return;
      }
      setEmail(user.email ?? "");
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleContinue = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setChecking(true);
    setError("");
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        navigate("/profile");
      } else {
        setError(t.verifyEmailNotVerified);
      }
    } catch {
      setError(t.unexpectedError);
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user || cooldown > 0) return;
    setResending(true);
    setResent(false);
    setError("");
    try {
      await sendEmailVerification(user);
      setResent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError(t.unexpectedError);
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="login-page">
        <p className="vep-loading">{t.loading}</p>
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

      <div className="login-card vep-card">
        <div className="vep-icon">✉️</div>
        <h1 className="login-title">{t.verifyEmailTitle}</h1>
        <p className="login-subtitle">{t.verifyEmailDesc}</p>
        <p className="vep-email">{email}</p>

        {error && <p className="login-error">{error}</p>}
        {resent && !error && <p className="vep-resent">{t.verifyEmailResent}</p>}

        <button
          className="login-button"
          onClick={handleContinue}
          disabled={checking}
        >
          {checking ? t.loading : t.verifyEmailCheck}
        </button>

        <button
          className="login-button vep-btn--secondary"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {cooldown > 0
            ? `${t.verifyEmailResend} (${cooldown}s)`
            : resending ? t.loading : t.verifyEmailResend}
        </button>

        <button className="login-toggle-btn vep-signout" onClick={handleSignOut}>
          {t.signOut}
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
