import type { LocalizedText, TestCategory } from "./test";

export interface LectureSection {
  id: string;
  title: LocalizedText;
  content: LocalizedText;
}

export interface LectureDoc {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  category: TestCategory;
  coverImage?: string;
  sections: LectureSection[];
  order: number;
  createdAt: unknown;
}

export interface UserLectureProgress {
  lectureId: string;
  completedSections: string[];
  lastSectionId?: string;
  updatedAt?: unknown;
}

/** Check if all sections of a lecture have been completed. */
export function isLectureComplete(
  progress: UserLectureProgress | undefined,
  lecture: LectureDoc,
): boolean {
  if (!progress) return false;
  return lecture.sections.every((s) => progress.completedSections.includes(s.id));
}
