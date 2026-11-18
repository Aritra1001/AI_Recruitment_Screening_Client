import type { ApprovalAction, ApprovalRequest, ApprovalStatus } from "../types";
import { apiRequest } from "./client";

export type ApprovalFilter = ApprovalStatus | "all";

export const approvalsApi = {
  list: (status: ApprovalFilter, limit: number, offset: number) =>
    apiRequest<ApprovalRequest[]>(`/approvals?status=${status}&limit=${limit}&offset=${offset}`),
  get: (id: string) => apiRequest<ApprovalRequest>(`/approvals/${id}`),
  approve: (id: string, comment: string) =>
    apiRequest<ApprovalRequest>(`/approvals/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
  reject: (id: string, comment: string) =>
    apiRequest<ApprovalRequest>(`/approvals/${id}/reject`, { method: "POST", body: JSON.stringify({ comment }) }),
  cancel: (id: string) => apiRequest<ApprovalRequest>(`/approvals/${id}/cancel`, { method: "POST" }),
};

/** Fired after a request is decided or withdrawn, so the nav's pending count refreshes. */
export const APPROVALS_CHANGED = "approvals-changed";

export const ACTION_LABELS: Record<ApprovalAction, string> = {
  job_create: "New job",
  job_update: "Job changes",
  job_delete: "Job deletion",
  resume_delete: "Resume deletion",
};

/** Short badge text for a job or resume with a pending request. */
export const PENDING_LABELS: Record<ApprovalAction, string> = {
  job_create: "Pending: new",
  job_update: "Pending: edit",
  job_delete: "Pending: deletion",
  resume_delete: "Deletion pending",
};

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Withdrawn",
};
