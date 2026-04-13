import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { db } from "../../firebase/config";
import { USERS } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { useRateLimit } from "../../hooks/useRateLimit";
import { getInitials } from "../../utils/profileHelpers";
import { generateUniqueUsername, formatUsername } from "../../utils/generateUsername";
import {
  getLectureById,
  getUserProgress,
  markSectionComplete,
  saveLectureProgress,
} from "../../services/lectureService";
import type { LectureDoc, UserLectureProgress } from "../../types/lecture";
import { isLectureComplete } from "../../types/lecture";
import SettingsMenu from "../../components/SettingsMenu/SettingsMenu";
import BgShapes from "../../components/BgShapes/BgShapes";
import "./LectureViewerPage.css";

const LectureViewerPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const { applyTheme } = useTheme();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthGuard();

  const [username, setUsername] = useState("User");
  const [lecture, setLecture] = useState<LectureDoc | null>(null);
  const [progress, setProgress] = useState<UserLectureProgress | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [marking, setMarking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMiniHeader, setShowMiniHeader] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const { canProceed, recordAttempt } = useRateLimit(5, 10_000);

  useEffect(() => {
    if (!user || !id) return;

    const load = async () => {
      try {
        // User data (non-critical)
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

        // Lecture data
        const lec = await getLectureById(id);

        if (!lec) {
          navigate("/lectures", { replace: true });
          return;
        }

        setLecture(lec);

        let progressList: import("../../types/lecture").UserLectureProgress[] = [];
        try {
          progressList = await getUserProgress(user.uid);
        } catch {
          // Progress may fail — continue without it
        }

        const match = progressList.find((p) => p.lectureId === id) ?? null;
        setProgress(match);

        // Resume at last section
        if (match?.lastSectionId) {
          const idx = lec.sections.findIndex((s) => s.id === match.lastSectionId);
          if (idx >= 0) setCurrentIdx(idx);
        }
      } catch (err) {
        console.warn("LectureViewerPage: load failed", err);
        setError(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, id, applyTheme, navigate]);

  // Sticky mini-header observer
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowMiniHeader(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [lecture]);

  // Focus TOC when opened on mobile
  useEffect(() => {
    if (tocOpen && tocRef.current) {
      tocRef.current.focus();
    }
  }, [tocOpen]);

  const section = lecture?.sections[currentIdx];
  const completedSections = useMemo(
    () => new Set(progress?.completedSections ?? []),
    [progress],
  );
  const isSectionDone = section ? completedSections.has(section.id) : false;
  const totalSections = lecture?.sections.length ?? 0;
  const completedCount = completedSections.size;
  const pct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const allDone = lecture ? isLectureComplete(progress ?? undefined, lecture) : false;

  const goToSection = useCallback(
    async (idx: number) => {
      if (!lecture || !user || !id) return;
      setCurrentIdx(idx);
      setTocOpen(false);
      try {
        await saveLectureProgress(user.uid, id, lecture.sections[idx].id);
      } catch {
        // silent
      }
    },
    [lecture, user, id],
  );

  const handleMarkSection = useCallback(async () => {
    if (!user || !id || !section || isSectionDone || marking || !canProceed) return;
    setMarking(true);
    recordAttempt();
    try {
      await markSectionComplete(user.uid, id, section.id);
      setProgress((prev) => {
        const existing = prev?.completedSections ?? [];
        return {
          lectureId: id,
          completedSections: [...existing, section.id],
          lastSectionId: section.id,
        };
      });
    } catch (err) {
      console.warn("Failed to mark section complete", err);
    } finally {
      setMarking(false);
    }
  }, [user, id, section, isSectionDone, marking, canProceed, recordAttempt]);

  const title = lecture ? lecture.title[lang] || lecture.title.en : "";
  const initials = useMemo(() => getInitials(username), [username]);

  if (authLoading || loading) {
    return (
      <div className="page-spinner-wrapper">
        <div className="page-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-spinner-wrapper">
        <div className="viewer-error">
          <p className="viewer-error-text">{error}</p>
          <button
            className="viewer-btn viewer-btn--primary"
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

  if (!lecture || !section) return null;

  const sectionTitle = section.title[lang] || section.title.en;
  const sectionContent = section.content[lang] || section.content.en;

  return (
    <div className="viewer-page">
      <BgShapes prefix="viewer" />

      {/* Sticky mini-header (mobile) */}
      <div
        className={`viewer-mini-header${showMiniHeader ? " viewer-mini-header--visible" : ""}`}
        aria-hidden={!showMiniHeader}
      >
        <span className="viewer-mini-header-text">
          {t.sectionProgress}: {currentIdx + 1}/{totalSections} — {pct}%
        </span>
        <div className="viewer-mini-header-bar">
          <div className="viewer-mini-header-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="viewer-layout">
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
            <button
              className="sidebar-btn sidebar-btn--active"
              onClick={() => navigate("/lectures")}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
              <span>{t.navLectures}</span>
            </button>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="viewer-main">
          {/* Header */}
          <div className="viewer-header" ref={headerRef}>
            <div className="viewer-header-left">
              <h1 className="viewer-title">{title}</h1>
              <span className="viewer-category">{lecture.category}</span>
            </div>
            <div className="viewer-progress-badge">
              <div className="viewer-progress-bar">
                <div
                  className="viewer-progress-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="viewer-progress-text" aria-live="polite">
                {completedCount}/{totalSections} ({pct}%)
              </span>
            </div>
          </div>

          {/* Table of contents toggle (mobile) */}
          <button
            className="viewer-toc-toggle"
            onClick={() => setTocOpen(!tocOpen)}
            type="button"
            aria-expanded={tocOpen}
            aria-controls="viewer-toc"
          >
            {t.tableOfContents} ({currentIdx + 1}/{totalSections})
            <svg
              aria-hidden="true"
              className={`viewer-toc-chevron${tocOpen ? " viewer-toc-chevron--open" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Table of contents */}
          {tocOpen && <div className="viewer-toc-overlay" onClick={() => setTocOpen(false)} />}
          <div
            id="viewer-toc"
            ref={tocRef}
            tabIndex={-1}
            className={`viewer-toc${tocOpen ? " viewer-toc--open" : ""}`}
          >
            <div className="viewer-toc-header">
              <h3 className="viewer-toc-title">{t.tableOfContents}</h3>
              <button
                className="viewer-toc-close"
                onClick={() => setTocOpen(false)}
                type="button"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ol className="viewer-toc-list">
              {lecture.sections.map((s, idx) => {
                const done = completedSections.has(s.id);
                const active = idx === currentIdx;
                return (
                  <li key={s.id}>
                    <button
                      className={`viewer-toc-item${active ? " viewer-toc-item--active" : ""}${done ? " viewer-toc-item--done" : ""}`}
                      onClick={() => goToSection(idx)}
                      type="button"
                    >
                      {done && <span className="viewer-toc-check">✓</span>}
                      <span>{s.title[lang] || s.title.en}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Section content */}
          {allDone && (
            <div className="viewer-congrats" aria-live="polite">
              <span className="viewer-congrats-icon" aria-hidden="true">🎉</span>
              <p className="viewer-congrats-text">{t.allSectionsComplete}</p>
            </div>
          )}

          <article className="viewer-article">
            <h2 className="viewer-section-title">{sectionTitle}</h2>
            <div className="viewer-markdown">
              <ReactMarkdown>{sectionContent}</ReactMarkdown>
            </div>
          </article>

          {/* Section navigation */}
          <div className="viewer-nav">
            <button
              className="viewer-btn viewer-btn--secondary"
              onClick={() => navigate("/lectures")}
              type="button"
              aria-label={t.backToLectures}
            >
              {t.backToLectures}
            </button>

            <div className="viewer-nav-center">
              <button
                className="viewer-btn viewer-btn--outline"
                onClick={() => goToSection(currentIdx - 1)}
                disabled={currentIdx === 0}
                type="button"
                aria-label={t.prevSection}
              >
                ← {t.prevSection}
              </button>

              <button
                className={`viewer-btn viewer-btn--primary${isSectionDone ? " viewer-btn--done" : ""}`}
                onClick={handleMarkSection}
                disabled={isSectionDone || marking || !canProceed}
                type="button"
                aria-label={t.markSectionComplete}
              >
                {isSectionDone ? `✓ ${t.read}` : marking ? t.loading : t.markSectionComplete}
              </button>

              <button
                className="viewer-btn viewer-btn--outline"
                onClick={() => goToSection(currentIdx + 1)}
                disabled={currentIdx >= totalSections - 1}
                type="button"
                aria-label={t.nextSection}
              >
                {t.nextSection} →
              </button>
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

export default LectureViewerPage;
