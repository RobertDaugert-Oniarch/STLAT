import { useState, useEffect, useMemo, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { USERS } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { getInitials } from "../../utils/profileHelpers";
import { generateUniqueUsername, formatUsername } from "../../utils/generateUsername";
import {
  getAllLectures,
  getUserProgress,
  getRecommendedLectures,
} from "../../services/lectureService";
import type { LectureDoc, UserLectureProgress } from "../../types/lecture";
import { isLectureComplete } from "../../types/lecture";
import type { TestCategory } from "../../types/test";
import SettingsMenu from "../../components/SettingsMenu/SettingsMenu";
import BgShapes from "../../components/BgShapes/BgShapes";
import LectureCard from "../../components/LectureCard/LectureCard";
import "./LecturesPage.css";

const CATEGORY_FILTERS: { key: string; value: TestCategory | "all" }[] = [
  { key: "filterAll", value: "all" },
  { key: "filterKnowledge", value: "Knowledge" },
  { key: "filterAttitudes", value: "Attitudes" },
  { key: "filterBehaviour", value: "Behaviour" },
  { key: "filterConfidence", value: "Confidence in One's Judgement" },
];

type StatusFilter = "all" | "new" | "inProgress" | "completed";
const STATUS_FILTERS: { key: string; value: StatusFilter }[] = [
  { key: "filterAll", value: "all" },
  { key: "filterNew", value: "new" },
  { key: "filterInProgress", value: "inProgress" },
  { key: "filterCompleted", value: "completed" },
];

const LecturesPage = () => {
  const { t, lang } = useLang();
  const { applyTheme } = useTheme();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthGuard();

  const [username, setUsername] = useState("User");
  const [lectures, setLectures] = useState<LectureDoc[]>([]);
  const [progress, setProgress] = useState<UserLectureProgress[]>([]);
  const [recommended, setRecommended] = useState<LectureDoc[]>([]);
  const [filter, setFilter] = useState<TestCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        // Load user data for topbar (non-critical)
        try {
          const userDoc = await getDoc(doc(db, USERS, user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUsername(data.fullUsername ?? "User");
            if (data.theme === "light" || data.theme === "dark") applyTheme(data.theme);
          } else {
            const { name, tag } = await generateUniqueUsername(user.uid);
            const full = formatUsername(name, tag);
            await setDoc(
              doc(db, USERS, user.uid),
              { username: name, tag, fullUsername: full, email: user.email ?? "" },
              { merge: true },
            );
            setUsername(full);
          }
        } catch {
          // User data is non-critical — continue with defaults
        }

        // Load lectures (critical) and progress (non-critical) separately
        let allLectures: LectureDoc[] = [];
        let userProgress: UserLectureProgress[] = [];

        allLectures = await getAllLectures();

        try {
          userProgress = await getUserProgress(user.uid);
        } catch {
          // Progress may fail for new users — continue without it
        }

        setLectures(allLectures);
        setProgress(userProgress);

        try {
          const recs = await getRecommendedLectures(user.uid, allLectures, userProgress);
          setRecommended(recs);
        } catch {
          // Recommendations are non-critical
        }
      } catch (err) {
        console.warn("LecturesPage: load failed", err);
        setError(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, applyTheme]);

  const progressMap = useMemo(() => {
    const map = new Map<string, UserLectureProgress>();
    for (const p of progress) map.set(p.lectureId, p);
    return map;
  }, [progress]);

  const inProgressLectures = useMemo(
    () =>
      lectures.filter((l) => {
        const p = progressMap.get(l.id);
        if (!p || !p.completedSections?.length) return false;
        return !isLectureComplete(p, l);
      }),
    [lectures, progressMap],
  );

  const filteredLectures = useMemo(() => {
    let list = filter === "all" ? lectures : lectures.filter((l) => l.category === filter);

    if (statusFilter !== "all") {
      list = list.filter((l) => {
        const p = progressMap.get(l.id);
        const done = p ? isLectureComplete(p, l) : false;
        const started = (p?.completedSections?.length ?? 0) > 0;
        if (statusFilter === "new") return !started;
        if (statusFilter === "inProgress") return started && !done;
        return done;
      });
    }

    return list;
  }, [lectures, filter, statusFilter, progressMap]);

  const openLecture = useCallback(
    (id: string) => navigate(`/lectures/${id}`),
    [navigate],
  );

  const initials = useMemo(() => getInitials(username), [username]);

  if (authLoading || loading) {
    return (
      <div className="lectures-page">
        <BgShapes prefix="lectures" />
        <div className="lectures-layout">
          <aside className="profile-sidebar" />
          <main className="lectures-main">
            <div className="lectures-skeleton-heading" />
            <div className="lectures-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="lecture-skeleton-card">
                  <div className="lecture-skeleton-cover" />
                  <div className="lecture-skeleton-body">
                    <div className="lecture-skeleton-line" />
                    <div className="lecture-skeleton-line lecture-skeleton-line--short" />
                  </div>
                </div>
              ))}
            </div>
          </main>
          <aside className="profile-right" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-spinner-wrapper">
        <div className="lectures-error">
          <p className="lectures-error-text">{error}</p>
          <button
            className="lectures-error-btn"
            onClick={() => {
              setError(null);
              setLoading(true);
            }}
            type="button"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lectures-page">
      <BgShapes prefix="lectures" />

      <div className="lectures-layout">
        {/* ── Sidebar ── */}
        <aside className="profile-sidebar">
          <nav className="sidebar-nav">
            <Link to="/profile" className="sidebar-logo-link">
              <span className="sidebar-logo">STLAT</span>
            </Link>
            <div className="sidebar-divider" />
            <button className="sidebar-btn" onClick={() => navigate("/profile")}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              <span>{t.navHome}</span>
            </button>
            <button className="sidebar-btn" onClick={() => navigate("/test")}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              <span>{t.navTest}</span>
            </button>
            <button className="sidebar-btn sidebar-btn--active">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
              <span>{t.navLectures}</span>
            </button>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="lectures-main">
          <h1 className="lectures-heading">{t.navLectures}</h1>

          {/* Continue Reading */}
          {inProgressLectures.length > 0 && (
            <section className="lectures-section">
              <h2 className="lectures-section-title">{t.continueReading}</h2>
              <div className="lectures-grid lectures-grid--row">
                {inProgressLectures.slice(0, 4).map((lec) => (
                  <LectureCard
                    key={lec.id}
                    lecture={lec}
                    progress={progressMap.get(lec.id)}
                    onClick={() => openLecture(lec.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recommended */}
          {recommended.length > 0 && (
            <section className="lectures-section">
              <h2 className="lectures-section-title">{t.recommended}</h2>
              <div className="lectures-grid lectures-grid--row">
                {recommended.slice(0, 4).map((lec) => (
                  <LectureCard
                    key={lec.id}
                    lecture={lec}
                    progress={progressMap.get(lec.id)}
                    onClick={() => openLecture(lec.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All lectures */}
          <section className="lectures-section">
            <h2 className="lectures-section-title">{t.allLectures}</h2>

            {/* Category filter tabs */}
            <div className="lectures-filters">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`lectures-filter-btn${filter === f.value ? " lectures-filter-btn--active" : ""}`}
                  onClick={() => setFilter(f.value)}
                  type="button"
                >
                  {t[f.key as keyof typeof t] as string}
                </button>
              ))}
            </div>

            {/* Status filter tabs */}
            <div className="lectures-filters">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`lectures-filter-btn${statusFilter === f.value ? " lectures-filter-btn--active" : ""}`}
                  onClick={() => setStatusFilter(f.value)}
                  type="button"
                >
                  {t[f.key as keyof typeof t] as string}
                </button>
              ))}
            </div>

            {filteredLectures.length > 0 ? (
              <div className="lectures-grid">
                {filteredLectures.map((lec) => (
                  <LectureCard
                    key={lec.id}
                    lecture={lec}
                    progress={progressMap.get(lec.id)}
                    onClick={() => openLecture(lec.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="lectures-empty">{t.noLecturesYet}</p>
            )}
          </section>
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

export default LecturesPage;
