import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit as fbLimit,
  collectionGroup,
  getDocs,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { USERS, QUIZ_RESULTS } from "../firebase/collections";
import type { UserDoc } from "../types/user";

export interface QuizResultDoc {
  uid: string;
  quizName?: string;
  score: number;
  total: number;
  percentage: number;
  categoryResults?: Record<string, { total: number; totalScore?: number; correctCount?: number; percentage: number }>;
  completedAt?: { seconds: number };
}

export interface SessionDoc {
  userId?: string;
  overallPercentage: number;
  categoryResults: Record<string, { total: number; totalScore: number; percentage: number }>;
  completedAt?: { seconds: number };
  answers?: unknown[];
}

/** Subscribe to all users in real-time. Returns unsubscribe function. */
export function subscribeToAllUsers(
  callback: (users: (UserDoc & { uid: string })[]) => void,
): Unsubscribe {
  const q = query(collection(db, USERS));
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    })) as (UserDoc & { uid: string })[];
    callback(users);
  });
}

/** Subscribe to all quiz results in real-time. Returns unsubscribe function. */
export function subscribeToAllTestResults(
  callback: (results: QuizResultDoc[]) => void,
): Unsubscribe {
  const q = query(collection(db, QUIZ_RESULTS));
  return onSnapshot(q, (snap) => {
    const results = snap.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    })) as QuizResultDoc[];
    callback(results);
  });
}

/** Fetch recent test sessions across all users (one-time, using collection group). */
export async function getRecentSessions(count: number = 10): Promise<(SessionDoc & { sessionId: string })[]> {
  const q = query(
    collectionGroup(db, "sessions"),
    orderBy("completedAt", "desc"),
    fbLimit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    sessionId: d.id,
    ...d.data(),
  })) as (SessionDoc & { sessionId: string })[];
}

/** Fetch all sessions for a specific user. */
export async function getUserSessions(uid: string): Promise<SessionDoc[]> {
  const sessionsRef = collection(db, "testHistory", uid, "sessions");
  const q = query(sessionsRef, orderBy("completedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()) as SessionDoc[];
}
