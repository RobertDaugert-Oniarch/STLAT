import type { Question, CategoryStats, TestCategory, AIQuestionPlan } from "../types/test";
import { auth } from "../firebase/config";

const SELECT_QUESTIONS_URL = import.meta.env.VITE_SELECT_QUESTIONS_URL as string | undefined;
const BACKUP_QUESTIONS = 10;
const MIN_QUESTIONS_FOR_AI = 30;
const MIN_PER_CATEGORY = 5;

function fallbackSelection(
  allQuestions: Question[],
  categories: readonly TestCategory[],
): { main: Question[]; backup: Question[] } {
  const byCategory: Record<string, Question[]> = {};
  for (const cat of categories) byCategory[cat] = [];
  for (const q of allQuestions) {
    if (byCategory[q.category]) byCategory[q.category].push(q);
  }

  // Shuffle each category
  for (const cat of categories) {
    byCategory[cat].sort(() => Math.random() - 0.5);
  }

  const main: Question[] = [];
  const backup: Question[] = [];
  const usedIds = new Set<string>();

  // Pick main per category (or fewer if not enough)
  for (const cat of categories) {
    const pool = byCategory[cat];
    const take = Math.min(MIN_PER_CATEGORY, pool.length);
    for (let i = 0; i < take; i++) {
      main.push(pool[i]);
      usedIds.add(pool[i].id);
    }
  }

  // Pick backup from remaining
  for (const cat of categories) {
    const pool = byCategory[cat].filter((q) => !usedIds.has(q.id));
    const take = Math.min(3, pool.length);
    for (let i = 0; i < take; i++) {
      backup.push(pool[i]);
    }
  }

  return { main: main.sort(() => Math.random() - 0.5), backup };
}

export async function selectQuestions(
  allQuestions: Question[],
  categoryHistory: Record<string, CategoryStats>,
  seenQuestionIds: string[],
  categories: readonly TestCategory[],
): Promise<{ main: Question[]; backup: Question[] }> {
  // Build lookup
  const questionMap = new Map<string, Question>();
  for (const q of allQuestions) questionMap.set(q.id, q);

  // Build category performance (0–100)
  const categoryPerformance: Record<string, number> = {};
  const availableByCategory: Record<string, string[]> = {};

  for (const cat of categories) {
    categoryPerformance[cat] = categoryHistory[cat]?.percentage ?? 50;
    availableByCategory[cat] = [];
  }
  for (const q of allQuestions) {
    if (availableByCategory[q.category]) {
      availableByCategory[q.category].push(q.id);
    }
  }

  // If total available < minimum threshold, skip AI and use fallback
  if (allQuestions.length < MIN_QUESTIONS_FOR_AI || !SELECT_QUESTIONS_URL) {
    return fallbackSelection(allQuestions, categories);
  }

  try {
    const user = auth.currentUser;
    if (!user) return fallbackSelection(allQuestions, categories);

    const idToken = await user.getIdToken();
    const response = await fetch(SELECT_QUESTIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        categoryPerformance,
        availableByCategory,
        seenIds: seenQuestionIds,
      }),
    });

    if (!response.ok) {
      console.warn("AI test service: API error", response.status);
      return fallbackSelection(allQuestions, categories);
    }

    const plan: AIQuestionPlan = await response.json();

    // Validate and map IDs to questions
    const mainQuestions = plan.mainIds
      ?.map((id: string) => questionMap.get(id))
      .filter((q): q is Question => q !== undefined)
      ?? [];

    const backupQuestions = plan.backupIds
      ?.map((id: string) => questionMap.get(id))
      .filter((q): q is Question => q !== undefined)
      ?? [];

    // If AI returned too few, fill with fallback
    if (mainQuestions.length < BACKUP_QUESTIONS) {
      console.warn("AI returned too few questions, using fallback");
      return fallbackSelection(allQuestions, categories);
    }

    return { main: mainQuestions, backup: backupQuestions };
  } catch (err) {
    console.warn("AI test service error, using fallback:", err);
    return fallbackSelection(allQuestions, categories);
  }
}
