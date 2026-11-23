import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { Alert } from "../components/Alert";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { JobForm } from "../components/JobForm";
import { PendingNotice } from "../components/PendingNotice";
import { useDomains } from "../api/domains";
import { FIELD_LABELS, formatField } from "../jobFields";
import type { Job, JobInput } from "../types";
import { showIfGone, useAutoRefresh } from "../useAutoRefresh";

function savedInput(job: Job): JobInput {
  return {
    title: job.title,
    description: job.description,
    required_skills: job.required_skills ?? [],
    preferred_skills: job.preferred_skills ?? [],
    minimum_experience: job.minimum_experience,
    domain_id: job.domain?.domain_id ?? null,
    shortlist_min_score: job.shortlist_min_score,
  };
}

/** Only the fields that differ from the saved job, so the PATCH (and audit log) stays minimal. */
function diffJob(job: Job, input: JobInput): Partial<JobInput> {
  const saved = savedInput(job);
  const changes: Partial<JobInput> = {};
  for (const key of Object.keys(FIELD_LABELS) as (keyof JobInput)[]) {
    if (JSON.stringify(saved[key]) !== JSON.stringify(input[key])) {
      (changes as Record<string, unknown>)[key] = input[key];
    }
  }
  return changes;
}

export function JobEditPage() {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Partial<JobInput> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const domains = useDomains();

  useEffect(() => {
    jobsApi.get(jobId).then(setJob).catch((e: Error) => setLoadError(e.message));
  }, [jobId]);

  // The form opens once another admin decides the pending request.
  useAutoRefresh(
    () => jobsApi.get(jobId).then(setJob).catch(showIfGone(setLoadError)),
    !!job?.approval?.pending,
  );

  if (loadError) return <Alert kind="error">{loadError}</Alert>;
  if (!job) return <div className="page-status">Loading…</div>;

  function handleSubmit(input: JobInput) {
    const changes = diffJob(job!, input);
    if (Object.keys(changes).length === 0) {
      setNotice("Nothing to save: no fields were changed.");
      return;
    }
    setNotice(null);
    setSaveError(null);
    setPending(changes); // opens the confirmation dialog
  }

  async function confirmUpdate() {
    if (!pending) return;
    setBusy(true);
    setSaveError(null);
    try {
      await jobsApi.update(job!.job_id, pending);
      navigate(`/jobs/${job!.job_id}`, {
        state: { flash: "Changes sent to another admin for approval. They go live once approved." },
      });
    } catch (e) {
      setSaveError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Edit job</h1>
      <Alert kind="info" onClose={() => setNotice(null)}>
        {notice}
      </Alert>
      {job.approval?.pending ? (
        // Another change can't be submitted until this one is decided (the API refuses it too).
        <PendingNotice pending={job.approval.pending} />
      ) : (
        <JobForm
          initial={job}
          submitLabel="Submit for approval"
          busy={busy}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/jobs/${job.job_id}`)}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Submit these changes?"
        confirmLabel="Submit for approval"
        busy={busy}
        error={saveError}
        onConfirm={confirmUpdate}
        onCancel={() => setPending(null)}
      >
        <p>
          You are asking to update <strong>{job.title}</strong>. Another admin is emailed to approve it; until then
          everyone keeps seeing the current version.
        </p>
        <table className="diff-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Current</th>
              <th>New</th>
            </tr>
          </thead>
          <tbody>
            {pending &&
              (Object.keys(pending) as (keyof JobInput)[]).map((key) => (
                <tr key={key}>
                  <td>{FIELD_LABELS[key]}</td>
                  <td className="diff-old">{formatField(key, savedInput(job)[key], domains)}</td>
                  <td className="diff-new">{formatField(key, pending[key], domains)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </ConfirmDialog>
    </>
  );
}
