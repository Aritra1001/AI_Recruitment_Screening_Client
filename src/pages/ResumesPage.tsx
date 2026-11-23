import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { canDeleteResume, fileTypeLabel, formatBytes, resumesApi } from "../api/resumes";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { PendingBadge } from "../components/ApprovalBadge";
import { DeleteResumeDialog } from "../components/DeleteResumeDialog";
import { ResumeStatusBadge } from "../components/ResumeStatusBadge";
import type { Job, Resume } from "../types";
import { useAutoRefresh } from "../useAutoRefresh";

const PAGE_SIZE = 20;
// The API's maximum page size; enough for a POC.
const MAX_JOBS = 200;

export function ResumesPage() {
  const { user, hasRole } = useAuth();
  const staff = hasRole("admin", "recruiter");
  const location = useLocation();
  // ?job=<id> shows only the resumes uploaded for that job.
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get("job") ?? "";
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  );
  const [toDelete, setToDelete] = useState<Resume | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResumes(await resumesApi.list(PAGE_SIZE, page * PAGE_SIZE, jobId || undefined));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, jobId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    jobsApi.list(MAX_JOBS, 0).then(setJobs).catch(() => setJobs([]));
  }, []);

  // Quietly pick up deletions an admin approved.
  useAutoRefresh(() => {
    resumesApi.list(PAGE_SIZE, page * PAGE_SIZE, jobId || undefined).then(setResumes).catch(() => {});
  });

  function filterByJob(id: string) {
    setPage(0);
    setSearchParams(id ? { job: id } : {}, { replace: true });
  }

  const uploadUrl = jobId ? `/resumes/upload?job=${jobId}` : "/resumes/upload";

  function handleRequested(resume: Resume) {
    setToDelete(null);
    setFlash(`Deleting "${resume.original_filename}" was sent to an admin for approval.`);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Resumes</h1>
          <p className="muted">Candidate resumes, each uploaded for one job and scored only against it.</p>
        </div>
        {staff && (
          <Link to={uploadUrl} className="btn btn-primary">
            + Upload resumes
          </Link>
        )}
      </div>

      <Alert kind="success" onClose={() => setFlash(null)}>
        {flash}
      </Alert>
      <Alert kind="error">{error}</Alert>

      <div className="job-filter">
        <label htmlFor="resume-job-filter">Job</label>
        <select id="resume-job-filter" value={jobId} onChange={(e) => filterByJob(e.target.value)}>
          <option value="">All jobs</option>
          {jobs?.map((j) => (
            <option key={j.job_id} value={j.job_id}>
              {j.title}
            </option>
          ))}
        </select>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="page-status">Loading resumes…</div>
        ) : resumes.length === 0 ? (
          <div className="page-status">
            {page === 0 ? (
              <>
                No resumes {jobId ? "for this job " : ""}yet.
                {staff && (
                  <>
                    {" "}
                    <Link to={uploadUrl}>Upload the first one</Link>.
                  </>
                )}
              </>
            ) : (
              "No more resumes."
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Job</th>
                <th>Status</th>
                <th>Uploaded by</th>
                <th>Uploaded</th>
                <th>Size</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resumes.map((resume) => (
                <tr key={resume.resume_id}>
                  <td>
                    <span className="file-type">{fileTypeLabel(resume.original_filename)}</span>
                    <Link to={`/resumes/${resume.resume_id}`} className="job-title">
                      {resume.original_filename}
                    </Link>
                  </td>
                  <td>
                    {resume.job ? (
                      <Link to={`/jobs/${resume.job.job_id}`}>{resume.job.title}</Link>
                    ) : (
                      <span className="muted">No job</span>
                    )}
                  </td>
                  <td>
                    <span className="badge-row">
                      <ResumeStatusBadge status={resume.status} />
                      {resume.pending_deletion && <PendingBadge pending={resume.pending_deletion} />}
                    </span>
                  </td>
                  <td>{resume.uploader.full_name}</td>
                  <td>{new Date(resume.uploaded_at).toLocaleDateString()}</td>
                  <td>{formatBytes(resume.size_bytes)}</td>
                  <td className="actions-col">
                    <Link to={`/resumes/${resume.resume_id}`} className="btn btn-sm">
                      View
                    </Link>
                    {canDeleteResume(user, resume) && !resume.pending_deletion && (
                      <button className="btn btn-sm btn-danger-outline" onClick={() => setToDelete(resume)}>
                        Delete
                      </button>
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
        <button className="btn" disabled={resumes.length < PAGE_SIZE || loading} onClick={() => setPage(page + 1)}>
          Next →
        </button>
      </div>

      <DeleteResumeDialog resume={toDelete} onRequested={handleRequested} onCancel={() => setToDelete(null)} />
    </>
  );
}
