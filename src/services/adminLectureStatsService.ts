import {
  collectionGroup,
  getDocs,
  query,
  collection,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { LECTURES } from "../firebase/collections";
import type { LectureDoc, UserLectureProgress } from "../types/lecture";

export interface LectureStatsSummary {
  lectureId: string;
  title: string;
  category: string;
  totalReaders: number;
  completedCount: number;
  completionRate: number;
  avgReadingTime: number;
  sectionDropoff: Record<string, number>;
}

export interface OverallLectureStats {
  totalLectures: number;
  publishedCount: number;
  draftCount: number;
  totalReaders: number;
  avgCompletionRate: number;
  byCategory: Record<string, number>;
}

export async function getAllLectureProgress(): Promise<
  Map<string, UserLectureProgress[]>
> {
  const progressMap = new Map<string, UserLectureProgress[]>();

  // Query all lectureProgress subcollections via collectionGroup
  const snap = await getDocs(
    query(collectionGroup(db, "items")),
  );

  for (const doc of snap.docs) {
    const path = doc.ref.path;
    // path looks like: lectureProgress/{lectureId}/items/{uid}
    const parts = path.split("/");
    if (parts.length >= 2 && parts[0] === "lectureProgress") {
      const lectureId = parts[1];
      const data = doc.data() as UserLectureProgress;
      const arr = progressMap.get(lectureId) || [];
      arr.push(data);
      progressMap.set(lectureId, arr);
    }
  }

  return progressMap;
}

export async function getOverallLectureStats(): Promise<OverallLectureStats> {
  const lecturesSnap = await getDocs(collection(db, LECTURES));
  const lectures = lecturesSnap.docs.map(
    (d) => ({ ...d.data(), id: d.id }) as LectureDoc & { id: string },
  );

  const progressMap = await getAllLectureProgress();

  let totalReaders = 0;
  let totalCompletionSum = 0;
  let lecturesWithReaders = 0;
  const byCategory: Record<string, number> = {};

  for (const lec of lectures) {
    byCategory[lec.category] = (byCategory[lec.category] || 0) + 1;

    const progress = progressMap.get(lec.id) || [];
    if (progress.length > 0) {
      totalReaders += progress.length;
      lecturesWithReaders++;
      const completed = progress.filter(
        (p) => lec.sections.every((s) => p.completedSections.includes(s.id)),
      ).length;
      totalCompletionSum += progress.length > 0 ? completed / progress.length : 0;
    }
  }

  return {
    totalLectures: lectures.length,
    publishedCount: lectures.filter((l) => l.status === "published").length,
    draftCount: lectures.filter((l) => l.status === "draft").length,
    totalReaders,
    avgCompletionRate:
      lecturesWithReaders > 0
        ? Math.round((totalCompletionSum / lecturesWithReaders) * 100)
        : 0,
    byCategory,
  };
}

export async function getLectureStats(
  lectures: (LectureDoc & { id: string })[],
): Promise<LectureStatsSummary[]> {
  const progressMap = await getAllLectureProgress();
  const stats: LectureStatsSummary[] = [];

  for (const lec of lectures) {
    const progress = progressMap.get(lec.id) || [];
    const totalReaders = progress.length;
    const completedCount = progress.filter(
      (p) => lec.sections.every((s) => p.completedSections.includes(s.id)),
    ).length;

    let totalTime = 0;
    const sectionDropoff: Record<string, number> = {};

    for (const sec of lec.sections) {
      sectionDropoff[sec.id] = 0;
    }

    for (const p of progress) {
      totalTime += p.totalReadingTime || 0;
      for (const sec of lec.sections) {
        if (p.completedSections.includes(sec.id)) {
          sectionDropoff[sec.id]++;
        }
      }
    }

    stats.push({
      lectureId: lec.id,
      title: lec.title,
      category: lec.category,
      totalReaders,
      completedCount,
      completionRate:
        totalReaders > 0
          ? Math.round((completedCount / totalReaders) * 100)
          : 0,
      avgReadingTime:
        totalReaders > 0 ? Math.round(totalTime / totalReaders) : 0,
      sectionDropoff,
    });
  }

  return stats;
}
