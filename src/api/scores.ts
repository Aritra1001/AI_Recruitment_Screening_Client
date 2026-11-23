import type { CriterionName, Recommendation, ResumeScore } from "../types";
import { apiRequest } from "./client";

export const scoresApi = {
  list: (jobId: string) => apiRequest<ResumeScore[]>(`/jobs/${jobId}/scores`),
  get: (jobId: string, resumeId: string) => apiRequest<ResumeScore>(`/jobs/${jobId}/scores/${resumeId}`),
  /**
   * Start scoring in the background. Omit resumeIds to score every extracted resume uploaded
   * for this job (only those can be scored against it). A resume
   * whose job, resume and agent version are unchanged keeps its stored score unless force is set.
   */
  request: (jobId: string, resumeIds?: string[], force = false) =>
    apiRequest<ResumeScore[]>(`/jobs/${jobId}/scores`, {
      method: "POST",
      body: JSON.stringify({ resume_ids: resumeIds ?? null, force }),
    }),
};

// Display order and labels. Keep in sync with WEIGHTS in backend/app/resume_scoring.py.
export const CRITERIA: { key: CriterionName; label: string }[] = [
  { key: "required_skills", label: "Required skills" },
  { key: "experience", label: "Experience" },
  { key: "role_relevance", label: "Role relevance" },
  { key: "preferred_skills", label: "Preferred skills" },
  { key: "achievements", label: "Achievements" },
  { key: "education_certifications", label: "Education & certifications" },
];

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong_fit: "Strong fit",
  good_fit: "Good fit",
  partial_fit: "Partial fit",
  not_a_fit: "Not a fit",
};

/** The same bands the backend uses for the recommendation, for colouring any 0-100 score. */
export function scoreBand(score: number): Recommendation {
  if (score >= 80) return "strong_fit";
  if (score >= 65) return "good_fit";
  if (score >= 50) return "partial_fit";
  return "not_a_fit";
}

export function candidateLabel(score: ResumeScore): string {
  return score.resume.candidate_name || score.resume.original_filename;
}

export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
