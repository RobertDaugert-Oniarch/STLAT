import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateLectureFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return "fileTooLarge";
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return "unsupportedFileType";
  }
  return null;
}

export async function uploadLectureFile(
  file: File,
  lectureId: string,
): Promise<string> {
  const error = validateLectureFile(file);
  if (error) throw new Error(error);

  const ext = file.name.split(".").pop() || "bin";
  const fileRef = ref(storage, `lectures/${lectureId}/original.${ext}`);

  await uploadBytes(fileRef, file, {
    contentType: file.type,
  });

  return getDownloadURL(fileRef);
}

export async function deleteLectureFile(lectureId: string): Promise<void> {
  const folderRef = ref(storage, `lectures/${lectureId}`);
  const list = await listAll(folderRef);

  await Promise.all(list.items.map((item) => deleteObject(item)));
}
