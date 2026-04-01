export type TestCategory =
  | "Knowledge"
  | "Attitudes"
  | "Behaviour"
  | "Confidence in One's Judgement";

export const ALL_CATEGORIES: TestCategory[] = [
  "Knowledge",
  "Attitudes",
  "Behaviour",
  "Confidence in One's Judgement",
];

export interface LocalizedText {
  en: string;
  lv: string;
}

export interface Question {
  id: string;
  category: TestCategory;
  text: LocalizedText;
  options: LocalizedText[];
  /** Index of the correct answer (Knowledge category only) */
  correctIndex?: number;
}

export interface AnswerRecord {
  questionId: string;
  category: TestCategory;
  selectedOptionIndex: number;
  /** Score from 0 to 100 */
  score: number;
}

export interface CategoryStats {
  total: number;
  totalScore: number;
  percentage: number;
}

export interface SessionResult {
  userId: string;
  startedAt: Date;
  completedAt: Date;
  answers: AnswerRecord[];
  categoryResults: Record<string, CategoryStats>;
  overallPercentage: number;
  isAnonymous?: boolean;
}

export interface AIQuestionPlan {
  mainIds: string[];
  backupIds: string[];
}
