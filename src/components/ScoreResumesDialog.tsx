import { useEffect, useState } from "react";
import { resumesApi } from "../api/resumes";
import { scoresApi } from "../api/scores";
import type { Resume, ResumeScore } from "../types";

interface Props {
  open: boolean;
  jobId: string;
  /** Resumes already scored for this job, to mark them in the list. */
  scored: ResumeScore[];
  onStarted: (scores: ResumeScore[]) => void;
  onCancel: () => void;
}

// The API's maximum page size; enough for a POC.
const MAX_RESUMES = 200;

export function ScoreResumesDialog({ open, jobId, scored, onStarted, onCancel }: Props) {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setResumes(null);
    setSelected(new Set());
    setForce(false);
    setError(null);
    resumesApi
      .list(MAX_RESUMES, 0, jobId)
      .then((all) => setResumes(all.filter((r) => r.status === "extracted")))
      .catch((e: Error) => setError(e.message));
  }, [open, jobId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const scoredById = new Map(scored.map((s) => [s.resume.resume_id, s]));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = resumes !== null && resumes.length > 0 && selected.size === resumes.length;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      onStarted(await scoresApi.request(jobId, [...selected], force));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onCancel()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="score-dialog-title">Score this job's resumes</h2>
        <div className="modal-body">
          {resumes === null && !error && <div className="page-status">Loading resumes…</div>}
          {resumes?.length === 0 && (
            <p className="muted">
              No extracted resumes for this job yet. Upload resumes for this job and extract them before scoring.
            </p>
          )}
          {resumes && resumes.length > 0 && (
            <>
              <label className="check-row check-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(resumes.map((r) => r.resume_id)))}
                />
                Select all ({resumes.length})
              </label>
              <div className="pick-list">
                {resumes.map((r) => {
                  const existing = scoredById.get(r.resume_id);
                  return (
                    <label key={r.resume_id} className="check-row">
                      <input
                        type="checkbox"
                        checked={selected.has(r.resume_id)}
                        onChange={() => toggle(r.resume_id)}
                      />
                      <span className="pick-name">{r.original_filename}</span>
                      {existing && (
                        <span className="muted pick-note">
                          {existing.status === "scored" && existing.overall_score !== null
                            ? `scored ${existing.overall_score.toFixed(0)}`
                            : existing.status}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              <label className="check-row force-row">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
                <span>
                  Re-score even if nothing changed
                  <small className="muted"> (otherwise unchanged resumes keep their stored score)</small>
                </span>
              </label>
            </>
          )}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={start} disabled={busy || selected.size === 0}>
            {busy ? "Starting…" : `Score ${selected.size || ""} ${selected.size === 1 ? "resume" : "resumes"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
