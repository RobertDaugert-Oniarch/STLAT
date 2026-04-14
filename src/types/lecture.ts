import type { TestCategory } from "./test";

export interface LectureSection {
  id: string;
  title: string;
  content: string;
}

export interface LectureDoc {
  id: string;
  title: string;
  description: string;
  category: TestCategory;
  language: "en" | "lv";
  status: "draft" | "published";
  coverImage?: string;
  sections: LectureSection[];
  order: number;
  createdAt: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  fileUrl?: string;
  fileType?: "pdf" | "docx" | "manual";
  publishAt?: unknown;
  version: number;
  avgRating?: number;
  ratingCount?: number;
}

export interface UserLectureProgress {
  lectureId: string;
  completedSections: string[];
  lastSectionId?: string;
  updatedAt?: unknown;
  totalReadingTime?: number;
  sectionReadingTime?: Record<string, number>;
  startedAt?: unknown;
}

export interface LectureRating {
  uid: string;
  lectureId: string;
  rating: number;
  comment?: string;
  createdAt: unknown;
}

/** Check if all sections of a lecture have been completed. */
export function isLectureComplete(
  progress: UserLectureProgress | undefined,
  lecture: LectureDoc,
): boolean {
  if (!progress) return false;
  return lecture.sections.every((s) => progress.completedSections.includes(s.id));
}
