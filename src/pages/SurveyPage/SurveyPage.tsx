import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useLang } from "../../context/LangContext";
import type {
  Question,
  AnswerRecord,
  CategoryStats,
  SurveyCategory,
} from "../../types/survey";
import { ALL_CATEGORIES } from "../../types/survey";
import { selectQuestions } from "../../services/aiSurveyService";
import { getUserHistory, saveSession } from "../../services/surveyHistoryService";
import { findAnomalyCategory, swapNextQuestion } from "../../utils/adaptiveSwap";
import type { Language } from "../../translations";
import type { SurveyCategory as SurveyCategoryType } from "../../types/survey";
import "./SurveyPage.css";

/**
 * Compute the score (0-100) for an answer based on category type.
 * - Knowledge: binary — correct = 100, wrong = 0
 * - Attitudes / Behaviour / Confidence: Likert scale — option index * 25
 */
function computeAnswerScore(
  category: SurveyCategoryType,
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

const CATEGORY_TRANSLATION_KEYS: Record<SurveyCategory, string> = {
  Knowledge: "categoryKnowledge",
  Attitudes: "categoryAttitudes",
  Behaviour: "categoryBehaviour",
  "Confidence in One's Judgement": "categoryConfidence",
};

function getCategoryLabel(cat: SurveyCategory, t: Record<string, string>): string {
  const key = CATEGORY_TRANSLATION_KEYS[cat];
  return (t as Record<string, string>)[key] ?? cat;
}

const SurveyPage = () => {
  const { t, lang } = useLang();
  const navigate = useNavigate();

  // Auth
  const [uid, setUid] = useState<string | null>(null);

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

  // Error
  const [error, setError] = useState<string | null>(null);

  // ── Auth guard + data loading ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setUid(user.uid);

      try {
        // Fetch all questions from Firestore
        const qSnap = await getDocs(collection(db, "questions"));
        const allQuestions: Question[] = [];
        qSnap.forEach((docSnap) => {
          const data = docSnap.data();
          allQuestions.push({ id: docSnap.id, ...data } as Question);
        });

        if (allQuestions.length === 0) {
          setError(t.surveyNoQuestions);
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
        console.error("Failed to load survey:", err);
        setError(t.surveyNoQuestions);
        setView("intro");
      }
    });
    return () => unsub();
  }, [navigate, t.surveyNoQuestions]);

  // ── Start the survey ──
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
      if (uid) {
        setSaving(true);
        saveSession(uid, {
          userId: uid,
          startedAt: sessionStartedAt,
          completedAt: new Date(),
          answers,
          categoryResults: catRes,
          overallPercentage: overall,
        })
          .catch((err) => console.error("Failed to save session:", err))
          .finally(() => setSaving(false));
      }

      setView("completed");
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, queue.length, answers, uid, sessionStartedAt]);

  // ── Retake ──
  const handleRetake = useCallback(() => {
    setView("loading");
    // Re-trigger the full flow
    window.location.reload();
  }, []);

  // ── Render ──

  if (view === "loading") {
    return (
      <div className="survey-page">
        <div className="survey-loading">
          <div className="survey-spinner" />
          <p>{t.surveyLoadingAI}</p>
        </div>
      </div>
    );
  }

  if (view === "intro") {
    return (
      <div className="survey-page">
        <div className="survey-bg-shape survey-bg-shape--1" />
        <div className="survey-bg-shape survey-bg-shape--2" />

        <div className="survey-intro">
          <h1 className="survey-title">{t.surveyTitle}</h1>
          <p className="survey-subtitle">{t.surveySubtitle}</p>
          <p className="survey-instructions">{t.surveyInstructions}</p>

          <div className="survey-categories">
            {ALL_CATEGORIES.map((cat) => (
              <span className="survey-category-badge" key={cat}>
                {getCategoryLabel(cat, t as unknown as Record<string, string>)}
              </span>
            ))}
          </div>

          <p className="survey-estimate">{t.surveyEstimate}</p>

          {error ? (
            <p className="survey-error">{error}</p>
          ) : (
            <button className="survey-btn survey-btn--start" onClick={handleStart} disabled={queue.length === 0}>
              {t.startSurvey}
            </button>
          )}

          <button className="survey-btn survey-btn--back" onClick={() => navigate("/profile")}>
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
      <div className="survey-page">
        <div className="survey-bg-shape survey-bg-shape--1" />
        <div className="survey-bg-shape survey-bg-shape--2" />

        <div className="survey-quiz">
          {/* Progress */}
          <div className="survey-progress-header">
            <span className="survey-progress-text">{progress}</span>
            <span className="survey-category-badge survey-category-badge--small">
              {getCategoryLabel(currentQ.category, t as unknown as Record<string, string>)}
            </span>
          </div>
          <div className="survey-progress-bar">
            <div className="survey-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Question card */}
          <div className="survey-question-card">
            <h2 className="survey-question-text">{questionText}</h2>

            <div className="survey-options">
              {currentQ.options.map((opt, idx) => {
                const optText = opt[lang as Language] ?? opt.en;
                const isSelected = selectedOption === idx;
                let className = "survey-option";
                if (isSelected) className += " survey-option--selected";
                if (selectedOption !== null && !isSelected) className += " survey-option--disabled";

                return (
                  <button
                    key={idx}
                    className={className}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={selectedOption !== null}
                  >
                    <span className="survey-option-letter">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="survey-option-text">{optText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next / Finish button */}
          {selectedOption !== null && (
            <button className="survey-btn survey-btn--next" onClick={handleNext}>
              {isLastQuestion ? t.finishSurvey : t.nextQuestion}
            </button>
          )}
        </div>
      </div>
    );
  }

  // view === "completed"
  return (
    <div className="survey-page">
      <div className="survey-bg-shape survey-bg-shape--1" />
      <div className="survey-bg-shape survey-bg-shape--2" />

      <div className="survey-results">
        <h1 className="survey-title">{t.surveyResults}</h1>

        {/* Overall score */}
        <div className="survey-overall">
          <span className="survey-overall-label">{t.overallScore}</span>
          <div className="survey-overall-ring">
            <svg viewBox="0 0 120 120" className="survey-ring-svg">
              <circle cx="60" cy="60" r="52" className="survey-ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="52"
                className="survey-ring-fill"
                strokeDasharray={`${(overallPercentage / 100) * 327} 327`}
                strokeDashoffset="0"
              />
            </svg>
            <span className="survey-overall-percent">{overallPercentage}%</span>
          </div>
        </div>

        {saving && <p className="survey-saving">{t.loading}</p>}

        <div className="survey-result-actions">
          <button className="survey-btn survey-btn--start" onClick={handleRetake}>
            {t.retakeSurvey}
          </button>
          <button className="survey-btn survey-btn--back" onClick={() => navigate("/profile")}>
            {t.backToProfile}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;
