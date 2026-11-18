export type Role = "admin" | "recruiter";

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

export interface Job {
  job_id: string;
  title: string;
  description: string;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  minimum_experience: number | null;
  created_at: string;
}

export interface JobInput {
  title: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  minimum_experience: number | null;
}

export type ResumeStatus = "uploaded" | "extracting" | "extracted" | "failed";

export interface UserSummary {
  user_id: string;
  full_name: string;
  email: string;
}

export interface Resume {
  resume_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  status: ResumeStatus;
  uploaded_at: string;
  uploader: UserSummary;
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
