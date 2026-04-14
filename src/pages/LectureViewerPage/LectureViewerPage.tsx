import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
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
  const { t } = useLang();
  const { applyTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/admin/lectures/preview");
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
        if (!isPreview) {
          try {
            progressList = await getUserProgress(user.uid);
          } catch {
            // Progress may fail — continue without it
          }
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

      // Auto-mark current section as read when navigating away
      if (!isPreview) {
        const currentSection = lecture.sections[currentIdx];
        const alreadyDone = progress?.completedSections?.includes(currentSection.id);
        if (currentSection && !alreadyDone) {
          try {
            await markSectionComplete(user.uid, id, currentSection.id);
            setProgress((prev) => {
              const existing = prev?.completedSections ?? [];
              return {
                lectureId: id,
                completedSections: [...existing, currentSection.id],
                lastSectionId: currentSection.id,
              };
            });
          } catch {
            // silent
          }
        }
      }

      setCurrentIdx(idx);
      setTocOpen(false);
      if (!isPreview) {
        try {
          await saveLectureProgress(user.uid, id, lecture.sections[idx].id);
        } catch {
          // silent
        }
      }
    },
    [lecture, user, id, isPreview, currentIdx, progress],
  );

  const handleMarkSection = useCallback(async () => {
    if (!user || !id || !section || isSectionDone || marking || !canProceed || isPreview) return;
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

  const title = lecture ? lecture.title : "";
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

  const sectionTitle = section.title;
  const sectionContent = section.content;

  return (
    <div className={`viewer-page${isPreview ? " viewer-page--preview" : ""}`}>
      <BgShapes prefix="viewer" />

      {/* Preview banner */}
      {isPreview && (
        <div className="viewer-preview-banner">
          {t.previewMode}
          <button className="viewer-preview-back" onClick={() => navigate("/admin/lectures")}>
            ← {t.backToEditor}
          </button>
        </div>
      )}

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
        {/* ── Left panel: nav + TOC + progress ── */}
        <aside className="viewer-left-panel">
          <div className="viewer-sidebar-toc">
            <Link to="/profile" className="sidebar-logo-link">
              <span className="sidebar-logo">STLAT</span>
            </Link>
            <div className="sidebar-divider" />
            <h3 className="viewer-toc-title">{t.tableOfContents}</h3>
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
                      <span>{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="viewer-sidebar-nav-btns">
            <button
              className="viewer-sidebar-nav-btn"
              onClick={() => goToSection(currentIdx - 1)}
              disabled={currentIdx === 0}
              type="button"
              aria-label={t.prevSection}
            >
              ← {t.prevSection}
            </button>
            <button
              className="viewer-sidebar-nav-btn"
              onClick={() => goToSection(currentIdx + 1)}
              disabled={currentIdx >= totalSections - 1}
              type="button"
              aria-label={t.nextSection}
            >
              {t.nextSection} →
            </button>
          </div>

          <div className="viewer-sidebar-progress">
            <div className="viewer-progress-bar">
              <div className="viewer-progress-fill" style={{ width: `${Math.round(((currentIdx + 1) / totalSections) * 100)}%` }} />
            </div>
            <span className="viewer-progress-text">
              {currentIdx + 1}/{totalSections} ({Math.round(((currentIdx + 1) / totalSections) * 100)}%)
            </span>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="viewer-main">
          {/* Header */}
          <div className="viewer-header" ref={headerRef}>
            <div className="viewer-header-left">
              <h1 className="viewer-title">{title}</h1>
              <span className="viewer-category">{lecture.category}</span>
            </div>
            {!isPreview && (
              <div className="viewer-header-right">
                <div className="profile-topbar-user">
                  <div className="profile-avatar">{initials}</div>
                  <span className="profile-username">{username}</span>
                </div>
                <SettingsMenu />
              </div>
            )}
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
              onClick={() => navigate(isPreview ? "/admin/lectures" : "/lectures")}
              type="button"
              aria-label={isPreview ? t.backToEditor : t.backToLectures}
            >
              {isPreview ? t.backToEditor : t.backToLectures}
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

              {!isPreview && (
                <button
                  className={`viewer-btn viewer-btn--primary${isSectionDone ? " viewer-btn--done" : ""}`}
                  onClick={handleMarkSection}
                  disabled={isSectionDone || marking || !canProceed}
                  type="button"
                  aria-label={t.markSectionComplete}
                >
                  {isSectionDone ? `✓ ${t.read}` : marking ? t.loading : t.markSectionComplete}
                </button>
              )}

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


      </div>
    </div>
  );
};

export default LectureViewerPage;
