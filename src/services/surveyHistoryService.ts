import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type {
  AnswerRecord,
  CategoryStats,
  SessionResult,
  SurveyCategory,
} from "../types/survey";

/** Aggregate per-category stats from all past session answer records. */
function aggregateHistory(
  allAnswers: AnswerRecord[],
  categories: readonly SurveyCategory[],
): Record<string, CategoryStats> {
  const stats: Record<string, CategoryStats> = {};
  for (const cat of categories) {
    stats[cat] = { total: 0, totalScore: 0, percentage: 0 };
  }

  for (const a of allAnswers) {
    const s = stats[a.category];
    if (!s) continue;
    s.total++;
    s.totalScore += a.score;
  }

  for (const cat of categories) {
    const s = stats[cat];
    s.percentage = s.total > 0 ? Math.round(s.totalScore / s.total) : 0;
  }

  return stats;
}

/** Fetch all past sessions for a user and return aggregated category stats. */
export async function getUserHistory(
  uid: string,
  categories: readonly SurveyCategory[],
): Promise<{
  categoryStats: Record<string, CategoryStats>;
  seenQuestionIds: string[];
}> {
  const sessionsRef = collection(db, "surveyHistory", uid, "sessions");
  const snap = await getDocs(sessionsRef);

  const allAnswers: AnswerRecord[] = [];
  const seenIds = new Set<string>();

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const answers = (data.answers ?? []) as AnswerRecord[];
    for (const a of answers) {
      allAnswers.push(a);
      seenIds.add(a.questionId);
    }
  });

  return {
    categoryStats: aggregateHistory(allAnswers, categories),
    seenQuestionIds: Array.from(seenIds),
  };
}

/** Save a completed survey session and update the latest result summary. */
export async function saveSession(
  uid: string,
  session: SessionResult,
): Promise<void> {
  // Save full session to history sub-collection
  const sessionsRef = collection(db, "surveyHistory", uid, "sessions");
  await addDoc(sessionsRef, {
    startedAt: Timestamp.fromDate(session.startedAt),
    completedAt: Timestamp.fromDate(session.completedAt),
    answers: session.answers,
    categoryResults: session.categoryResults,
    overallPercentage: session.overallPercentage,
  });

  // Update latest summary for ProfilePage
  const quizResultRef = doc(db, "quizResults", uid);
  await setDoc(
    quizResultRef,
    {
      quizName: "STLAT Survey",
      score: session.overallPercentage,
      total: 100,
      percentage: session.overallPercentage,
      categoryResults: session.categoryResults,
      completedAt: Timestamp.fromDate(session.completedAt),
    },
    { merge: true },
  );
}
