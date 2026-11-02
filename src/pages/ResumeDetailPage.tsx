import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { canDeleteResume, formatBytes, resumesApi, saveBlob } from "../api/resumes";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { DeleteResumeDialog } from "../components/DeleteResumeDialog";
import { ResumeStatusBadge } from "../components/ResumeStatusBadge";
import { SkillList } from "../components/SkillList";
import type { ExtractedResume, ResumeDetail } from "../types";

export function ResumeDetailPage() {
  const { resumeId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    resumesApi.get(resumeId).then(setResume).catch((e: Error) => setError(e.message));
  }, [resumeId]);

  // Extraction runs in the background on the server; refresh until it finishes.
  const extracting = resume?.status === "extracting";
  useEffect(() => {
    if (!extracting) return;
    const timer = setInterval(() => {
      resumesApi.get(resumeId).then(setResume).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [resumeId, extracting]);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!resume) return <div className="page-status">Loading…</div>;

  async function download() {
    setDownloadError(null);
    try {
      saveBlob(await resumesApi.file(resume!.resume_id), resume!.original_filename);
    } catch (e) {
      setDownloadError((e as Error).message);
    }
  }

  return (
    <>
      <Link to="/resumes" className="back-link">
        ← All resumes
      </Link>
      <div className="page-header">
        <div>
          <h1 className="resume-title">{resume.original_filename}</h1>
          <p className="muted resume-meta">
            <ResumeStatusBadge status={resume.status} /> Uploaded by {resume.uploader.full_name} on{" "}
            {new Date(resume.uploaded_at).toLocaleString()} · {formatBytes(resume.size_bytes)}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={download}>
            Download
          </button>
          {canDeleteResume(user, resume) && (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
        </div>
      </div>
      <Alert kind="error" onClose={() => setDownloadError(null)}>
        {downloadError}
      </Alert>

      <div className="resume-layout">
        <section className="card resume-pane">
          <h2 className="pane-title">Original file</h2>
          <FilePreview resume={resume} onDownload={download} />
        </section>
        <section className="card resume-pane">
          <h2 className="pane-title">Extracted information</h2>
          <ExtractedPanel resume={resume} onChange={setResume} />
        </section>
      </div>

      <DeleteResumeDialog
        resume={confirmDelete ? resume : null}
        onDeleted={(r) => navigate("/resumes", { state: { flash: `Deleted "${r.original_filename}".` } })}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function FilePreview({ resume, onDownload }: { resume: ResumeDetail; onDownload: () => void }) {
  const isPdf = resume.content_type === "application/pdf";
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPdf) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    resumesApi
      .file(resume.resume_id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resume.resume_id, isPdf]);

  if (!isPdf) {
    return (
      <div className="empty-pane">
        <p>Word documents can't be previewed in the browser.</p>
        <button className="btn" onClick={onDownload}>
          Download to view
        </button>
      </div>
    );
  }
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!url) return <div className="page-status">Loading preview…</div>;
  return <iframe className="pdf-frame" src={url} title={`Preview of ${resume.original_filename}`} />;
}

const POLL_MS = 3000;

function ExtractedPanel({ resume, onChange }: { resume: ResumeDetail; onChange: (r: ResumeDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function extract() {
    setBusy(true);
    setError(null);
    try {
      onChange(await resumesApi.extract(resume.resume_id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const button = (label: string, className = "btn") => (
    <button className={className} onClick={extract} disabled={busy}>
      {busy ? "Starting…" : label}
    </button>
  );

  let body: ReactNode;
  if (resume.status === "extracting") {
    body = <div className="empty-pane">Extracting information from this resume…</div>;
  } else if (resume.status === "failed") {
    body = (
      <>
        <Alert kind="error">
          Extraction failed{resume.extraction_error ? `: ${resume.extraction_error}` : "."}
        </Alert>
        <div className="empty-pane">{button("Retry extraction")}</div>
      </>
    );
  } else if (resume.status !== "extracted" || !resume.extracted) {
    body = (
      <div className="empty-pane">
        <p>
          <strong>Not extracted yet.</strong>
        </p>
        <p className="muted">Name, work experience, skills and education will appear here once this resume has been processed.</p>
        {button("Extract now", "btn btn-primary")}
      </div>
    );
  } else {
    body = (
      <>
        <ExtractedFields data={resume.extracted} />
        <p className="muted extracted-footer">
          Extracted {resume.extracted_at && new Date(resume.extracted_at).toLocaleString()} ·{" "}
          {button("Re-extract", "btn btn-ghost btn-sm")}
        </p>
      </>
    );
  }
  return (
    <>
      <Alert kind="error" onClose={() => setError(null)}>
        {error}
      </Alert>
      {body}
    </>
  );
}

function ExtractedFields({ data }: { data: ExtractedResume }) {
  return (
    <div className="extracted">
      <Field title="Name">
        <p>{data.name ?? <span className="muted">—</span>}</p>
      </Field>

      <Field title="Experience" empty={data.experience.length === 0}>
        <ul className="timeline">
          {data.experience.map((job, i) => (
            <li key={i}>
              <div className="timeline-head">
                <strong>{job.role ?? "Untitled role"}</strong>
                {job.company && <span> · {job.company}</span>}
              </div>
              {job.years !== null && <div className="muted timeline-sub">{formatYears(job.years)}</div>}
            </li>
          ))}
        </ul>
      </Field>

      <Field title="Skills">
        <SkillList skills={data.skills} />
      </Field>

      <Field title="Education" empty={data.education.length === 0}>
        <ul className="plain-list">
          {data.education.map((degree, i) => (
            <li key={i}>{degree}</li>
          ))}
        </ul>
      </Field>
    </div>
  );
}

function Field({ title, empty, children }: { title: string; empty?: boolean; children: ReactNode }) {
  return (
    <section className="extracted-section">
      <h3>{title}</h3>
      {empty ? <p className="muted">None found</p> : children}
    </section>
  );
}

function formatYears(years: number): string {
  return `${years} ${years === 1 ? "year" : "years"}`;
}
