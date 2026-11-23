import { Link } from "react-router-dom";
import { meetsMinimum, SCREENING_LABELS } from "../api/screenings";
import type { Job, ResumeScore, Screening, ScreeningStatus } from "../types";

export function ScreeningStatusBadge({ status }: { status: ScreeningStatus }) {
  return <span className={`status-badge screening-${status}`}>{SCREENING_LABELS[status]}</span>;
}

/** Where a scored resume is in the hiring flow: below the job's minimum, ready to send, with
 * the manager, or decided. Links to the screening once it has been sent. */
export function StageBadge({ score, screening, job }: { score: ResumeScore; screening?: Screening; job: Job }) {
  if (screening) {
    return (
      <Link to={`/screening/${screening.screening_id}`} className="badge-link">
        <ScreeningStatusBadge status={screening.status} />
      </Link>
    );
  }
  if (score.status !== "scored" || score.overall_score === null) return <span className="muted">—</span>;
  if (meetsMinimum(score, job)) return <span className="status-badge stage-ready">Can shortlist</span>;
  return (
    <span className="status-badge stage-below" title={`The job's minimum is ${job.shortlist_min_score}`}>
      Below {job.shortlist_min_score}
    </span>
  );
}
