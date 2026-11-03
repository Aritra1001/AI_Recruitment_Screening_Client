import type { Resume, ResumeDetail, User } from "../types";
import { apiBlob, apiRequest, apiUpload } from "./client";

export const resumesApi = {
  list: (limit: number, offset: number) => apiRequest<Resume[]>(`/resumes?limit=${limit}&offset=${offset}`),
  get: (id: string) => apiRequest<ResumeDetail>(`/resumes/${id}`),
  file: (id: string) => apiBlob(`/resumes/${id}/file`),
  upload: (file: File, onProgress?: (fraction: number) => void, signal?: AbortSignal) =>
    apiUpload<Resume>("/resumes", file, onProgress, signal),
  extract: (id: string) => apiRequest<ResumeDetail>(`/resumes/${id}/extract`, { method: "POST" }),
  remove: (id: string) => apiRequest<void>(`/resumes/${id}`, { method: "DELETE" }),
};

// Keep in sync with ALLOWED_TYPES / MAX_RESUME_MB in the backend.
export const RESUME_EXTENSIONS = [".pdf", ".docx"];
export const MAX_RESUME_MB = 10;

/** Mirrors the API rule: admins delete any resume, everyone else only their own uploads. */
export function canDeleteResume(user: User | null, resume: Resume): boolean {
  return user !== null && (user.role === "admin" || user.user_id === resume.uploader.user_id);
}

export function fileTypeLabel(filename: string): string {
  return filename.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Download a blob under the given file name. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
