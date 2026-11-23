import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { candidateLabel, scoresApi } from "../api/scores";
import { meetsMinimum, screeningsApi } from "../api/screenings";
import { useAuth } from "../auth/AuthContext";
import type { Job, ResumeScore, Screening } from "../types";
import { Alert } from "./Alert";
import { ScoreBadge, ScoreMeter } from "./ScoreBadge";
import { ScoreResumesDialog } from "./ScoreResumesDialog";
import { StageBadge } from "./ScreeningBadge";
import { SendToManagerDialog } from "./SendToManagerDialog";

const POLL_MS = 3000;

/** Resumes uploaded for this job and scored against it, best first, with controls to upload,
 * score, and send the ones that meet the job's minimum score to the domain manager. A resume
 * is only ever scored against the job it was uploaded for. */
export function JobCandidates({ job }: { job: Job }) {
  const { hasRole } = useAuth();
  // Domain managers only read here; they decide on the Screening page.
  const staff = hasRole("admin", "recruiter");
  const [scores, setScores] = useState<ResumeScore[] | null>(null);
  const [screenings, setScreenings] = useState<Map<string, Screening>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<{ resumeId: string; name: string }[] | null>(null);

  const load = useCallback(
    () =>
      Promise.all([scoresApi.list(job.job_id), screeningsApi.list({ jobId: job.job_id })])
        .then(([s, sc]) => {
          setScores(s);
          setScreenings(new Map(sc.map((x) => [x.resume.resume_id, x])));
        })
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

  const canSend = (s: ResumeScore) => meetsMinimum(s, job) && !screenings.has(s.resume.resume_id);
  const sendable = (scores ?? []).filter(canSend);
  // Drop selections that stopped being sendable (re-scored below the minimum, sent elsewhere).
  const chosen = sendable.filter((s) => selected.has(s.resume.resume_id));

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

  function toggle(resumeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(resumeId)) next.delete(resumeId);
      else next.add(resumeId);
      return next;
    });
  }

  function sent(result: Screening[]) {
    setSending(null);
    setSelected(new Set());
    setError(null);
    const managers = job.domain ? `the ${job.domain.name} managers` : "the domain managers";
    setNotice(
      `Sent ${result.length} ${result.length === 1 ? "candidate" : "candidates"} to ${managers}. ` +
        "You'll be emailed when they decide.",
    );
    load();
  }

  const allChosen = sendable.length > 0 && chosen.length === sendable.length;

  return (
    <section className="candidates">
      <div className="section-header">
        <div>
          <h2>Candidates</h2>
          <p className="muted">
            Resumes uploaded for this job, scored by the AI screening agent, best match first. Those scoring at least{" "}
            {job.shortlist_min_score} can be sent to the {job.domain ? `${job.domain.name} ` : ""}domain manager.{" "}
            <Link to={`/resumes?job=${job.job_id}`}>See all of this job's resumes</Link>
          </p>
        </div>
        {staff && (
          <div className="header-actions">
            <Link to={`/resumes/upload?job=${job.job_id}`} className="btn">
              Upload resumes
            </Link>
            <button className="btn" onClick={() => setPicking(true)} disabled={busy}>
              Choose resumes…
            </button>
            <button className="btn btn-primary" onClick={scoreAll} disabled={busy}>
              {busy ? "Starting…" : "Score all extracted resumes"}
            </button>
          </div>
        )}
      </div>

      {staff && !job.domain && (
        <Alert kind="info">
          This job has no domain yet, so no domain manager can screen its resumes. An admin can set one by editing the
          job.
        </Alert>
      )}
      <Alert kind="info" onClose={() => setNotice(null)}>
        {notice}
      </Alert>
      <Alert kind="error" onClose={() => setError(null)}>
        {error}
      </Alert>

      {staff && sendable.length > 0 && (
        <div className="shortlist-bar">
          <span>
            {chosen.length > 0
              ? `${chosen.length} selected`
              : `${sendable.length} ${sendable.length === 1 ? "candidate meets" : "candidates meet"} the minimum score of ${job.shortlist_min_score}.`}
          </span>
          <button
            className="btn btn-primary"
            disabled={chosen.length === 0 || !job.domain}
            onClick={() =>
              setSending(chosen.map((s) => ({ resumeId: s.resume.resume_id, name: candidateLabel(s) })))
            }
          >
            Send {chosen.length || ""} to manager
          </button>
        </div>
      )}

      <div className="card table-card">
        {scores === null ? (
          <div className="page-status">{error ? "Couldn't load scores." : "Loading scores…"}</div>
        ) : scores.length === 0 ? (
          <div className="page-status">
            No resumes have been scored for this job yet.{" "}
            {staff && (
              <>
                <Link to={`/resumes/upload?job=${job.job_id}`}>Upload resumes</Link> for it, then score them once they
                have been extracted.
              </>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                {staff && (
                  <th className="check-col">
                    <input
                      type="checkbox"
                      aria-label="Select every candidate who can be shortlisted"
                      checked={allChosen}
                      disabled={sendable.length === 0}
                      onChange={() =>
                        setSelected(allChosen ? new Set() : new Set(sendable.map((s) => s.resume.resume_id)))
                      }
                    />
                  </th>
                )}
                <th className="rank-col">#</th>
                <th>Candidate</th>
                <th>Match</th>
                <th>Recommendation</th>
                <th>Required skills</th>
                <th>Relevant exp.</th>
                <th>Stage</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <CandidateRow
                  key={s.score_id}
                  score={s}
                  rank={s.overall_score !== null ? i + 1 : null}
                  job={job}
                  screening={screenings.get(s.resume.resume_id)}
                  selectable={staff ? canSend(s) : null}
                  selected={selected.has(s.resume.resume_id)}
                  onToggle={() => toggle(s.resume.resume_id)}
                />
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
      <SendToManagerDialog job={job} candidates={sending} onSent={sent} onCancel={() => setSending(null)} />
    </section>
  );
}

interface RowProps {
  score: ResumeScore;
  rank: number | null;
  job: Job;
  screening?: Screening;
  /** null: no checkbox column (managers). */
  selectable: boolean | null;
  selected: boolean;
  onToggle: () => void;
}

function CandidateRow({ score, rank, job, screening, selectable, selected, onToggle }: RowProps) {
  const compareUrl = `/jobs/${job.job_id}/scores/${score.resume.resume_id}`;
  const required = score.criteria?.required_skills;
  const requiredTotal = (job.required_skills ?? []).length;
  return (
    <tr>
      {selectable !== null && (
        <td className="check-col">
          {selectable && (
            <input
              type="checkbox"
              aria-label={`Select ${candidateLabel(score)}`}
              checked={selected}
              onChange={onToggle}
            />
          )}
        </td>
      )}
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
      <td>
        <StageBadge score={score} screening={screening} job={job} />
      </td>
      <td className="actions-col">
        <Link to={compareUrl} className="btn btn-sm">
          Compare
        </Link>
      </td>
    </tr>
  );
}
