import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { SCREENING_CHANGED, screeningsApi } from "../api/screenings";
import { Alert } from "../components/Alert";
import { ScreeningStatusBadge } from "../components/ScreeningBadge";
import type { Screening } from "../types";
import { showIfGone, useAutoRefresh } from "../useAutoRefresh";

/** Where the manager's email lands: the candidate, their score, the recruiter's note, and the
 * interview / reject decision. Laid out to work on a phone. */
export function ScreeningDetailPage() {
  const { screeningId = "" } = useParams();
  const [screening, setScreening] = useState<Screening | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    screeningsApi.get(screeningId).then(setScreening).catch((e: Error) => setError(e.message));
  }, [screeningId]);

  // Another manager of the domain may decide while this page is open.
  useAutoRefresh(
    () => screeningsApi.get(screeningId).then(setScreening).catch(showIfGone(setError)),
    screening?.status === "pending",
  );

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!screening) return <div className="page-status">Loading…</div>;

  const s = screening;
  const name = s.resume.candidate_name || s.resume.original_filename;
  return (
    <div className="approval-page">
      <Link to="/screening" className="back-link">
        ← Screening
      </Link>
      <div className="approval-head">
        <ScreeningStatusBadge status={s.status} />
        <h1>{name}</h1>
        <p className="muted">
          For <Link to={`/jobs/${s.job.job_id}`}>{s.job.title}</Link>
          {s.domain && <> · {s.domain.name}</>}
        </p>
      </div>

      <div className="card approval-card">
        <dl className="approval-fields">
          <Row label="Match score">
            <strong>{s.score_at_submission.toFixed(1).replace(/\.0$/, "")}</strong> / 100{" "}
            <span className="muted">(the job's minimum was {s.min_score_at_submission})</span>
          </Row>
          <Row label="Sent by">
            {s.sender.full_name} on {new Date(s.sent_at).toLocaleString()}
          </Row>
          {s.note && (
            <Row label="Recruiter's note">
              <p className="review-comment">{s.note}</p>
            </Row>
          )}
        </dl>
        <div className="link-row">
          <Link to={`/jobs/${s.job.job_id}/scores/${s.resume.resume_id}`} className="btn btn-sm">
            See the full score
          </Link>
          <Link to={`/resumes/${s.resume.resume_id}`} className="btn btn-sm">
            Open the resume
          </Link>
        </div>
      </div>

      <DecisionCard screening={s} onChange={setScreening} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="approval-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DecisionCard({ screening, onChange }: { screening: Screening; onChange: (s: Screening) => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"interview" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function decide(decision: "interview" | "rejected") {
    if (decision === "rejected" && !comment.trim()) {
      setError("Add a comment saying why, so the recruiter knows.");
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      onChange(await screeningsApi.decide(screening.screening_id, decision, comment));
      setDone(
        decision === "interview"
          ? "Invited for an interview. The recruiter has been emailed."
          : "Rejected. The recruiter has been emailed.",
      );
      window.dispatchEvent(new Event(SCREENING_CHANGED));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (screening.status !== "pending") {
    return (
      <>
        <Alert kind="success" onClose={() => setDone(null)}>
          {done}
        </Alert>
        <div className="card approval-card">
          <p>
            <strong>
              {screening.status === "interview" ? "Invited for an interview" : "Rejected"} by{" "}
              {screening.decider?.full_name}
            </strong>{" "}
            <span className="muted">on {screening.decided_at && new Date(screening.decided_at).toLocaleString()}</span>
          </p>
          {screening.decision_comment && <p className="review-comment">“{screening.decision_comment}”</p>}
        </div>
      </>
    );
  }

  if (!screening.can_decide) {
    return (
      <div className="card approval-card">
        <p className="muted">
          Waiting for {screening.domain ? `a ${screening.domain.name} manager` : "a domain manager"} to decide.
        </p>
      </div>
    );
  }

  return (
    <div className="card approval-card decision">
      <label>
        Comment <small>(required to reject; the recruiter sees it)</small>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. Strong on FastAPI, check Kubernetes depth in the interview."
        />
      </label>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="decision-actions">
        <button className="btn btn-danger-outline" onClick={() => decide("rejected")} disabled={busy !== null}>
          {busy === "rejected" ? "Rejecting…" : "Reject"}
        </button>
        <button className="btn btn-primary" onClick={() => decide("interview")} disabled={busy !== null}>
          {busy === "interview" ? "Saving…" : "Invite to interview"}
        </button>
      </div>
    </div>
  );
}
