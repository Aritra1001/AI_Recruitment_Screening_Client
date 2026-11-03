import { useEffect, useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { formatBytes, MAX_RESUME_MB, RESUME_EXTENSIONS, resumesApi } from "../api/resumes";

const PARALLEL_UPLOADS = 3;

type ItemStatus = "ready" | "invalid" | "uploading" | "done" | "error";

interface UploadItem {
  key: string;
  file: File;
  status: ItemStatus;
  progress: number; // 0..1
  error?: string;
  /** The created resume, or the existing one for a duplicate. */
  resumeId?: string;
}

function validate(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!RESUME_EXTENSIONS.some((ext) => name.endsWith(ext))) return "Only PDF and DOCX files are supported";
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_RESUME_MB * 1024 * 1024) return `File is larger than ${MAX_RESUME_MB} MB`;
  return null;
}

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

const uploadLabel = (n: number) => (n === 0 ? "Upload" : `Upload ${n} ${n === 1 ? "file" : "files"}`);

export function ResumeUploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const uploading = items.some((i) => i.status === "uploading");
  const ready = items.filter((i) => i.status === "ready");
  const doneCount = items.filter((i) => i.status === "done").length;
  const failedCount = items.filter((i) => i.status === "error").length;

  // Cancel in-flight uploads on leaving the page, and warn before closing the tab mid-upload.
  // The controller is created inside the effect so StrictMode's mount/unmount/mount in dev
  // doesn't leave us holding an already-aborted one.
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  function update(key: string, changes: Partial<UploadItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    // Copy now: the FileList is live and the input is cleared right after this call,
    // which can happen before React runs the updater below.
    const picked = Array.from(files);
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.key));
      const added: UploadItem[] = [];
      for (const file of picked) {
        const key = fileKey(file);
        if (seen.has(key)) continue;
        seen.add(key);
        const error = validate(file);
        added.push({ key, file, status: error ? "invalid" : "ready", progress: 0, error: error ?? undefined });
      }
      return [...prev, ...added];
    });
  }

  async function uploadOne(item: UploadItem) {
    update(item.key, { status: "uploading", progress: 0, error: undefined });
    try {
      const resume = await resumesApi.upload(
        item.file,
        (progress) => update(item.key, { progress }),
        abortRef.current?.signal,
      );
      update(item.key, { status: "done", progress: 1, resumeId: resume.resume_id });
    } catch (e) {
      const detail = e instanceof ApiError ? (e.detail as { resume_id?: string } | undefined) : undefined;
      update(item.key, { status: "error", error: (e as Error).message, resumeId: detail?.resume_id });
    }
  }

  async function uploadAll() {
    const queue = [...ready];
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await uploadOne(item);
    };
    await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <>
      <Link to="/resumes" className="back-link">
        ← All resumes
      </Link>
      <h1>Upload resumes</h1>
      <p className="muted">
        PDF or DOCX, up to {MAX_RESUME_MB} MB each. You can add several files at once.
      </p>

      <div
        className={`dropzone${dragging ? " dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="dropzone-icon" aria-hidden>
          ⬆
        </div>
        <p>
          <strong>Drag and drop resumes here</strong>
        </p>
        <p className="muted">or</p>
        <button
          type="button"
          className="btn"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={RESUME_EXTENSIONS.join(",")}
          hidden
          data-testid="resume-file-input"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ""; // allow picking the same file again after removing it
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="card upload-list">
          {items.map((item) => (
            <div key={item.key} className={`upload-item upload-${item.status}`}>
              <div className="upload-info">
                <div className="upload-name">{item.file.name}</div>
                <div className="upload-meta">
                  {formatBytes(item.file.size)}
                  {item.status === "ready" && " · Ready to upload"}
                  {item.status === "uploading" && ` · Uploading ${Math.round(item.progress * 100)}%`}
                  {item.status === "done" && " · Uploaded"}
                  {item.error && <span className="upload-error"> · {item.error}</span>}
                </div>
                {item.status === "uploading" && (
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${item.progress * 100}%` }} />
                  </div>
                )}
              </div>
              <div className="upload-actions">
                {item.resumeId && (
                  <Link to={`/resumes/${item.resumeId}`} className="btn btn-sm">
                    {item.status === "done" ? "View" : "View existing"}
                  </Link>
                )}
                {item.status !== "uploading" && item.status !== "done" && (
                  <button
                    className="btn btn-sm btn-ghost"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(doneCount > 0 || failedCount > 0) && !uploading && (
        <p className="upload-summary">
          {doneCount} uploaded{failedCount > 0 && `, ${failedCount} failed`}.{" "}
          <Link to="/resumes">Go to resumes</Link>
        </p>
      )}

      <div className="form-actions">
        <button
          className="btn"
          disabled={uploading || ready.length === items.length}
          onClick={() => setItems((prev) => prev.filter((i) => i.status === "ready"))}
        >
          Clear finished
        </button>
        <button className="btn btn-primary" disabled={uploading || ready.length === 0} onClick={uploadAll}>
          {uploading ? "Uploading…" : uploadLabel(ready.length)}
        </button>
      </div>
    </>
  );
}
