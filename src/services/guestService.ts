import {
  collection,
  doc,
  setDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { GUEST_DEMOGRAPHICS, TEST_HISTORY, QUIZ_RESULTS } from "../firebase/collections";
import type { GuestDemographics } from "../types/user";
import type { SessionResult } from "../types/test";

/** Save guest demographic survey answers. */
export async function saveDemographics(
  uid: string,
  demographics: GuestDemographics,
): Promise<void> {
  await setDoc(doc(db, GUEST_DEMOGRAPHICS, uid), {
    ...demographics,
    createdAt: serverTimestamp(),
  });
}

/** Save a guest test session with isAnonymous flag + optional demographics reference.
 *  Uses individual writes instead of writeBatch because batch atomic evaluation
 *  conflicts with merge:true on quizResults for anonymous security rules. */
export async function saveGuestSession(
  uid: string,
  session: SessionResult,
): Promise<void> {
  // Save test history session
  const sessionsRef = collection(db, TEST_HISTORY, uid, "sessions");
  const newSessionRef = doc(sessionsRef);
  await setDoc(newSessionRef, {
    userId: uid,
    startedAt: Timestamp.fromDate(session.startedAt),
    completedAt: Timestamp.fromDate(session.completedAt),
    answers: session.answers,
    categoryResults: session.categoryResults,
    overallPercentage: session.overallPercentage,
    isAnonymous: true,
  });

  // Save quiz result summary
  const quizResultRef = doc(db, QUIZ_RESULTS, uid);
  await setDoc(
    quizResultRef,
    {
      quizName: "STLAT Test",
      score: session.overallPercentage,
      total: 100,
      percentage: session.overallPercentage,
      categoryResults: session.categoryResults,
      completedAt: Timestamp.fromDate(session.completedAt),
      isAnonymous: true,
    },
    { merge: true },
  );
}
