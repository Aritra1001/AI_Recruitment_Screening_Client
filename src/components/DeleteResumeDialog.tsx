import { useState } from "react";
import { resumesApi } from "../api/resumes";
import type { Resume } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  /** The resume to delete; the dialog is open while this is non-null. */
  resume: Resume | null;
  onDeleted: (resume: Resume) => void;
  onCancel: () => void;
}

export function DeleteResumeDialog({ resume, onDeleted, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!resume) return;
    setBusy(true);
    setError(null);
    try {
      await resumesApi.remove(resume.resume_id);
      onDeleted(resume);
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
      confirmLabel="Delete resume"
      danger
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={cancel}
    >
      <p>
        You are about to permanently delete <strong>{resume?.original_filename}</strong> and anything
        extracted from it. This cannot be undone.
      </p>
    </ConfirmDialog>
  );
}
