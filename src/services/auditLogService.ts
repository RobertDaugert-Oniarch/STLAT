import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { ADMIN_ACTIONS } from "../firebase/collections";

export type AdminActionType = "password_reset" | "user_delete" | "role_change";

export interface AdminActionDoc {
  id?: string;
  adminUid: string;
  adminEmail: string;
  action: AdminActionType;
  targetUid: string;
  targetEmail: string;
  details?: string;
  timestamp?: { seconds: number };
}

interface LogActionInput {
  action: AdminActionType;
  targetUid: string;
  targetEmail: string;
  details?: string;
}

/** Log an admin action to the audit log collection. */
export async function logAdminAction(input: LogActionInput): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, ADMIN_ACTIONS), {
    adminUid: user.uid,
    adminEmail: user.email || "",
    action: input.action,
    targetUid: input.targetUid,
    targetEmail: input.targetEmail,
    details: input.details || "",
    timestamp: serverTimestamp(),
  });
}

/** Fetch audit log entries, most recent first. */
export async function getAuditLog(count: number = 100): Promise<AdminActionDoc[]> {
  const q = query(
    collection(db, ADMIN_ACTIONS),
    orderBy("timestamp", "desc"),
    fbLimit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as AdminActionDoc[];
}
