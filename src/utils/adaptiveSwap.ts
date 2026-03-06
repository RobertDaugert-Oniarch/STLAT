import type { Question, AnswerRecord, CategoryStats, SurveyCategory } from "../types/survey";

const DEVIATION_THRESHOLD = 40;
const MAX_SWAPS_PER_SESSION = 5;
const MIN_ANSWERS_FOR_ANOMALY = 3;

/** Compute current session average score (0-100) for a specific category. */
function computeCurrentScore(answers: AnswerRecord[], category: SurveyCategory): number | null {
  const catAnswers = answers.filter((a) => a.category === category);
  if (catAnswers.length < MIN_ANSWERS_FOR_ANOMALY) return null;
  const avg = catAnswers.reduce((sum, a) => sum + a.score, 0) / catAnswers.length;
  return Math.round(avg);
}

/** Check if a category shows an anomalous performance shift. */
function detectAnomaly(
  expectedPercentage: number,
  currentPercentage: number | null,
): boolean {
  if (currentPercentage === null) return false;
  return Math.abs(currentPercentage - expectedPercentage) >= DEVIATION_THRESHOLD;
}

/**
 * Find which category (if any) is showing anomalous behaviour after a new answer.
 * Returns the shifted category, or null if everything is within expected bounds.
 */
export function findAnomalyCategory(
  answers: AnswerRecord[],
  historyStats: Record<string, CategoryStats>,
  categories: readonly SurveyCategory[],
): SurveyCategory | null {
  for (const cat of categories) {
    const expected = historyStats[cat]?.percentage ?? 50;
    const current = computeCurrentScore(answers, cat);
    if (detectAnomaly(expected, current)) {
      return cat;
    }
  }
  return null;
}

/**
 * Attempt to swap a queued question with a backup from the shifted category.
 *
 * Returns a new queue/backup/swapCount (immutable — does not mutate inputs).
 * Returns unchanged values if no swap is possible.
 */
export function swapNextQuestion(
  queue: Question[],
  currentIndex: number,
  backup: Question[],
  shiftedCategory: SurveyCategory,
  swapCount: number,
): {
  newQueue: Question[];
  newBackup: Question[];
  swapCount: number;
} {
  if (swapCount >= MAX_SWAPS_PER_SESSION) {
    return { newQueue: queue, newBackup: backup, swapCount };
  }

  // Find a backup question from the shifted category
  const backupIdx = backup.findIndex((q) => q.category === shiftedCategory);
  if (backupIdx === -1) {
    return { newQueue: queue, newBackup: backup, swapCount };
  }

  // Find the next upcoming question (after currentIndex) that is NOT from the shifted category
  const remaining = queue.slice(currentIndex + 1);
  const replaceRelIdx = remaining.findIndex((q) => q.category !== shiftedCategory);
  if (replaceRelIdx === -1) {
    return { newQueue: queue, newBackup: backup, swapCount };
  }
  const replaceAbsIdx = currentIndex + 1 + replaceRelIdx;

  // Perform swap
  const newQueue = [...queue];
  newQueue[replaceAbsIdx] = backup[backupIdx];

  const newBackup = [...backup];
  newBackup.splice(backupIdx, 1);

  return { newQueue, newBackup, swapCount: swapCount + 1 };
}
