import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { LECTURES, LECTURE_RATINGS } from "../firebase/collections";
import type { LectureRating } from "../types/lecture";

export async function submitRating(
  lectureId: string,
  uid: string,
  rating: number,
  comment?: string,
): Promise<void> {
  const ratingRef = doc(db, LECTURE_RATINGS, lectureId, "reviews", uid);
  const lectureRef = doc(db, LECTURES, lectureId);

  // Check if user has already rated
  const existing = await getDoc(ratingRef);
  const oldRating = existing.exists()
    ? (existing.data() as LectureRating).rating
    : null;

  await setDoc(ratingRef, {
    uid,
    lectureId,
    rating,
    comment: comment || "",
    createdAt: serverTimestamp(),
  });

  // Update denormalized rating on lecture doc
  if (oldRating === null) {
    // New rating
    const lectureSnap = await getDoc(lectureRef);
    if (lectureSnap.exists()) {
      const data = lectureSnap.data();
      const count = (data.ratingCount || 0) + 1;
      const sum = (data.avgRating || 0) * (data.ratingCount || 0) + rating;
      await updateDoc(lectureRef, {
        avgRating: Math.round((sum / count) * 10) / 10,
        ratingCount: increment(1),
      });
    }
  } else {
    // Updated rating — recalculate average
    const lectureSnap = await getDoc(lectureRef);
    if (lectureSnap.exists()) {
      const data = lectureSnap.data();
      const count = data.ratingCount || 1;
      const sum =
        (data.avgRating || 0) * count - oldRating + rating;
      await updateDoc(lectureRef, {
        avgRating: Math.round((sum / count) * 10) / 10,
      });
    }
  }
}

export async function getUserRating(
  lectureId: string,
  uid: string,
): Promise<LectureRating | null> {
  const ratingRef = doc(db, LECTURE_RATINGS, lectureId, "reviews", uid);
  const snap = await getDoc(ratingRef);
  if (!snap.exists()) return null;
  return snap.data() as LectureRating;
}

export async function getLectureRatings(
  lectureId: string,
): Promise<LectureRating[]> {
  const colRef = collection(db, LECTURE_RATINGS, lectureId, "reviews");
  const snap = await getDocs(query(colRef));
  return snap.docs.map((d) => d.data() as LectureRating);
}
