import { useState, useCallback, useEffect } from "react";
import { signInAnonymously } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { QUESTIONS } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import type {
  Question,
  AnswerRecord,
  CategoryStats,
  TestCategory,
} from "../../types/test";
import { ALL_CATEGORIES } from "../../types/test";
import type { GuestDemographics } from "../../types/user";
import { selectQuestions } from "../../services/aiTestService";
import { saveGuestSession, saveDemographics } from "../../services/guestService";
import { findAnomalyCategory, swapNextQuestion } from "../../utils/adaptiveSwap";
import type { Language } from "../../translations";
import BgShapes from "../../components/BgShapes/BgShapes";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import LangToggle from "../../components/LangToggle/LangToggle";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import DemographicsForm from "../../components/DemographicsForm/DemographicsForm";
import "./GuestTestPage.css";

function computeAnswerScore(
  category: TestCategory,
  optionIndex: number,
  correctIndex?: number,
): number {
  if (category === "Knowledge") {
    return optionIndex === correctIndex ? 100 : 0;
  }
  return optionIndex * 25;
}

type ViewState = "loading" | "intro" | "in-progress" | "demographics" | "completed";

const CATEGORY_TRANSLATION_KEYS: Record<TestCategory, string> = {
  Knowledge: "categoryKnowledge",
  Attitudes: "categoryAttitudes",
  Behaviour: "categoryBehaviour",
  "Confidence in One's Judgement": "categoryConfidence",
};

function getCategoryLabel(cat: TestCategory, t: Record<string, string>): string {
  const key = CATEGORY_TRANSLATION_KEYS[cat];
  return (t as Record<string, string>)[key] ?? cat;
}

