/** manager: screens the resumes recruiters send for jobs in their domains. */
export type Role = "admin" | "recruiter" | "manager";

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: Role;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface DomainSummary {
  domain_id: string;
  name: string;
}

export interface Job {
  job_id: string;
  title: string;
  description: string;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  minimum_experience: number | null;
  /** Null only for jobs created before domains existed. */
  domain: DomainSummary | null;
  /** A resume needs at least this overall score to be sent to the domain manager. */
  shortlist_min_score: number;
  created_at: string;
  /** Admins only (null for recruiters): "pending" while its creation, an edit or its deletion awaits approval. */
  approval: JobApproval | null;
}

export interface JobInput {
  title: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  minimum_experience: number | null;
  domain_id: string | null;
  shortlist_min_score: number;
}

export type ResumeStatus = "uploaded" | "extracting" | "extracted" | "failed";

export interface UserSummary {
  user_id: string;
  full_name: string;
  email: string;
}

export interface JobSummary {
  job_id: string;
  title: string;
}

export interface Resume {
  resume_id: string;
  /** The job it was uploaded for, and the only job it is scored against. Null only for
   * resumes uploaded before resumes belonged to a job. */
  job: JobSummary | null;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  status: ResumeStatus;
  uploaded_at: string;
  uploader: UserSummary;
  /** A deletion waiting for approval; only sent to admins and the person who asked for it. */
  pending_deletion: PendingApproval | null;
}

// Mirrors ExtractedResume in backend/app/schemas.py. Values are copied from the resume;
// `years` is computed from the position's dates (null when the resume gives none).
export interface ExtractedResume {
  name: string | null;
  experience: { company: string | null; role: string | null; years: number | null }[];
  skills: string[];
  education: string[];
}

export interface ResumeDetail extends Resume {
  extracted: ExtractedResume | null;
  extraction_error: string | null;
  extracted_at: string | null;
}

// --- Resume scores: mirrors ResumeScoreRead in backend/app/schemas.py ---

export type ScoreStatus = "scoring" | "scored" | "failed";
export type Recommendation = "strong_fit" | "good_fit" | "partial_fit" | "not_a_fit";
export type CriterionName =
  | "required_skills"
  | "preferred_skills"
  | "experience"
  | "role_relevance"
  | "achievements"
  | "education_certifications";

export interface CriterionScore {
  score: number;
  rationale: string;
  evidence: string[];
  // Only on the skill criteria (required_skills, preferred_skills).
  matched?: string[] | null;
  missing?: string[] | null;
}

export interface ResumeScore {
  score_id: string;
  job_id: string;
  resume: { resume_id: string; original_filename: string; candidate_name: string | null };
  status: ScoreStatus;
  overall_score: number | null;
  recommendation: Recommendation | null;
  criteria: Partial<Record<CriterionName, CriterionScore>> | null;
  relevant_experience_years: number | null;
  summary: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  weights: Partial<Record<CriterionName, number>> | null;
  agent_name: string | null;
  agent_version: string | null;
  model: string | null;
  error: string | null;
  scored_at: string | null;
}

// --- Approvals: mirrors ApprovalRead / PendingApproval in backend/app/schemas.py ---

export type ApprovalAction = "job_create" | "job_update" | "job_delete" | "resume_delete";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export interface PendingApproval {
  request_id: string;
  action: ApprovalAction;
  requester: UserSummary;
  requested_at: string;
  expires_at: string;
}

export interface JobApproval {
  status: "pending" | "approved";
  pending: PendingApproval | null;
}

export interface FieldChange<T = unknown> {
  old: T;
  new: T;
}

export interface ApprovalRequest {
  request_id: string;
  action: ApprovalAction;
  status: ApprovalStatus;
  /** Null once the job or resume is gone. */
  job_id: string | null;
  resume_id: string | null;
  target_name: string;
  /**
   * job_create / job_delete: the job's fields. job_update: {field: {old, new}} for each change.
   * resume_delete: original_filename, candidate_name, uploaded_by, uploaded_at.
   */
  details: Record<string, unknown>;
  requester: UserSummary;
  requested_at: string;
  expires_at: string;
  reviewer: UserSummary | null;
  reviewed_at: string | null;
  review_comment: string | null;
  can_review: boolean;
  can_cancel: boolean;
}

// --- Domains and screening: mirror DomainRead / ScreeningRead in backend/app/schemas.py ---

export interface Domain extends DomainSummary {
  managers: UserSummary[];
  job_count: number;
}

export type ScreeningStatus = "pending" | "interview" | "rejected";

export interface Screening {
  screening_id: string;
  status: ScreeningStatus;
  job: { job_id: string; title: string };
  /** The job's current domain: the one whose managers decide. */
  domain: DomainSummary | null;
  resume: { resume_id: string; original_filename: string; candidate_name: string | null };
  score_at_submission: number;
  min_score_at_submission: number;
  note: string | null;
  sender: UserSummary;
  sent_at: string;
  decider: UserSummary | null;
  decided_at: string | null;
  decision_comment: string | null;
  /** The current user is a manager of the job's domain and it is still pending. */
  can_decide: boolean;
}
