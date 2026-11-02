import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { DeleteJobDialog } from "../components/DeleteJobDialog";
import { SkillList } from "../components/SkillList";
import type { Job } from "../types";

const PAGE_SIZE = 20;

export function JobsPage() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  );
  const [toDelete, setToDelete] = useState<Job | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await jobsApi.list(PAGE_SIZE, page * PAGE_SIZE));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleDeleted(job: Job) {
    setToDelete(null);
    setFlash(`Deleted "${job.title}".`);
    // Step back a page if we just removed the last job on this one.
    if (jobs.length === 1 && page > 0) setPage(page - 1);
    else load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Jobs</h1>
          <p className="muted">
            {isAdmin ? "Create, edit and remove job openings." : "You have read-only access to job openings."}
          </p>
        </div>
        {isAdmin && (
          <Link to="/jobs/new" className="btn btn-primary">
            + New job
          </Link>
        )}
      </div>

      <Alert kind="success" onClose={() => setFlash(null)}>
        {flash}
      </Alert>
      <Alert kind="error">{error}</Alert>

      <div className="card table-card">
        {loading ? (
          <div className="page-status">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="page-status">{page === 0 ? "No jobs yet." : "No more jobs."}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Required skills</th>
                <th>Min. exp.</th>
                <th>Created</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td>
                    <Link to={`/jobs/${job.job_id}`} className="job-title">
                      {job.title}
                    </Link>
                  </td>
                  <td>
                    <SkillList skills={job.required_skills} max={4} />
                  </td>
                  <td>{job.minimum_experience != null ? `${job.minimum_experience}+ yrs` : "—"}</td>
                  <td>{new Date(job.created_at).toLocaleDateString()}</td>
                  <td className="actions-col">
                    <Link to={`/jobs/${job.job_id}`} className="btn btn-sm">
                      View
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to={`/jobs/${job.job_id}/edit`} className="btn btn-sm">
                          Edit
                        </Link>
                        <button className="btn btn-sm btn-danger-outline" onClick={() => setToDelete(job)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pager">
        <button className="btn" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>
          ← Previous
        </button>
        <span className="muted">Page {page + 1}</span>
        <button className="btn" disabled={jobs.length < PAGE_SIZE || loading} onClick={() => setPage(page + 1)}>
          Next →
        </button>
      </div>

      <DeleteJobDialog job={toDelete} onDeleted={handleDeleted} onCancel={() => setToDelete(null)} />
    </>
  );
}
