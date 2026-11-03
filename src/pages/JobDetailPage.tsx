import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { DeleteJobDialog } from "../components/DeleteJobDialog";
import { SkillList } from "../components/SkillList";
import type { Job } from "../types";

export function JobDetailPage() {
  const { jobId = "" } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
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

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!job) return <div className="page-status">Loading…</div>;

  return (
    <>
      <Link to="/jobs" className="back-link">
        ← All jobs
      </Link>
      <div className="page-header">
        <div>
          <h1>{job.title}</h1>
          <p className="muted">Created {new Date(job.created_at).toLocaleString()}</p>
        </div>
        {isAdmin && (
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
          <h3>Minimum experience</h3>
          <p>{job.minimum_experience != null ? `${job.minimum_experience}+ years` : "Not specified"}</p>
        </section>
      </div>

      <DeleteJobDialog
        job={confirmDelete ? job : null}
        onDeleted={(deleted) => navigate("/jobs", { state: { flash: `Deleted "${deleted.title}".` } })}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
