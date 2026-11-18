import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { jobsApi } from "../api/jobs";
import { resumesApi } from "../api/resumes";
import { CRITERIA, candidateLabel, formatScore, scoreBand, scoresApi } from "../api/scores";
import { Alert } from "../components/Alert";
import { ScoreBadge, ScoreMeter } from "../components/ScoreBadge";
import { SkillList } from "../components/SkillList";
import type { CriterionScore, Job, ResumeDetail, ResumeScore } from "../types";

const POLL_MS = 3000;

/** One resume compared against one job, with the scoring agent's full assessment. */
export function ScoreComparisonPage() {
  const { jobId = "", resumeId = "" } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  // undefined = loading, null = not scored for this job yet.
  const [score, setScore] = useState<ResumeScore | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadScore = useCallback(
    () =>
      scoresApi
        .get(jobId, resumeId)
        .then(setScore)
        .catch((e: Error) => {
          if (e instanceof ApiError && e.status === 404) setScore(null);
          else setError(e.message);
        }),
    [jobId, resumeId],
  );

  useEffect(() => {
    Promise.all([jobsApi.get(jobId), resumesApi.get(resumeId)])
      .then(([j, r]) => {
        setJob(j);
        setResume(r);
      })
      .catch((e: Error) => setError(e.message));
    loadScore();
  }, [jobId, resumeId, loadScore]);

  // Scoring runs in the background on the server; refresh until it finishes.
  const scoring = score?.status === "scoring";
  useEffect(() => {
    if (!scoring) return;
    const timer = setInterval(loadScore, POLL_MS);
    return () => clearInterval(timer);
  }, [scoring, loadScore]);

  async function requestScore(force: boolean) {
    setBusy(true);
    setActionError(null);
    try {
      const [result] = await scoresApi.request(jobId, [resumeId], force);
      setScore(result);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!job || !resume || score === undefined) return <div className="page-status">Loading…</div>;

  const title = score ? candidateLabel(score) : (resume.extracted?.name ?? resume.original_filename);
  const staleResume =
    score?.scored_at && resume.extracted_at && new Date(resume.extracted_at) > new Date(score.scored_at);

  return (
    <>
      <Link to={`/jobs/${job.job_id}`} className="back-link">
        ← {job.title}
      </Link>
      <div className="page-header">
        <div>
          <h1 className="resume-title">{title}</h1>
          <p className="muted resume-meta">
            Compared against <Link to={`/jobs/${job.job_id}`}>{job.title}</Link> ·
            <Link to={`/resumes/${resume.resume_id}`}>{resume.original_filename}</Link>
          </p>
        </div>
        {score && score.status !== "scoring" && (
          <div className="header-actions">
            <button className="btn" onClick={() => requestScore(true)} disabled={busy}>
              {busy ? "Starting…" : "Re-score"}
            </button>
          </div>
        )}
      </div>

      <Alert kind="error" onClose={() => setActionError(null)}>
        {actionError}
      </Alert>
      {staleResume && (
        <Alert kind="info">This resume was re-extracted after it was scored. Re-score it to update the result.</Alert>
      )}

      {score === null ? (
        <NotScored resume={resume} busy={busy} onScore={() => requestScore(false)} />
      ) : score.status === "scoring" ? (
        <div className="card empty-pane scoring-pane">
          <span className="spinner" aria-hidden="true" />
          <p>
            <strong>The screening agent is scoring this resume…</strong>
          </p>
          <p className="muted">This usually takes under a minute. The page updates when it finishes.</p>
        </div>
      ) : score.status === "failed" ? (
        <>
          <Alert kind="error">Scoring failed{score.error ? `: ${score.error}` : "."}</Alert>
          <div className="card empty-pane">
            <button className="btn btn-primary" onClick={() => requestScore(false)} disabled={busy}>
              {busy ? "Starting…" : "Retry scoring"}
            </button>
          </div>
        </>
      ) : (
        <ScoreReport score={score} job={job} resume={resume} />
      )}
    </>
  );
}

function NotScored({ resume, busy, onScore }: { resume: ResumeDetail; busy: boolean; onScore: () => void }) {
  return (
    <div className="card empty-pane">
      <p>
        <strong>This resume hasn't been scored against this job yet.</strong>
      </p>
      {resume.status === "extracted" ? (
        <>
          <p className="muted">The screening agent will compare it against the job's requirements.</p>
          <button className="btn btn-primary" onClick={onScore} disabled={busy}>
            {busy ? "Starting…" : "Score now"}
          </button>
        </>
      ) : (
        <p className="muted">
          It has to be extracted first. <Link to={`/resumes/${resume.resume_id}`}>Open the resume</Link> to extract it.
        </p>
      )}
    </div>
  );
}

function ScoreReport({ score, job, resume }: { score: ResumeScore; job: Job; resume: ResumeDetail }) {
  return (
    <div className="report">
      <Overview score={score} job={job} />

      <div className="sw-grid">
        <section className="card sw-card sw-strengths">
          <h3>Strengths</h3>
          <BulletList items={score.strengths} empty="None noted" />
        </section>
        <section className="card sw-card sw-gaps">
          <h3>Gaps</h3>
          <BulletList items={score.gaps} empty="None noted" />
        </section>
      </div>

      <section>
        <h2 className="report-heading">Resume vs job</h2>
        <Comparison score={score} job={job} resume={resume} />
      </section>

      <section>
        <h2 className="report-heading">Agent assessment by criterion</h2>
        <p className="muted report-sub">
          The agent scores each criterion from 0 to 100 and cites the resume. The overall match is the weighted average.
        </p>
        <div className="criteria">
          {CRITERIA.map(({ key, label }) => {
            const criterion = score.criteria?.[key];
            return criterion ? (
              <CriterionCard key={key} label={label} criterion={criterion} weight={score.weights?.[key] ?? null} />
            ) : null;
          })}
        </div>
      </section>

      <p className="muted agent-footer">
        Scored by {score.agent_name ?? "the screening agent"}
        {score.agent_version && ` v${score.agent_version}`}
        {score.model && ` · model ${score.model}`}
        {score.scored_at && ` · ${new Date(score.scored_at).toLocaleString()}`}
      </p>
    </div>
  );
}

function Overview({ score, job }: { score: ResumeScore; job: Job }) {
  const overall = score.overall_score ?? 0;
  const years = score.relevant_experience_years;
  const minYears = job.minimum_experience;
  return (
    <section className="card overview">
      <div
        className={`score-ring ring-${scoreBand(overall)}`}
        style={{ "--value": Math.min(Math.max(overall, 0), 100) } as CSSProperties}
        aria-label={`Overall match ${formatScore(overall)} out of 100`}
      >
        <span className="score-ring-value">{formatScore(overall)}</span>
        <span className="score-ring-max">/ 100</span>
      </div>
      <div className="overview-body">
        <div className="overview-tags">
          <ScoreBadge score={score} />
          {years !== null && (
            <span className={`exp-tag ${minYears !== null && years < minYears ? "exp-short" : ""}`}>
              {years} yrs relevant experience
              {minYears !== null && ` · job asks ${minYears}+`}
            </span>
          )}
        </div>
        <h3>Agent summary</h3>
        <p className="overview-summary">{score.summary ?? "No summary."}</p>
      </div>
    </section>
  );
}

function Comparison({ score, job, resume }: { score: ResumeScore; job: Job; resume: ResumeDetail }) {
  const data = resume.extracted;
  const required = score.criteria?.required_skills;
  const preferred = score.criteria?.preferred_skills;
  return (
    <div className="card compare">
      <div className="compare-row compare-head">
        <span />
        <span>Job requires</span>
        <span>Candidate's resume</span>
      </div>

      <CompareRow aspect="Required skills" criterion={required}>
        <SkillMatch matched={required?.matched} missing={required?.missing} />
        <SkillList skills={data?.skills ?? null} />
      </CompareRow>

      <CompareRow aspect="Preferred skills" criterion={preferred}>
        <SkillMatch matched={preferred?.matched} missing={preferred?.missing} />
        <span className="muted">See skills above</span>
      </CompareRow>

      <CompareRow aspect="Experience" criterion={score.criteria?.experience}>
        <p>{job.minimum_experience !== null ? `${job.minimum_experience}+ years` : "Not specified"}</p>
        <div>
          {score.relevant_experience_years !== null && (
            <p className="compare-strong">{score.relevant_experience_years} years relevant (agent's estimate)</p>
          )}
          {data?.experience.length ? (
            <ul className="timeline compact">
              {data.experience.map((e, i) => (
                <li key={i}>
                  <strong>{e.role ?? "Untitled role"}</strong>
                  {e.company && <span> · {e.company}</span>}
                  {e.years !== null && <span className="muted"> · {e.years} yrs</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No positions found</p>
          )}
        </div>
      </CompareRow>

      <CompareRow aspect="Role" criterion={score.criteria?.role_relevance}>
        <p>{job.title}</p>
        <p>
          {data?.experience
            .map((e) => e.role)
            .filter(Boolean)
            .join(", ") || <span className="muted">—</span>}
        </p>
      </CompareRow>

      <CompareRow aspect="Education" criterion={score.criteria?.education_certifications}>
        <p className="muted">As stated in the description</p>
        {data?.education.length ? (
          <ul className="plain-list compact">
            {data.education.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">None found</p>
        )}
      </CompareRow>

      <details className="compare-description">
        <summary>Job description</summary>
        <p className="description">{job.description}</p>
      </details>
    </div>
  );
}

function CompareRow({
  aspect,
  criterion,
  children,
}: {
  aspect: string;
  criterion?: CriterionScore;
  children: [ReactNode, ReactNode];
}) {
  return (
    <div className="compare-row">
      <div className="compare-aspect">
        <strong>{aspect}</strong>
        {criterion && <ScoreMeter value={criterion.score} label={aspect} />}
      </div>
      <div className="compare-cell">
        <span className="compare-label">Job requires</span>
        {children[0]}
      </div>
      <div className="compare-cell">
        <span className="compare-label">Candidate's resume</span>
        {children[1]}
      </div>
    </div>
  );
}

/** The job's skills, each marked as found on the resume (per the agent) or missing. */
function SkillMatch({ matched, missing }: { matched?: string[] | null; missing?: string[] | null }) {
  if (!matched?.length && !missing?.length) return <span className="muted">—</span>;
  return (
    <span className="chips">
      {matched?.map((s) => (
        <span key={s} className="chip chip-match" title="Found on the resume">
          ✓ {s}
        </span>
      ))}
      {missing?.map((s) => (
        <span key={s} className="chip chip-miss" title="Not found on the resume">
          ✕ {s}
        </span>
      ))}
    </span>
  );
}

function CriterionCard({ label, criterion, weight }: { label: string; criterion: CriterionScore; weight: number | null }) {
  return (
    <article className="card criterion">
      <header className="criterion-head">
        <div>
          <strong>{label}</strong>
          {weight !== null && <span className="muted criterion-weight">{weight}% of overall</span>}
        </div>
        <ScoreMeter value={criterion.score} label={label} />
      </header>
      <p className="criterion-rationale">{criterion.rationale}</p>
      {(criterion.matched || criterion.missing) && (
        <div className="criterion-skills">
          <SkillMatch matched={criterion.matched} missing={criterion.missing} />
        </div>
      )}
      {criterion.evidence.length > 0 && (
        <div className="evidence">
          <h3>Evidence from the resume</h3>
          <ul>
            {criterion.evidence.map((quote, i) => (
              <li key={i}>
                <blockquote>{quote}</blockquote>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function BulletList({ items, empty }: { items: string[] | null; empty: string }) {
  if (!items?.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="bullet-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
