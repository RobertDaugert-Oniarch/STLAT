export type SurveyCategory =
  | "Knowledge"
  | "Attitudes"
  | "Behaviour"
  | "Confidence in One's Judgement";

export const ALL_CATEGORIES: SurveyCategory[] = [
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
  category: SurveyCategory;
  text: LocalizedText;
  options: LocalizedText[];
  /** Index of the correct answer (Knowledge category only) */
  correctIndex?: number;
}

export interface AnswerRecord {
  questionId: string;
  category: SurveyCategory;
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
}

export interface AIQuestionPlan {
  mainIds: string[];
  backupIds: string[];
}
