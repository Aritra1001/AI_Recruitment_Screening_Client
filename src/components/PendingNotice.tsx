import { Link } from "react-router-dom";
import type { PendingApproval } from "../types";

const MESSAGES = {
  job_create: "This new job is waiting for another admin's approval. Recruiters can't see it yet.",
  job_update: "Changes to this job are waiting for another admin's approval. Until then, everyone sees the current version below.",
  job_delete: "Deleting this job is waiting for another admin's approval.",
  resume_delete: "Deleting this resume is waiting for an admin's approval. It can still be used until then.",
} as const;

/** Banner on a job or resume that has a change waiting for approval. */
export function PendingNotice({ pending }: { pending: PendingApproval | null | undefined }) {
  if (!pending) return null;
  return (
    <div className="alert alert-info pending-notice" role="status">
      <span>
        {MESSAGES[pending.action]}{" "}
        <span className="muted">
          Requested by {pending.requester.full_name} on {new Date(pending.requested_at).toLocaleString()}.
        </span>
      </span>
      <Link to={`/approvals/${pending.request_id}`} className="btn btn-sm">
        View request
      </Link>
    </div>
  );
}
