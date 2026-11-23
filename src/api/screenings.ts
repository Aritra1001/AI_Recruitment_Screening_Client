import type { Job, ResumeScore, Screening, ScreeningStatus } from "../types";
import { apiRequest } from "./client";

export type ScreeningFilter = ScreeningStatus | "all";

export const screeningsApi = {
  list: (params: { status?: ScreeningFilter; jobId?: string; resumeId?: string } = {}) => {
    const query = new URLSearchParams({ status: params.status ?? "all" });
    if (params.jobId) query.set("job_id", params.jobId);
    if (params.resumeId) query.set("resume_id", params.resumeId);
    return apiRequest<Screening[]>(`/screenings?${query}`);
  },
  get: (id: string) => apiRequest<Screening>(`/screenings/${id}`),
  /** Send resumes to the job's domain managers. All or nothing. */
  send: (jobId: string, resumeIds: string[], note: string) =>
    apiRequest<Screening[]>(`/jobs/${jobId}/screenings`, {
      method: "POST",
      body: JSON.stringify({ resume_ids: resumeIds, note: note.trim() || null }),
    }),
  decide: (id: string, decision: "interview" | "rejected", comment: string) =>
    apiRequest<Screening>(`/screenings/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, comment: comment.trim() || null }),
    }),
};

/** Fired after resumes are sent or a decision is made, so the nav's pending count refreshes. */
export const SCREENING_CHANGED = "screening-changed";

export const SCREENING_LABELS: Record<ScreeningStatus, string> = {
  pending: "With manager",
  interview: "Interview",
  rejected: "Rejected by manager",
};

/** Mirrors the API's rule; the API also refuses a score that is out of date. */
export function meetsMinimum(score: ResumeScore, job: Job): boolean {
  return score.status === "scored" && score.overall_score !== null && score.overall_score >= job.shortlist_min_score;
}
