import {
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { GUEST_DEMOGRAPHICS, TEST_HISTORY, QUIZ_RESULTS } from "../firebase/collections";
import type { GuestDemographics } from "../types/user";
import type { SessionResult } from "../types/test";
import { collection } from "firebase/firestore";

/** Save guest demographic survey answers. */
export async function saveDemographics(
  uid: string,
  demographics: GuestDemographics,
): Promise<void> {
  await setDoc(doc(db, GUEST_DEMOGRAPHICS, uid), {
    ...demographics,
    createdAt: Timestamp.now(),
  });
}

/** Save a guest test session with isAnonymous flag + optional demographics reference. */
export async function saveGuestSession(
  uid: string,
  session: SessionResult,
): Promise<void> {
  const batch = writeBatch(db);

  const sessionsRef = collection(db, TEST_HISTORY, uid, "sessions");
  const newSessionRef = doc(sessionsRef);
  batch.set(newSessionRef, {
    userId: uid,
    startedAt: Timestamp.fromDate(session.startedAt),
    completedAt: Timestamp.fromDate(session.completedAt),
    answers: session.answers,
    categoryResults: session.categoryResults,
    overallPercentage: session.overallPercentage,
    isAnonymous: true,
  });

  const quizResultRef = doc(db, QUIZ_RESULTS, uid);
  batch.set(
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

  await batch.commit();
}
