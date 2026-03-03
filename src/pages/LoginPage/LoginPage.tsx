import { useState, type FormEvent } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import {
  validatePassword,
  isPasswordValid,
} from "../../utils/passwordValidation";
import {
  generateUniqueUsername,
  formatUsername,
} from "../../utils/generateUsername";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import LangToggle from "../../components/LangToggle/LangToggle";
import "./LoginPage.css";

const LoginPage = () => {
  const { t } = useLang();
  const navigate = useNavigate();

  // Shared
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sign-in: email or username
  const [loginId, setLoginId] = useState("");

  // Sign-up
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwdReqs, setShowPwdReqs] = useState(false);

  // After sign-up: show generated username
  const [generatedUsername, setGeneratedUsername] = useState<string | null>(null);

  const pwdCheck = validatePassword(password);

  /**
   * Resolve a username (e.g. SilentFox#1234) to an email address
   * by querying the Firestore `users` collection.
   */
  const resolveLoginEmail = async (input: string): Promise<string> => {
    if (input.includes("@")) return input;

    const q = query(
      collection(db, "users"),
      where("fullUsername", "==", input),
    );
    const snap = await getDocs(q);
    if (snap.empty) throw new Error(t.unexpectedError);

    return snap.docs[0].data().email as string;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      // --- Validate password rules ---
      if (!isPasswordValid(pwdCheck)) return;

      if (password !== confirmPassword) {
        setError(t.passwordsDoNotMatch);
        return;
      }

      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        const { name, tag } = await generateUniqueUsername(cred.user.uid);
        const full = formatUsername(name, tag);

        await setDoc(doc(db, "users", cred.user.uid), {
          username: name,
          tag,
          fullUsername: full,
          email,
          createdAt: serverTimestamp(),
        });

        setGeneratedUsername(full);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError(t.unexpectedError);
      } finally {
        setLoading(false);
      }
    } else {
      // --- Sign In ---
      setLoading(true);
      try {
        const resolvedEmail = await resolveLoginEmail(loginId);
        await signInWithEmailAndPassword(auth, resolvedEmail, password);
        navigate("/profile");
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError(t.unexpectedError);
      } finally {
        setLoading(false);
      }
    }
  };

  // ── After sign-up: show the generated username ──
  if (generatedUsername) {
    return (
      <div className="login-page">
        <ThemeToggle />
        <LangToggle />
        <div className="login-bg-shape login-bg-shape--1" />
        <div className="login-bg-shape login-bg-shape--2" />
        <div className="login-bg-shape login-bg-shape--3" />

        <div className="login-card username-reveal">
          <h1 className="login-title">{t.yourUsername}</h1>
          <p className="generated-username">{generatedUsername}</p>
          <p className="login-subtitle">{t.yourUsernameSub}</p>
          <button
            className="login-button"
            onClick={() => navigate("/profile")}
          >
            {t.continueBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="login-page">
      <ThemeToggle />
      <LangToggle />
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
          {/* ── Sign-in: email or username ── */}
          {!isSignUp && (
            <div className="login-field">
              <label htmlFor="loginId" className="login-label">
                {t.emailOrUsername}
              </label>
              <input
                id="loginId"
                type="text"
                className="login-input"
                placeholder={t.emailOrUsernamePlaceholder}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}

          {/* ── Sign-up: email ── */}
          {isSignUp && (
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
          )}

          {/* ── Password ── */}
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
              onFocus={() => isSignUp && setShowPwdReqs(true)}
              onBlur={() => setShowPwdReqs(false)}
              required
              minLength={12}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />

            {/* Password requirements checklist (sign-up only) */}
            {isSignUp && showPwdReqs && (
              <ul className="pwd-reqs">
                <li className={pwdCheck.minLength ? "met" : ""}>{t.pwdMinLength}</li>
                <li className={pwdCheck.hasLowercase ? "met" : ""}>{t.pwdLowercase}</li>
                <li className={pwdCheck.hasUppercase ? "met" : ""}>{t.pwdUppercase}</li>
                <li className={pwdCheck.hasDigit ? "met" : ""}>{t.pwdDigit}</li>
                <li className={pwdCheck.hasSymbol ? "met" : ""}>{t.pwdSymbol}</li>
              </ul>
            )}
          </div>

          {/* ── Confirm password (sign-up only) ── */}
          {isSignUp && (
            <div className="login-field">
              <label htmlFor="confirmPassword" className="login-label">
                {t.confirmPassword}
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="login-input"
                placeholder={t.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? t.loading : isSignUp ? t.signUp : t.signIn}
          </button>
        </form>

        <p className="login-toggle">
          {isSignUp ? t.alreadyHaveAccount : t.dontHaveAccount}{" "}
          <button
            type="button"
            className="login-toggle-btn"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setPassword("");
              setConfirmPassword("");
              setShowPwdReqs(false);
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