const GuestTestPage = () => {
  const { t, lang } = useLang();
  const navigate = useNavigate();

  // Anonymous user UID
  const [uid, setUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // View state
  const [view, setView] = useState<ViewState>("intro");

  // Question pool
  const [queue, setQueue] = useState<Question[]>([]);
  const [backup, setBackup] = useState<Question[]>([]);

  // In-progress state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date>(new Date());

  // Completed state
  const [categoryResults, setCategoryResults] = useState<Record<string, CategoryStats>>({});
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Exit confirmation
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Demographics saving
  const [demoSaving, setDemoSaving] = useState(false);

  // Sign in anonymously on mount
  useEffect(() => {
    let cancelled = false;
    signInAnonymously(auth)
      .then((cred) => {
        if (!cancelled) {
          setUid(cred.user.uid);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t.unexpectedError);
          setAuthLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [t.unexpectedError]);

  // Clean up anonymous session on unmount
  useEffect(() => {
    return () => {
      if (auth.currentUser?.isAnonymous) {
        auth.signOut();
      }
    };
  }, []);

  const handleExit = useCallback(async () => {
    if (auth.currentUser?.isAnonymous) {
      await auth.signOut();
    }
    navigate("/login");
  }, [navigate]);

  // ── Start the test ──
  const handleStart = useCallback(async () => {
    if (!uid) return;
    setError(null);
    setView("loading");

    try {
      const qSnap = await getDocs(collection(db, QUESTIONS));
      const allQuestions: Question[] = [];
      qSnap.forEach((docSnap) => {
        const data = docSnap.data();
        allQuestions.push({ id: docSnap.id, ...data } as Question);
      });

      if (allQuestions.length === 0) {
        setError(t.testNoQuestions);
        setView("intro");
        return;
      }

      // Guest has no history — pass empty stats
      const emptyStats: Record<string, CategoryStats> = {};
      for (const cat of ALL_CATEGORIES) {
        emptyStats[cat] = { total: 0, totalScore: 0, percentage: 0 };
      }

      const { main, backup: bk } = await selectQuestions(
        allQuestions,
        emptyStats,
        [],
        ALL_CATEGORIES,
      );

      setQueue(main);
      setBackup(bk);
      setCurrentIndex(0);
      setAnswers([]);
      setSelectedOption(null);
      setSwapCount(0);
      setSessionStartedAt(new Date());
      setView("in-progress");
    } catch (err) {
      console.error("Failed to load test:", err);
      setError(t.testNoQuestions);
      setView("intro");
    }
  }, [uid, t.testNoQuestions]);

  // ── Select an answer ──
  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      const currentQ = queue[currentIndex];
      if (!currentQ) return;
      setSelectedOption(optionIndex);
    },
    [queue, currentIndex],
  );

  // ── Advance to next question or finish ──
  const handleNext = useCallback(() => {
    const currentQ = queue[currentIndex];
    if (currentQ && selectedOption !== null) {
      const score = computeAnswerScore(currentQ.category, selectedOption, currentQ.correctIndex);
      const record: AnswerRecord = {
        questionId: currentQ.id,
        category: currentQ.category,
        selectedOptionIndex: selectedOption,
        score,
      };
      const newAnswers = [...answers, record];
      setAnswers(newAnswers);

      // Adaptive swap check (uses empty history for guests)
      const emptyStats: Record<string, CategoryStats> = {};
      for (const cat of ALL_CATEGORIES) {
        emptyStats[cat] = { total: 0, totalScore: 0, percentage: 0 };
      }

      const anomalyCategory = findAnomalyCategory(newAnswers, emptyStats, ALL_CATEGORIES);
      if (anomalyCategory) {
        const result = swapNextQuestion(queue, currentIndex, backup, anomalyCategory, swapCount);
        setQueue(result.newQueue);
        setBackup(result.newBackup);
        setSwapCount(result.swapCount);
      }

      // Check if this was the last question
      if (currentIndex + 1 >= queue.length) {
        // Compute results
        const catRes: Record<string, CategoryStats> = {};
        for (const cat of ALL_CATEGORIES) {
          catRes[cat] = { total: 0, totalScore: 0, percentage: 0 };
        }
        for (const a of newAnswers) {
          const s = catRes[a.category];
          if (!s) continue;
          s.total++;
          s.totalScore += a.score;
        }
        for (const cat of ALL_CATEGORIES) {
          const s = catRes[cat];
          s.percentage = s.total > 0 ? Math.round(s.totalScore / s.total) : 0;
        }
        const totalScore = newAnswers.reduce((sum, a) => sum + a.score, 0);
        const overall = newAnswers.length > 0 ? Math.round(totalScore / newAnswers.length) : 0;

        setCategoryResults(catRes);
        setOverallPercentage(overall);

        // Save to Firestore
        if (uid) {
          setSaving(true);
          saveGuestSession(uid, {
            userId: uid,
            startedAt: sessionStartedAt,
            completedAt: new Date(),
            answers: newAnswers,
            categoryResults: catRes,
            overallPercentage: overall,
            isAnonymous: true,
          })
            .catch(() => setSaveError(t.testSaveError))
            .finally(() => setSaving(false));
        }

        setView("demographics");
        return;
      }
    }

    setSelectedOption(null);
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, queue, selectedOption, answers, backup, swapCount, uid, sessionStartedAt, t]);

  // ── Demographics handlers ──
  const handleDemographicsSubmit = useCallback(async (demographics: GuestDemographics) => {
    if (!uid) return;
    setDemoSaving(true);
    try {
      await saveDemographics(uid, demographics);
    } catch {
      // Demographics are optional — don't block the flow
    } finally {
      setDemoSaving(false);
      setView("completed");
    }
  }, [uid]);

  const handleDemographicsSkip = useCallback(() => {
    setView("completed");
  }, []);

  // ── Render ──

  if (authLoading || view === "loading") {
    return (
      <div className="test-page">
        <ThemeToggle />
        <LangToggle />
        <div className="test-loading">
          <div className="test-spinner" />
          <p>{t.testLoadingAI}</p>
        </div>
      </div>
    );
  }

  if (view === "intro") {
    return (
      <div className="test-page">
        <ThemeToggle />
        <LangToggle />
        <BgShapes prefix="test" count={2} />

        <div className="test-intro">
          <h1 className="test-title">{t.testTitle}</h1>
          <p className="test-subtitle">{t.testSubtitle}</p>
          <p className="test-instructions">{t.testInstructions}</p>

          <div className="test-categories">
            {ALL_CATEGORIES.map((cat) => (
              <span className="test-category-badge" key={cat}>
                {getCategoryLabel(cat, t as unknown as Record<string, string>)}
              </span>
            ))}
          </div>

          <p className="test-estimate">{t.testEstimate}</p>

          {error && <p className="test-error">{error}</p>}

          <button className="test-btn test-btn--start" onClick={handleStart}>
            {t.startTest}
          </button>

          <button className="test-btn test-btn--back" onClick={handleExit}>
            {t.backToLoginGuest}
          </button>
        </div>
      </div>
    );
  }

  if (view === "in-progress") {
    const currentQ = queue[currentIndex];
    if (!currentQ) return null;

    const questionText = currentQ.text[lang as Language] ?? currentQ.text.en;
    const progress = t.questionProgress
      .replace("{n}", String(currentIndex + 1))
      .replace("{total}", String(queue.length));
    const progressPercent = ((currentIndex + 1) / queue.length) * 100;
    const isLastQuestion = currentIndex + 1 >= queue.length;

    return (
      <div className="test-page">
        <ThemeToggle />
        <LangToggle />
        <BgShapes prefix="test" count={2} />

        {showExitConfirm && (
          <ConfirmModal
            title={t.exitTestTitle}
            message={t.exitTestMessage}
            confirmLabel={t.exitTest}
            cancelLabel={t.cancel}
            variant="danger"
            onConfirm={handleExit}
            onCancel={() => setShowExitConfirm(false)}
          />
        )}

        <div className="test-quiz">
          {/* Progress */}
          <div className="test-progress-header">
            <span className="test-progress-text">{progress}</span>
            <div className="test-progress-right">
              <span className="test-category-badge test-category-badge--small">
                {getCategoryLabel(currentQ.category, t as unknown as Record<string, string>)}
              </span>
              <button
                className="test-btn--exit"
                onClick={() => setShowExitConfirm(true)}
                aria-label={t.exitTest}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="test-progress-bar">
            <div className="test-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Question card */}
          <div className="test-question-card">
            <h2 className="test-question-text">{questionText}</h2>

            <div className="test-options">
              {currentQ.options.map((opt, idx) => {
                const optText = opt[lang as Language] ?? opt.en;
                const isSelected = selectedOption === idx;
                let className = "test-option";
                if (isSelected) className += " test-option--selected";

                return (
                  <button
                    key={idx}
                    className={className}
                    onClick={() => handleOptionSelect(idx)}
                  >
                    <span className="test-option-letter">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="test-option-text">{optText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next / Finish button */}
          <button
            className={`test-btn test-btn--next${selectedOption === null ? " test-btn--next-hidden" : ""}`}
            onClick={handleNext}
            disabled={selectedOption === null}
          >
            {isLastQuestion ? t.finishTest : t.nextQuestion}
          </button>
        </div>
      </div>
    );
  }

  if (view === "demographics") {
    return (
      <div className="test-page">
        <ThemeToggle />
        <LangToggle />
        <BgShapes prefix="test" count={2} />

        <DemographicsForm
          onSubmit={handleDemographicsSubmit}
          onSkip={handleDemographicsSkip}
          loading={demoSaving}
        />
      </div>
    );
  }

  // view === "completed"
  return (
    <div className="test-page">
      <ThemeToggle />
      <LangToggle />
      <BgShapes prefix="test" count={2} />

      <div className="test-results">
        <h1 className="test-title">{t.thankYouGuest}</h1>
        <p className="test-subtitle">{t.thankYouGuestSub}</p>

        {/* Overall score */}
        <div className="test-overall">
          <span className="test-overall-label">{t.overallScore}</span>
          <div className="test-overall-ring">
            <svg viewBox="0 0 120 120" className="test-ring-svg">
              <circle cx="60" cy="60" r="52" className="test-ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="52"
                className="test-ring-fill"
                strokeDasharray={`${(overallPercentage / 100) * 327} 327`}
                strokeDashoffset="0"
              />
            </svg>
            <span className="test-overall-percent">{overallPercentage}%</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="test-category-results">
          {ALL_CATEGORIES.map((cat) => {
            const stat = categoryResults[cat];
            if (!stat) return null;
            return (
              <div className="test-cat-row" key={cat}>
                <span className="test-cat-name">
                  {getCategoryLabel(cat, t as unknown as Record<string, string>)}
                </span>
                <div className="test-cat-bar-wrap">
                  <div className="test-cat-bar">
                    <div
                      className="test-cat-bar-fill"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <span className="test-cat-pct">{stat.percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {saving && <p className="test-saving">{t.loading}</p>}
        {saveError && <p className="test-error">{saveError}</p>}

        <div className="test-result-actions">
          <button className="test-btn test-btn--start" onClick={handleExit}>
            {t.backToLoginGuest}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestTestPage;
