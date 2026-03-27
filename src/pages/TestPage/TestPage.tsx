import { useState, useEffect, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { QUESTIONS } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import type {
  Question,
  AnswerRecord,
  CategoryStats,
  TestCategory,
} from "../../types/test";
import { ALL_CATEGORIES } from "../../types/test";
import { selectQuestions } from "../../services/aiTestService";
import { getUserHistory, saveSession } from "../../services/testHistoryService";
import { findAnomalyCategory, swapNextQuestion } from "../../utils/adaptiveSwap";
import type { Language } from "../../translations";
import BgShapes from "../../components/BgShapes/BgShapes";
import "./TestPage.css";

/**
 * Compute the score (0-100) for an answer based on category type.
 * - Knowledge: binary — correct = 100, wrong = 0
 * - Attitudes / Behaviour / Confidence: Likert scale — option index * 25
 */
function computeAnswerScore(
  category: TestCategory,
  optionIndex: number,
  correctIndex?: number,
): number {
  if (category === "Knowledge") {
    return optionIndex === correctIndex ? 100 : 0;
  }
  // 5-option Likert scale: 0, 25, 50, 75, 100
  return optionIndex * 25;
}

type ViewState = "loading" | "intro" | "in-progress" | "completed";

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

const TestPage = () => {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthGuard();

  // View state
  const [view, setView] = useState<ViewState>("loading");

  // Question pool
  const [queue, setQueue] = useState<Question[]>([]);
  const [backup, setBackup] = useState<Question[]>([]);
  const [historyStats, setHistoryStats] = useState<Record<string, CategoryStats>>({});

  // In-progress state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date>(new Date());

  // Completed state
  const [, setCategoryResults] = useState<Record<string, CategoryStats>>({});
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ── Auth guard + data loading ──
  useEffect(() => {
    if (!user) return;

    const loadTest = async () => {
      try {
        // Fetch all questions from Firestore
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

        // Fetch user history
        const { categoryStats, seenQuestionIds } = await getUserHistory(
          user.uid,
          ALL_CATEGORIES,
        );
        setHistoryStats(categoryStats);

        // Call AI to select questions
        const { main, backup: bk } = await selectQuestions(
          allQuestions,
          categoryStats,
          seenQuestionIds,
          ALL_CATEGORIES,
        );

        setQueue(main);
        setBackup(bk);
        setView("intro");
      } catch (err) {
        console.error("Failed to load test:", err);
        setError(t.testNoQuestions);
        setView("intro");
      }
    };

    loadTest();
  }, [user, t.testNoQuestions]);

  // ── Start the test ──
  const handleStart = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setSwapCount(0);
    setSessionStartedAt(new Date());
    setView("in-progress");
  }, []);

  // ── Select an answer ──
  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      if (selectedOption !== null) return; // already answered
      const currentQ = queue[currentIndex];
      if (!currentQ) return;

      const score = computeAnswerScore(currentQ.category, optionIndex, currentQ.correctIndex);
      const record: AnswerRecord = {
        questionId: currentQ.id,
        category: currentQ.category,
        selectedOptionIndex: optionIndex,
        score,
      };

      const newAnswers = [...answers, record];
      setAnswers(newAnswers);
      setSelectedOption(optionIndex);

      // Adaptive swap check
      const anomalyCategory = findAnomalyCategory(newAnswers, historyStats, ALL_CATEGORIES);
      if (anomalyCategory) {
        const result = swapNextQuestion(queue, currentIndex, backup, anomalyCategory, swapCount);
        setQueue(result.newQueue);
        setBackup(result.newBackup);
        setSwapCount(result.swapCount);
      }
    },
    [selectedOption, queue, currentIndex, answers, historyStats, backup, swapCount],
  );

  // ── Advance to next question or finish ──
  const handleNext = useCallback(() => {
    setSelectedOption(null);
    if (currentIndex + 1 >= queue.length) {
      // Compute results
      const catRes: Record<string, CategoryStats> = {};
      for (const cat of ALL_CATEGORIES) {
        catRes[cat] = { total: 0, totalScore: 0, percentage: 0 };
      }
      for (const a of answers) {
        const s = catRes[a.category];
        if (!s) continue;
        s.total++;
        s.totalScore += a.score;
      }
      for (const cat of ALL_CATEGORIES) {
        const s = catRes[cat];
        s.percentage = s.total > 0 ? Math.round(s.totalScore / s.total) : 0;
      }
      const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
      const overall = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;

      setCategoryResults(catRes);
      setOverallPercentage(overall);

      // Save to Firestore
      if (user) {
        setSaving(true);
        saveSession(user.uid, {
          userId: user.uid,
          startedAt: sessionStartedAt,
          completedAt: new Date(),
          answers,
          categoryResults: catRes,
          overallPercentage: overall,
        })
          .catch(() => setSaveError(t.testSaveError))
          .finally(() => setSaving(false));
      }

      setView("completed");
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, queue.length, answers, user, sessionStartedAt, t]);

  // ── Retake ──
  const handleRetake = useCallback(() => {
    setView("loading");
    // Re-trigger the full flow
    window.location.reload();
  }, []);

  // ── Render ──

  if (authLoading || view === "loading") {
    return (
      <div className="test-page">
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

          {error ? (
            <p className="test-error">{error}</p>
          ) : (
            <button className="test-btn test-btn--start" onClick={handleStart} disabled={queue.length === 0}>
              {t.startTest}
            </button>
          )}

          <button className="test-btn test-btn--back" onClick={() => navigate("/profile")}>
            {t.backToProfile}
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
        <BgShapes prefix="test" count={2} />

        <div className="test-quiz">
          {/* Progress */}
          <div className="test-progress-header">
            <span className="test-progress-text">{progress}</span>
            <span className="test-category-badge test-category-badge--small">
              {getCategoryLabel(currentQ.category, t as unknown as Record<string, string>)}
            </span>
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
                if (selectedOption !== null && !isSelected) className += " test-option--disabled";

                return (
                  <button
                    key={idx}
                    className={className}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={selectedOption !== null}
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
          {selectedOption !== null && (
            <button className="test-btn test-btn--next" onClick={handleNext}>
              {isLastQuestion ? t.finishTest : t.nextQuestion}
            </button>
          )}
        </div>
      </div>
    );
  }

  // view === "completed"
  return (
    <div className="test-page">
      <BgShapes prefix="test" count={2} />

      <div className="test-results">
        <h1 className="test-title">{t.testResults}</h1>

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

        {saving && <p className="test-saving">{t.loading}</p>}
        {saveError && <p className="test-error">{saveError}</p>}

        <div className="test-result-actions">
          <button className="test-btn test-btn--start" onClick={handleRetake}>
            {t.retakeTest}
          </button>
          <button className="test-btn test-btn--back" onClick={() => navigate("/profile")}>
            {t.backToProfile}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
