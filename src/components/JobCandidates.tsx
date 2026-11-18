import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { candidateLabel, scoresApi } from "../api/scores";
import type { Job, ResumeScore } from "../types";
import { Alert } from "./Alert";
import { ScoreBadge, ScoreMeter } from "./ScoreBadge";
import { ScoreResumesDialog } from "./ScoreResumesDialog";

const POLL_MS = 3000;

/** Resumes scored against this job, best first, with controls to score more. */
export function JobCandidates({ job }: { job: Job }) {
  const [scores, setScores] = useState<ResumeScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  const load = useCallback(
    () =>
      scoresApi
        .list(job.job_id)
        .then(setScores)
        .catch((e: Error) => setError(e.message)),
    [job.job_id],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Scoring runs in the background on the server; refresh until every resume is done.
  const scoring = scores?.some((s) => s.status === "scoring") ?? false;
  useEffect(() => {
    if (!scoring) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [scoring, load]);

  function started(result: ResumeScore[]) {
    const running = result.filter((s) => s.status === "scoring").length;
    const kept = result.length - running;
    setNotice(
      running
        ? `Scoring ${running} ${running === 1 ? "resume" : "resumes"}…` +
            (kept ? ` ${kept} unchanged ${kept === 1 ? "resume keeps its" : "resumes keep their"} stored score.` : "")
        : "Nothing changed since these resumes were last scored, so their stored scores were kept.",
    );
    load();
  }

  async function scoreAll() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      started(await scoresApi.request(job.job_id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="candidates">
      <div className="section-header">
        <div>
          <h2>Candidates</h2>
          <p className="muted">Resumes scored against this job by the AI screening agent, best match first.</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => setPicking(true)} disabled={busy}>
            Choose resumes…
          </button>
          <button className="btn btn-primary" onClick={scoreAll} disabled={busy}>
            {busy ? "Starting…" : "Score all extracted resumes"}
          </button>
        </div>
      </div>

      <Alert kind="info" onClose={() => setNotice(null)}>
        {notice}
      </Alert>
      <Alert kind="error" onClose={() => setError(null)}>
        {error}
      </Alert>

      <div className="card table-card">
        {scores === null ? (
          <div className="page-status">{error ? "Couldn't load scores." : "Loading scores…"}</div>
        ) : scores.length === 0 ? (
          <div className="page-status">
            No resumes have been scored for this job yet. Score all extracted resumes, or choose which ones to score.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="rank-col">#</th>
                <th>Candidate</th>
                <th>Match</th>
                <th>Recommendation</th>
                <th>Required skills</th>
                <th>Relevant exp.</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <CandidateRow key={s.score_id} score={s} rank={s.overall_score !== null ? i + 1 : null} job={job} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ScoreResumesDialog
        open={picking}
        jobId={job.job_id}
        scored={scores ?? []}
        onStarted={(result) => {
          setPicking(false);
          setError(null);
          started(result);
        }}
        onCancel={() => setPicking(false)}
      />
    </section>
  );
}

function CandidateRow({ score, rank, job }: { score: ResumeScore; rank: number | null; job: Job }) {
  const compareUrl = `/jobs/${job.job_id}/scores/${score.resume.resume_id}`;
  const required = score.criteria?.required_skills;
  const requiredTotal = (job.required_skills ?? []).length;
  return (
    <tr>
      <td className="rank-col muted">{rank ?? "—"}</td>
      <td>
        <Link to={compareUrl} className="job-title">
          {candidateLabel(score)}
        </Link>
        {score.resume.candidate_name && <div className="muted cell-sub">{score.resume.original_filename}</div>}
      </td>
      <td>{score.overall_score !== null ? <ScoreMeter value={score.overall_score} label="Overall match" /> : "—"}</td>
      <td>
        <ScoreBadge score={score} />
      </td>
      <td>
        {required?.matched && requiredTotal > 0 ? (
          <span title={required.missing?.length ? `Missing: ${required.missing.join(", ")}` : "All matched"}>
            {required.matched.length} / {requiredTotal}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td>
        {score.relevant_experience_years !== null
          ? `${score.relevant_experience_years} ${score.relevant_experience_years === 1 ? "yr" : "yrs"}`
          : "—"}
      </td>
      <td className="actions-col">
        <Link to={compareUrl} className="btn btn-sm">
          Compare
        </Link>
      </td>
    </tr>
  );
}
