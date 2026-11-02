import { useState } from "react";
import { jobsApi } from "../api/jobs";
import type { Job } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  /** The job to delete; the dialog is open while this is non-null. */
  job: Job | null;
  onDeleted: (job: Job) => void;
  onCancel: () => void;
}

export function DeleteJobDialog({ job, onDeleted, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      await jobsApi.remove(job.job_id);
      onDeleted(job);
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
      open={job !== null}
      title="Delete job?"
      confirmLabel="Delete job"
      danger
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={cancel}
    >
      <p>
        You are about to permanently delete <strong>{job?.title}</strong>. This cannot be undone.
      </p>
    </ConfirmDialog>
  );
}
