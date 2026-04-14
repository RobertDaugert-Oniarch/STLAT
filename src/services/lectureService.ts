import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  LECTURES,
  LECTURE_PROGRESS,
  QUIZ_RESULTS,
} from "../firebase/collections";
import type { LectureDoc, UserLectureProgress } from "../types/lecture";
import { isLectureComplete } from "../types/lecture";
import type { TestCategory } from "../types/test";

/** Fetch all published lectures ordered by `order` field. */
export async function getAllLectures(): Promise<LectureDoc[]> {
  const q = query(
    collection(db, LECTURES),
    where("status", "==", "published"),
    orderBy("order", "asc"),
  );
  const snap = await getDocs(q);
  const now = Date.now();
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LectureDoc))
    .filter((l) => {
      if (!l.publishAt) return true;
      const publishTime = (l.publishAt as { seconds: number }).seconds * 1000;
      return publishTime <= now;
    });
}

/** Fetch a single lecture by id. */
export async function getLectureById(
  id: string,
): Promise<LectureDoc | null> {
  const snap = await getDoc(doc(db, LECTURES, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as LectureDoc;
}

/** Fetch lectures filtered by category. */
export async function getLecturesByCategory(
  category: TestCategory,
): Promise<LectureDoc[]> {
  const q = query(
    collection(db, LECTURES),
    where("category", "==", category),
    orderBy("order", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LectureDoc);
}

/** Fetch all progress entries for a user. */
export async function getUserProgress(
  uid: string,
): Promise<UserLectureProgress[]> {
  const itemsRef = collection(db, LECTURE_PROGRESS, uid, "items");
  const snap = await getDocs(itemsRef);
  return snap.docs.map((d) => d.data() as UserLectureProgress);
}

/** Mark a lecture as completed for a user. */
export async function markSectionComplete(
  uid: string,
  lectureId: string,
  sectionId: string,
): Promise<void> {
  const ref = doc(db, LECTURE_PROGRESS, uid, "items", lectureId);
  await setDoc(
    ref,
    {
      lectureId,
      completedSections: arrayUnion(sectionId),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

/** Save the user's last-read section for resume support. */
export async function saveLectureProgress(
  uid: string,
  lectureId: string,
  lastSectionId: string,
): Promise<void> {
  const ref = doc(db, LECTURE_PROGRESS, uid, "items", lectureId);
  await setDoc(
    ref,
    {
      lectureId,
      lastSectionId,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

/**
 * Return unread lectures from the user's two weakest test categories.
 * Falls back to all unread lectures if no quiz results exist.
 */
export async function getRecommendedLectures(
  uid: string,
  allLectures: LectureDoc[],
  progress: UserLectureProgress[],
): Promise<LectureDoc[]> {
  const progressMap = new Map(progress.map((p) => [p.lectureId, p]));
  const completedIds = new Set(
    allLectures
      .filter((l) => isLectureComplete(progressMap.get(l.id), l))
      .map((l) => l.id),
  );

  // Find two weakest categories from quiz results
  const weakCategories: string[] = [];
  try {
    const resultSnap = await getDoc(doc(db, QUIZ_RESULTS, uid));
    if (resultSnap.exists()) {
      const data = resultSnap.data();
      const catResults = data.categoryResults as
        | Record<string, { percentage: number }>
        | undefined;
      if (catResults) {
        const sorted = Object.entries(catResults).sort(
          (a, b) => a[1].percentage - b[1].percentage,
        );
        for (let i = 0; i < Math.min(2, sorted.length); i++) {
          weakCategories.push(sorted[i][0]);
        }
      }
    }
  } catch {
    // Silently fall back to all unread
  }

  const unread = allLectures.filter((l) => !completedIds.has(l.id));

  if (weakCategories.length > 0) {
    const fromWeak = unread.filter((l) => weakCategories.includes(l.category));
    if (fromWeak.length > 0) return fromWeak;
  }

  return unread;
}

/** Update accumulated reading time for a specific section. */
export async function updateReadingTime(
  uid: string,
  lectureId: string,
  sectionId: string,
  seconds: number,
): Promise<void> {
  if (seconds <= 0) return;
  const ref = doc(db, LECTURE_PROGRESS, uid, "items", lectureId);
  await setDoc(
    ref,
    {
      lectureId,
      totalReadingTime: increment(seconds),
      [`sectionReadingTime.${sectionId}`]: increment(seconds),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}
