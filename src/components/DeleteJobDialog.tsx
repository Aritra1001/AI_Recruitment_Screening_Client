import { useState } from "react";
import { jobsApi } from "../api/jobs";
import type { Job } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  /** The job to delete; the dialog is open while this is non-null. */
  job: Job | null;
  onRequested: (job: Job) => void;
  onCancel: () => void;
}

/** Asks for the job's deletion; another admin has to approve it. */
export function DeleteJobDialog({ job, onRequested, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      await jobsApi.remove(job.job_id);
      onRequested(job);
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
      confirmLabel="Request deletion"
      danger
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={cancel}
    >
      <p>
        You are asking to permanently delete <strong>{job?.title}</strong>, every resume uploaded for it and their
        scores.
      </p>
      <p className="muted">
        Another admin is emailed to approve it. The job stays live until they do; once approved, this cannot be
        undone.
      </p>
    </ConfirmDialog>
  );
}
