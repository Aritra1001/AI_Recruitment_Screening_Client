import { useState } from "react";
import { resumesApi } from "../api/resumes";
import type { Resume } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  /** The resume to delete; the dialog is open while this is non-null. */
  resume: Resume | null;
  onRequested: (resume: Resume) => void;
  onCancel: () => void;
}

/** Asks for the resume's deletion; an admin (other than the caller) has to approve it. */
export function DeleteResumeDialog({ resume, onRequested, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!resume) return;
    setBusy(true);
    setError(null);
    try {
      await resumesApi.remove(resume.resume_id);
      onRequested(resume);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setError(null);
    onCancel();
  }

  return (
    <ConfirmDialog
      open={resume !== null}
      title="Delete resume?"
      confirmLabel="Request deletion"
      danger
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={cancel}
    >
      <p>
        You are asking to permanently delete <strong>{resume?.original_filename}</strong>, anything extracted
        from it and its scores.
      </p>
      <p className="muted">
        An admin is emailed to approve it. The resume stays, and can still be scored, until they do; once approved,
        this cannot be undone.
      </p>
    </ConfirmDialog>
  );
}
