import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { getLevel, getGreetingKey, getInitials } from "../../utils/profileHelpers";
import { generateUniqueUsername, formatUsername } from "../../utils/generateUsername";
import SettingsMenu from "../../components/SettingsMenu/SettingsMenu";
import "./ProfilePage.css";

interface UserData {
  fullUsername: string;
  email: string;
  theme?: "light" | "dark";
  lang?: "en" | "lv";
}

interface TestResult {
  quizName: string;
  score: number;
  total: number;
  percentage: number;
  categoryResults?: Record<string, { total: number; correctCount: number; percentage: number }>;
}

// Placeholder modules until real data is available
const MODULES = [
  { id: "reading", nameKey: "moduleReading" as const, completed: 0, total: 8 },
];

const ProfilePage = () => {
  const { t, applyLang } = useLang();
  const { applyTheme } = useTheme();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        let data: UserData | null = userDoc.exists() ? (userDoc.data() as UserData) : null;

        if (!data?.fullUsername?.includes("#")) {
          const { name, tag } = await generateUniqueUsername(user.uid);
          const full = formatUsername(name, tag);
          await setDoc(
            userDocRef,
            { username: name, tag, fullUsername: full, email: data?.email ?? user.email ?? "" },
            { merge: true },
          );
          data = { ...(data ?? { email: user.email ?? "" }), fullUsername: full };
        }

        setUserData(data);

        if (data.theme === "light" || data.theme === "dark") applyTheme(data.theme);
        if (data.lang === "en" || data.lang === "lv") applyLang(data.lang);

        const resultDoc = await getDoc(doc(db, "quizResults", user.uid));
        if (resultDoc.exists()) setTestResult(resultDoc.data() as TestResult);
      } catch {
        // Firestore read may fail if rules are not set
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate, applyTheme, applyLang]);

  if (loading) {
    return (
      <div className="profile-page">
        <p className="profile-loading">{t.loading}</p>
      </div>
    );
  }

  const username = userData?.fullUsername ?? "User";
  const initials = getInitials(username);
  const greetingKey = getGreetingKey();
  const percentage = testResult?.percentage ?? 0;
  const level = getLevel(percentage);
  const levelLabel = t[`level_${level}` as keyof typeof t] as string;

  return (
    <div className="profile-page">
      {/* Decorative background shapes */}
      <div className="profile-bg-shape profile-bg-shape--1" />
      <div className="profile-bg-shape profile-bg-shape--2" />
      <div className="profile-bg-shape profile-bg-shape--3" />

      <div className="profile-layout">
        {/* ── Left sidebar ── */}
        <aside className="profile-sidebar">
          <nav className="sidebar-nav">
            <span className="sidebar-logo">STLAT</span>
            <div className="sidebar-divider" />
            <button className="sidebar-btn sidebar-btn--active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              <span>{t.navHome}</span>
            </button>
            <button className="sidebar-btn" onClick={() => navigate("/survey")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              <span>{t.navSurvey}</span>
            </button>
            <button className="sidebar-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
              <span>{t.navLectures}</span>
            </button>
          </nav>
        </aside>

        {/* ── Center content ── */}
        <main className="profile-main">
          {/* Greeting -- no card, just text on background */}
          <h1 className="profile-greeting">{t[greetingKey]}! 👋</h1>

          {/* Test result + level */}
          <div className="profile-card profile-test">
            <h2 className="profile-section-title">{t.lastTestResult}</h2>
            {testResult ? (
              <>
                <p className="profile-test-name">{testResult.quizName}</p>
                <div className="profile-progress-bar">
                  <div
                    className="profile-progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="profile-test-stats">
                  <span className="profile-test-percent">{percentage}%</span>
                  <span className={`profile-level profile-level--${level}`}>
                    {levelLabel}
                  </span>
                  <span className="profile-test-score">
                    {t.score}: {testResult.score}/{testResult.total}
                  </span>
                </div>
                {testResult.categoryResults && (
                  <div className="profile-category-breakdown">
                    {Object.entries(testResult.categoryResults).map(([cat, stats]) =>
                      stats.total > 0 ? (
                        <div className="profile-cat-row" key={cat}>
                          <span className="profile-cat-name">{cat}</span>
                          <div className="profile-cat-bar">
                            <div
                              className="profile-progress-fill"
                              style={{ width: `${stats.percentage}%` }}
                            />
                          </div>
                          <span className="profile-cat-pct">{stats.percentage}%</span>
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="profile-test-empty-wrap">
                <p className="profile-test-empty">{t.noTestResult}</p>
                <span className={`profile-level profile-level--${level}`}>
                  {levelLabel}
                </span>
              </div>
            )}
          </div>

          {/* Lectures block */}
          <div className="profile-card profile-learning">
            <h2 className="profile-section-title">{t.learningProgress}</h2>
            <div className="profile-modules">
              {MODULES.map((mod) => {
                const pct = mod.total > 0 ? Math.round((mod.completed / mod.total) * 100) : 0;
                return (
                  <div className="profile-module" key={mod.id}>
                    <div className="profile-module-header">
                      <span className="profile-module-name">{t[mod.nameKey]}</span>
                      <span className="profile-module-pct">{pct}%</span>
                    </div>
                    <div className="profile-progress-bar profile-progress-bar--small">
                      <div
                        className="profile-progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="profile-module-count">
                      {mod.completed}/{mod.total} {t.completed}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ── Right panel ── */}
        <aside className="profile-right">
          <div className="profile-topbar">
            <div className="profile-topbar-user">
              <div className="profile-avatar">{initials}</div>
              <span className="profile-username">{username}</span>
            </div>
            <SettingsMenu />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProfilePage;
