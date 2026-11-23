import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { JobApprovalBadge } from "../components/ApprovalBadge";
import { DeleteJobDialog } from "../components/DeleteJobDialog";
import { JobCandidates } from "../components/JobCandidates";
import { PendingNotice } from "../components/PendingNotice";
import { SkillList } from "../components/SkillList";
import type { Job } from "../types";
import { showIfGone, useAutoRefresh } from "../useAutoRefresh";

export function JobDetailPage() {
  const { jobId = "" } = useParams();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    jobsApi.get(jobId).then(setJob).catch((e: Error) => setError(e.message));
  }, [jobId]);

  // Pick up another admin's decision on a pending request.
  useAutoRefresh(
    () => jobsApi.get(jobId).then(setJob).catch(showIfGone(setError)),
    !!job?.approval?.pending,
  );

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!job) return <div className="page-status">Loading…</div>;
  const pending = job.approval?.pending ?? null;

  return (
    <>
      <Link to="/jobs" className="back-link">
        ← All jobs
      </Link>
      <div className="page-header">
        <div>
          <h1>{job.title}</h1>
          <p className="muted resume-meta">
            <JobApprovalBadge approval={job.approval} /> Created {new Date(job.created_at).toLocaleString()}
          </p>
        </div>
        {isAdmin && !pending && (
          <div className="header-actions">
            <Link to={`/jobs/${job.job_id}/edit`} className="btn">
              Edit
            </Link>
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        )}
      </div>

      <Alert kind="success" onClose={() => setFlash(null)}>
        {flash}
      </Alert>
      <PendingNotice pending={pending} />

      <div className="card detail">
        <section>
          <h3>Description</h3>
          <p className="description">{job.description}</p>
        </section>
        <section>
          <h3>Required skills</h3>
          <SkillList skills={job.required_skills} />
        </section>
        <section>
          <h3>Preferred skills</h3>
          <SkillList skills={job.preferred_skills} />
        </section>
        <section>
          <h3>Domain</h3>
          <p>
            {job.domain?.name ?? (
              <span className="muted">Not set. An admin needs to set one before resumes can be shortlisted.</span>
            )}
          </p>
        </section>
        <section>
          <h3>Minimum score to shortlist</h3>
          <p>{job.shortlist_min_score} / 100</p>
        </section>
        <section>
          <h3>Minimum experience</h3>
          <p>{job.minimum_experience != null ? `${job.minimum_experience}+ years` : "Not specified"}</p>
        </section>
      </div>

      <JobCandidates job={job} />

      <DeleteJobDialog
        job={confirmDelete ? job : null}
        onRequested={() => {
          setConfirmDelete(false);
          setFlash("Deletion sent to another admin for approval. The job stays live until they approve it.");
          jobsApi.get(jobId).then(setJob).catch((e: Error) => setError(e.message));
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
