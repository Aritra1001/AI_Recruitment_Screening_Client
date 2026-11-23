import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { scoresApi } from "../api/scores";
import type { JobSummary } from "../types";
import { Alert } from "./Alert";

interface Props {
  resumeId: string;
  /** The job the resume was uploaded for: the only job it is scored against. */
  job: JobSummary | null;
}

/** Score this resume against its job and open the comparison. */
export function ScoreAgainstJob({ resumeId, job }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compare() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      // Returns the stored score straight away when nothing has changed since it was scored.
      await scoresApi.request(job.job_id, [resumeId]);
      navigate(`/jobs/${job.job_id}/scores/${resumeId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="card score-against">
      <div>
        <h2 className="pane-title">Compare with the job</h2>
        {job ? (
          <p className="muted">
            Score this resume against the requirements of <Link to={`/jobs/${job.job_id}`}>{job.title}</Link>, the
            job it was uploaded for, with the AI screening agent.
          </p>
        ) : (
          <p className="muted">
            This resume was uploaded before resumes belonged to a job, so it can't be scored. Upload it again for the
            right job.
          </p>
        )}
      </div>
      <Alert kind="error" onClose={() => setError(null)}>
        {error}
      </Alert>
      {job && (
        <div className="score-against-form">
          <button className="btn btn-primary" onClick={compare} disabled={busy}>
            {busy ? "Starting…" : "Score & compare"}
          </button>
        </div>
      )}
    </section>
  );
}
