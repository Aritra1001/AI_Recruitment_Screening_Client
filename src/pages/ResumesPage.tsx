import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { canDeleteResume, fileTypeLabel, formatBytes, resumesApi } from "../api/resumes";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { DeleteResumeDialog } from "../components/DeleteResumeDialog";
import { ResumeStatusBadge } from "../components/ResumeStatusBadge";
import type { Resume } from "../types";

const PAGE_SIZE = 20;

export function ResumesPage() {
  const { user } = useAuth();
  const location = useLocation();
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
      setResumes(await resumesApi.list(PAGE_SIZE, page * PAGE_SIZE));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleDeleted(resume: Resume) {
    setToDelete(null);
    setFlash(`Deleted "${resume.original_filename}".`);
    if (resumes.length === 1 && page > 0) setPage(page - 1);
    else load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Resumes</h1>
          <p className="muted">Candidate resumes uploaded to the portal.</p>
        </div>
        <Link to="/resumes/upload" className="btn btn-primary">
          + Upload resumes
        </Link>
      </div>

      <Alert kind="success" onClose={() => setFlash(null)}>
        {flash}
      </Alert>
      <Alert kind="error">{error}</Alert>

      <div className="card table-card">
        {loading ? (
          <div className="page-status">Loading resumes…</div>
        ) : resumes.length === 0 ? (
          <div className="page-status">
            {page === 0 ? (
              <>
                No resumes yet. <Link to="/resumes/upload">Upload the first one</Link>.
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
                    <ResumeStatusBadge status={resume.status} />
                  </td>
                  <td>{resume.uploader.full_name}</td>
                  <td>{new Date(resume.uploaded_at).toLocaleDateString()}</td>
                  <td>{formatBytes(resume.size_bytes)}</td>
                  <td className="actions-col">
                    <Link to={`/resumes/${resume.resume_id}`} className="btn btn-sm">
                      View
                    </Link>
                    {canDeleteResume(user, resume) && (
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

      <DeleteResumeDialog resume={toDelete} onDeleted={handleDeleted} onCancel={() => setToDelete(null)} />
    </>
  );
}
