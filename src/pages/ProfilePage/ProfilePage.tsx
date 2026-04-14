import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { USERS, QUIZ_RESULTS } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { getLevel, getGreetingKey, getInitials } from "../../utils/profileHelpers";
import { generateUniqueUsername, formatUsername } from "../../utils/generateUsername";
import SettingsMenu from "../../components/SettingsMenu/SettingsMenu";
import BgShapes from "../../components/BgShapes/BgShapes";
import { getAllLectures, getUserProgress } from "../../services/lectureService";
import { isLectureComplete } from "../../types/lecture";
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

interface LectureProgress {
  lectureId: string;
  title: string;
  completed: number;
  total: number;
  isComplete: boolean;
}

const ProfilePage = () => {
  const { t, applyLang } = useLang();
  const { applyTheme } = useTheme();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthGuard();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [lectureProgressList, setLectureProgressList] = useState<LectureProgress[]>([]);
  const [totalSections, setTotalSections] = useState(0);
  const [completedSections, setCompletedSections] = useState(0);
  const [continueTarget, setContinueTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const userDocRef = doc(db, USERS, user.uid);
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

        const resultDoc = await getDoc(doc(db, QUIZ_RESULTS, user.uid));
        if (resultDoc.exists()) setTestResult(resultDoc.data() as TestResult);

        // Load lecture progress
        const [allLectures, lectureProgress] = await Promise.all([
          getAllLectures(),
          getUserProgress(user.uid),
        ]);
        const progressMap = new Map(lectureProgress.map((p) => [p.lectureId, p]));
        const totalSec = allLectures.reduce((sum, l) => sum + l.sections.length, 0);
        const completedSec = allLectures.reduce((sum, l) => {
          const p = progressMap.get(l.id);
          return sum + (p?.completedSections?.length ?? 0);
        }, 0);
        setTotalSections(totalSec);
        setCompletedSections(completedSec);

        // Build per-lecture progress for started lectures
        const perLecture: LectureProgress[] = allLectures
          .map((l) => {
            const p = progressMap.get(l.id);
            return {
              lectureId: l.id,
              title: l.title,
              completed: p?.completedSections?.length ?? 0,
              total: l.sections.length,
              isComplete: isLectureComplete(p, l),
            };
          })
          .filter((lp) => lp.completed > 0 && !lp.isComplete);
        setLectureProgressList(perLecture);

        // Determine continue target: first in-progress, else first unstarted
        const inProgress = allLectures.find((l) => {
          const p = progressMap.get(l.id);
          return p && p.completedSections?.length > 0 && !isLectureComplete(p, l);
        });
        const firstUnstarted = allLectures.find((l) => {
          const p = progressMap.get(l.id);
          return !p || !p.completedSections?.length;
        });
        setContinueTarget(inProgress?.id ?? firstUnstarted?.id ?? null);
      } catch (err) {
        console.warn("ProfilePage: Firestore read failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, applyTheme, applyLang]);

  const username = useMemo(() => userData?.fullUsername ?? "User", [userData]);
  const initials = useMemo(() => getInitials(username), [username]);
  const greetingKey = getGreetingKey();
  const percentage = testResult?.percentage ?? 0;
  const level = useMemo(() => getLevel(percentage), [percentage]);
  const levelLabel = useMemo(
    () => t[`level_${level}` as keyof typeof t] as string,
    [t, level],
  );

  if (authLoading || loading) {
    return (
      <div className="page-spinner-wrapper">
        <div className="page-spinner" />
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Decorative background shapes */}
      <BgShapes prefix="profile" />

      <div className="profile-layout">
        {/* ── Left sidebar ── */}
        <aside className="profile-sidebar">
          <nav className="sidebar-nav">
            <Link to="/profile" className="sidebar-logo-link">
              <span className="sidebar-logo">STLAT</span>
            </Link>
            <div className="sidebar-divider" />
            <button className="sidebar-btn sidebar-btn--active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              <span>{t.navHome}</span>
            </button>
            <button className="sidebar-btn" onClick={() => navigate("/test")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              <span>{t.navTest}</span>
            </button>
            <button className="sidebar-btn" onClick={() => navigate("/lectures")}>
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

            {/* Per-lecture breakdown (in-progress only) */}
            {lectureProgressList.length > 0 && (
              <div className="profile-modules">
                {lectureProgressList.map((lp) => {
                  const pct = lp.total > 0 ? Math.round((lp.completed / lp.total) * 100) : 0;
                  return (
                    <div className="profile-module profile-module--lecture" key={lp.lectureId}>
                      <div className="profile-module-header">
                        <span className="profile-module-name">{lp.title}</span>
                        <span className="profile-module-pct">{pct}%</span>
                      </div>
                      <div className="profile-progress-bar profile-progress-bar--small">
                        <div
                          className="profile-progress-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="profile-module-count">
                        {lp.completed}/{lp.total} {t.completed}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Continue / Start Reading button */}
            {continueTarget && (
              <Link
                to={`/lectures/${continueTarget}`}
                className="profile-module-continue"
              >
                {lectureProgressList.length > 0 ? t.continueReading : t.startReading}
              </Link>
            )}
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
