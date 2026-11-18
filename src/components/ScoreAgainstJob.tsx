import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { scoresApi } from "../api/scores";
import type { Job } from "../types";
import { Alert } from "./Alert";

interface Props {
  resumeId: string;
  /** Jobs and the selection live in the page, so remounting this card (e.g. after a
   * re-extract) neither refetches the jobs nor loses the picked job. */
  jobs: Job[] | null;
  jobsError: string | null;
  selectedId: string;
  onSelect: (jobId: string) => void;
}

/** Pick a job, score this resume against it, and open the comparison. */
export function ScoreAgainstJob({ resumeId, jobs, jobsError, selectedId, onSelect }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Default to the first job until the user picks one; jobs may arrive after mount.
  const jobId = selectedId || jobs?.[0]?.job_id || "";

  async function compare() {
    setBusy(true);
    setError(null);
    try {
      // Returns the stored score straight away when nothing has changed since it was scored.
      await scoresApi.request(jobId, [resumeId]);
      navigate(`/jobs/${jobId}/scores/${resumeId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="card score-against">
      <div>
        <h2 className="pane-title">Compare with a job</h2>
        <p className="muted">Score this resume against a job's requirements with the AI screening agent.</p>
      </div>
      <Alert kind="error">{jobsError}</Alert>
      <Alert kind="error" onClose={() => setError(null)}>
        {error}
      </Alert>
      {jobs?.length === 0 ? (
        <p className="muted">There are no jobs yet.</p>
      ) : (
        <div className="score-against-form">
          <select value={jobId} onChange={(e) => onSelect(e.target.value)} disabled={!jobs || busy} aria-label="Job">
            {!jobs && <option>Loading jobs…</option>}
            {jobs?.map((j) => (
              <option key={j.job_id} value={j.job_id}>
                {j.title}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={compare} disabled={!jobId || busy}>
            {busy ? "Starting…" : "Score & compare"}
          </button>
        </div>
      )}
    </section>
  );
}
