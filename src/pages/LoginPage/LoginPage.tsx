import { useState, type FormEvent } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import "./LoginPage.css";

const LoginPage = () => {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle form submission for sign-in or sign-up
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.unexpectedError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative background shapes */}
      <div className="login-bg-shape login-bg-shape--1" />
      <div className="login-bg-shape login-bg-shape--2" />
      <div className="login-bg-shape login-bg-shape--3" />

      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">
            {isSignUp ? t.createAccount : t.welcomeBack}
          </h1>
          <p className="login-subtitle">
            {isSignUp ? t.signUpSubtitle : t.signInSubtitle}
          </p>
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

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              {t.password}
            </label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          {/* Display authentication errors */}
          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? t.loading : isSignUp ? t.signUp : t.signIn}
          </button>
        </form>

        {/* Toggle between sign-in and sign-up modes */}
        <p className="login-toggle">
          {isSignUp ? t.alreadyHaveAccount : t.dontHaveAccount}{" "}
          <button
            type="button"
            className="login-toggle-btn"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
          >
            {isSignUp ? t.signIn : t.signUp}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
