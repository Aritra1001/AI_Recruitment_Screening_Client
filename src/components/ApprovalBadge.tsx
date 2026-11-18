import { PENDING_LABELS, STATUS_LABELS } from "../api/approvals";
import type { ApprovalStatus, JobApproval, PendingApproval } from "../types";

/** A request's status: pending, approved, rejected, expired or withdrawn. */
export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return <span className={`status-badge approval-${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

/** What is waiting on a job or resume ("Pending: edit"). */
export function PendingBadge({ pending }: { pending: PendingApproval }) {
  return <span className="status-badge approval-pending">{PENDING_LABELS[pending.action]}</span>;
}

/** A job's approval status, for admins. Recruiters get no `approval` and see nothing. */
export function JobApprovalBadge({ approval }: { approval: JobApproval | null }) {
  if (!approval) return null;
  if (approval.pending) return <PendingBadge pending={approval.pending} />;
  return <ApprovalStatusBadge status={approval.status} />;
}
