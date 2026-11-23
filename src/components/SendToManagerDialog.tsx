import { useEffect, useState } from "react";
import { screeningsApi, SCREENING_CHANGED } from "../api/screenings";
import type { Job, Screening } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  job: Job;
  /** The resumes to send, with the name to show for each; null closes the dialog. */
  candidates: { resumeId: string; name: string }[] | null;
  onSent: (sent: Screening[]) => void;
  onCancel: () => void;
}

/** Confirm sending shortlisted resumes to the job's domain managers, with an optional note. */
export function SendToManagerDialog({ job, candidates, onSent, onCancel }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = candidates !== null && candidates.length > 0;

  useEffect(() => {
    if (!open) return;
    setNote("");
    setError(null);
  }, [open]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const sent = await screeningsApi.send(
        job.job_id,
        candidates!.map((c) => c.resumeId),
        note,
      );
      window.dispatchEvent(new Event(SCREENING_CHANGED));
      onSent(sent);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const count = candidates?.length ?? 0;
  const managers = job.domain ? `the ${job.domain.name} managers` : "the domain managers";
  return (
    <ConfirmDialog
      open={open}
      title={count === 1 ? "Send to the domain manager?" : `Send ${count} candidates to the domain manager?`}
      confirmLabel={count === 1 ? "Send" : `Send ${count}`}
      busy={busy}
      error={error}
      onConfirm={send}
      onCancel={onCancel}
    >
      <p>
        {count === 1 ? (
          <strong>{candidates![0].name}</strong>
        ) : (
          <>
            These candidates (
            {candidates
              ?.map((c) => c.name)
              .slice(0, 5)
              .join(", ")}
            {count > 5 && ` and ${count - 5} more`})
          </>
        )}{" "}
        will be sent to {managers}, who decide whether to interview {count === 1 ? "them" : "each one"}. They are
        emailed now, and you are emailed each decision. This can't be undone.
      </p>
      <label className="dialog-field">
        Note for the manager <small className="muted">(optional)</small>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Why these candidates stand out, availability, notice period…"
        />
      </label>
    </ConfirmDialog>
  );
}
