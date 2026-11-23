import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ACTION_LABELS, APPROVALS_CHANGED, approvalsApi } from "../api/approvals";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { ApprovalStatusBadge } from "../components/ApprovalBadge";
import { SkillList } from "../components/SkillList";
import { FIELD_LABELS, formatValue } from "../jobFields";
import type { ApprovalRequest, FieldChange, JobInput } from "../types";
import { showIfGone, useAutoRefresh } from "../useAutoRefresh";

const JOB_FIELDS = Object.keys(FIELD_LABELS) as (keyof JobInput)[];

/** Where the link in an approval email lands. Built to be used on a phone. */
export function ApprovalDetailPage() {
  const { requestId = "" } = useParams();
  const { isAdmin } = useAuth();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    approvalsApi.get(requestId).then(setRequest).catch((e: Error) => setError(e.message));
  }, [requestId]);

  // Another admin may decide (or the requester withdraw) while this page is open.
  useAutoRefresh(
    () => approvalsApi.get(requestId).then(setRequest).catch(showIfGone(setError)),
    request?.status === "pending",
  );

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!request) return <div className="page-status">Loading…</div>;

  return (
    <div className="approval-page">
      {isAdmin && (
        <Link to="/approvals" className="back-link">
          ← All approvals
        </Link>
      )}
      <div className="approval-head">
        <ApprovalStatusBadge status={request.status} />
        <h1>
          {ACTION_LABELS[request.action]}: {request.target_name}
        </h1>
        <p className="muted">
          Requested by {request.requester.full_name} on {new Date(request.requested_at).toLocaleString()}
          {request.status === "pending" && <> · expires {new Date(request.expires_at).toLocaleString()}</>}
        </p>
      </div>

      <div className="card approval-card">
        <ChangeDetails request={request} />
        <TargetLink request={request} />
      </div>

      <Decision request={request} onChange={setRequest} />
    </div>
  );
}

function ChangeDetails({ request }: { request: ApprovalRequest }) {
  const { action, details } = request;
  if (action === "job_update") {
    const changes = details as Partial<Record<keyof JobInput, FieldChange>>;
    return (
      <>
        <h2 className="pane-title">Proposed changes</h2>
        <div className="change-list">
          {JOB_FIELDS.filter((f) => f in changes).map((field) => (
            <div key={field} className="change">
              <h3>{FIELD_LABELS[field]}</h3>
              <div className="change-values">
                <div>
                  <span className="change-label">Current</span>
                  <p className="diff-old">{formatValue(changes[field]!.old, true)}</p>
                </div>
                <div>
                  <span className="change-label">Proposed</span>
                  <p className="diff-new">{formatValue(changes[field]!.new, true)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (action === "resume_delete") {
    return (
      <>
        <h2 className="pane-title">Resume to delete</h2>
        <dl className="approval-fields">
          <Row label="File">{String(details.original_filename ?? request.target_name)}</Row>
          <Row label="Job">{(details.job_title as string | null | undefined) ?? <span className="muted">None</span>}</Row>
          <Row label="Candidate">{(details.candidate_name as string | null) ?? <span className="muted">Not extracted</span>}</Row>
          <Row label="Uploaded by">{String(details.uploaded_by ?? "")}</Row>
        </dl>
        <p className="muted">The file, its extracted information and its scores are deleted once approved.</p>
      </>
    );
  }
  return (
    <>
      <h2 className="pane-title">{action === "job_create" ? "New job" : "Job to delete"}</h2>
      <dl className="approval-fields">
        {JOB_FIELDS.map((field) => (
          <Row key={field} label={FIELD_LABELS[field]}>
            <JobFieldValue field={field} value={details[field]} />
          </Row>
        ))}
      </dl>
      {action === "job_delete" && (
        <p className="muted">The job and every resume uploaded for it (with their scores) are deleted once approved.</p>
      )}
    </>
  );
}

function JobFieldValue({ field, value }: { field: keyof JobInput; value: unknown }) {
  if (field === "required_skills" || field === "preferred_skills") return <SkillList skills={value as string[] | null} />;
  if (field === "minimum_experience") return <>{value != null ? `${value}+ years` : "Not specified"}</>;
  if (field === "description") return <p className="description">{String(value ?? "")}</p>;
  return <>{formatValue(value, true)}</>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="approval-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function TargetLink({ request }: { request: ApprovalRequest }) {
  if (request.job_id) {
    return (
      <Link to={`/jobs/${request.job_id}`} className="btn btn-sm">
        Open the job
      </Link>
    );
  }
  if (request.resume_id) {
    return (
      <Link to={`/resumes/${request.resume_id}`} className="btn btn-sm">
        Open the resume
      </Link>
    );
  }
  return null;
}

function Decision({ request, onChange }: { request: ApprovalRequest; onChange: (r: ApprovalRequest) => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(kind: "approve" | "reject" | "cancel") {
    setBusy(kind);
    setError(null);
    try {
      const updated =
        kind === "approve"
          ? await approvalsApi.approve(request.request_id, comment)
          : kind === "reject"
            ? await approvalsApi.reject(request.request_id, comment)
            : await approvalsApi.cancel(request.request_id);
      setDone(
        kind === "approve"
          ? "Approved. The change is now live and the requester has been emailed."
          : kind === "reject"
            ? "Rejected. Nothing was changed and the requester has been emailed."
            : "Request withdrawn. Nothing was changed.",
      );
      onChange(updated);
      window.dispatchEvent(new Event(APPROVALS_CHANGED));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (request.status !== "pending") {
    return (
      <>
        <Alert kind="success" onClose={() => setDone(null)}>
          {done}
        </Alert>
        <div className="card approval-card">
          <p>
            <strong>
              {request.status === "expired"
                ? "Expired without a decision."
                : request.status === "cancelled"
                  ? `Withdrawn by ${request.reviewer?.full_name ?? request.requester.full_name}`
                  : `${request.status === "approved" ? "Approved" : "Rejected"} by ${request.reviewer?.full_name}`}
            </strong>
            {request.reviewed_at && <span className="muted"> · {new Date(request.reviewed_at).toLocaleString()}</span>}
          </p>
          {request.review_comment && <p className="review-comment">“{request.review_comment}”</p>}
        </div>
      </>
    );
  }

  if (!request.can_review && !request.can_cancel) {
    return <Alert kind="info">Waiting for another admin to approve this.</Alert>;
  }

  return (
    <div className="card approval-card decision">
      <Alert kind="error" onClose={() => setError(null)}>
        {error}
      </Alert>
      {request.can_review && (
        <>
          <label>
            Comment <small>(optional, included in the email to {request.requester.full_name})</small>
            <textarea rows={3} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} />
          </label>
          <div className="decision-actions">
            <button className="btn btn-danger-outline" disabled={busy !== null} onClick={() => run("reject")}>
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </button>
            <button className="btn btn-primary" disabled={busy !== null} onClick={() => run("approve")}>
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
          </div>
        </>
      )}
      {request.can_cancel && (
        <>
          <p className="muted">
            You asked for this, so another admin has to approve it. You can withdraw it, for example to correct
            something and ask again.
          </p>
          <div className="decision-actions">
            <button className="btn" disabled={busy !== null} onClick={() => run("cancel")}>
              {busy === "cancel" ? "Withdrawing…" : "Withdraw request"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
