import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { auth } from "../firebase/config";
import { LECTURES, LECTURE_VERSIONS } from "../firebase/collections";
import { deleteLectureFile } from "./fileUploadService";
import { logAdminAction } from "./auditLogService";
import type { LectureDoc, LectureSection } from "../types/lecture";

export interface LectureFormData {
  title: string;
  description: string;
  category: LectureDoc["category"];
  language: LectureDoc["language"];
  status: LectureDoc["status"];
  coverImage?: string;
  sections: LectureSection[];
  order: number;
  fileUrl?: string;
  fileType?: LectureDoc["fileType"];
  publishAt?: Date | null;
}

export async function createLecture(data: LectureFormData): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const docData = {
    title: data.title,
    description: data.description,
    category: data.category,
    language: data.language,
    status: data.status,
    coverImage: data.coverImage || "",
    sections: data.sections,
    order: data.order,
    fileUrl: data.fileUrl || "",
    fileType: data.fileType || "manual",
    createdBy: user.uid,
    createdAt: Timestamp.now(),
    updatedAt: serverTimestamp(),
    publishAt: data.publishAt ? Timestamp.fromDate(data.publishAt) : null,
    version: 1,
  };

  const ref = await addDoc(collection(db, LECTURES), docData);

  await logAdminAction({
    action: "lecture_create",
    targetUid: ref.id,
    targetEmail: "",
    details: `Created lecture: ${data.title}`,
  });

  return ref.id;
}

export async function updateLecture(
  id: string,
  data: Partial<LectureFormData>,
): Promise<void> {
  const docRef = doc(db, LECTURES, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Lecture not found");

  const current = snap.data() as LectureDoc;

  // Save current version to history
  const versionRef = doc(
    db,
    LECTURE_VERSIONS,
    id,
    "versions",
    String(current.version),
  );
  await setDoc(versionRef, {
    ...current,
    savedAt: serverTimestamp(),
    savedBy: auth.currentUser?.uid || "",
  });

  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    version: current.version + 1,
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.language !== undefined) updateData.language = data.language;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
  if (data.sections !== undefined) updateData.sections = data.sections;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
  if (data.fileType !== undefined) updateData.fileType = data.fileType;
  if (data.publishAt !== undefined) {
    updateData.publishAt = data.publishAt
      ? Timestamp.fromDate(data.publishAt)
      : null;
  }

  await updateDoc(docRef, updateData);

  await logAdminAction({
    action: "lecture_update",
    targetUid: id,
    targetEmail: "",
    details: `Updated lecture: ${data.title || current.title} (v${current.version + 1})`,
  });
}

export async function deleteLecture(id: string): Promise<void> {
  const docRef = doc(db, LECTURES, id);
  const snap = await getDoc(docRef);
  const title = snap.exists() ? (snap.data() as LectureDoc).title : id;

  // Delete file from Storage
  try {
    await deleteLectureFile(id);
  } catch {
    // File may not exist, ignore
  }

  await deleteDoc(docRef);

  await logAdminAction({
    action: "lecture_delete",
    targetUid: id,
    targetEmail: "",
    details: `Deleted lecture: ${title}`,
  });
}

export async function toggleLectureStatus(
  id: string,
  status: "draft" | "published",
): Promise<void> {
  const docRef = doc(db, LECTURES, id);
  await updateDoc(docRef, { status, updatedAt: serverTimestamp() });

  await logAdminAction({
    action: "lecture_status_change",
    targetUid: id,
    targetEmail: "",
    details: `Changed status to: ${status}`,
  });
}

export type LectureWithId = LectureDoc & { id: string };

export function subscribeToAllLectures(
  callback: (lectures: LectureWithId[]) => void,
): () => void {
  const q = query(collection(db, LECTURES), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    const lectures: LectureWithId[] = snap.docs.map((d) => ({
      ...(d.data() as LectureDoc),
      id: d.id,
    }));
    callback(lectures);
  });
}

export interface LectureVersionDoc {
  title: string;
  description: string;
  sections: LectureSection[];
  version: number;
  savedAt: unknown;
  savedBy: string;
}

export async function getLectureVersions(
  lectureId: string,
): Promise<LectureVersionDoc[]> {
  const { getDocs: gd, query: q2, orderBy: ob } = await import(
    "firebase/firestore"
  );
  const colRef = collection(db, LECTURE_VERSIONS, lectureId, "versions");
  const snap = await gd(q2(colRef, ob("version", "desc")));
  return snap.docs.map((d) => d.data() as LectureVersionDoc);
}
