import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { Alert } from "../components/Alert";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { JobForm } from "../components/JobForm";
import type { Job, JobInput } from "../types";

const FIELD_LABELS: Record<keyof JobInput, string> = {
  title: "Title",
  description: "Description",
  required_skills: "Required skills",
  preferred_skills: "Preferred skills",
  minimum_experience: "Minimum experience",
};

/** Only the fields that differ from the saved job, so the PATCH (and audit log) stays minimal. */
function diffJob(job: Job, input: JobInput): Partial<JobInput> {
  const saved: JobInput = {
    title: job.title,
    description: job.description,
    required_skills: job.required_skills ?? [],
    preferred_skills: job.preferred_skills ?? [],
    minimum_experience: job.minimum_experience,
  };
  const changes: Partial<JobInput> = {};
  for (const key of Object.keys(FIELD_LABELS) as (keyof JobInput)[]) {
    if (JSON.stringify(saved[key]) !== JSON.stringify(input[key])) {
      (changes as Record<string, unknown>)[key] = input[key];
    }
  }
  return changes;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(not set)";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "(none)";
  const text = String(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
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

  useEffect(() => {
    jobsApi.get(jobId).then(setJob).catch((e: Error) => setLoadError(e.message));
  }, [jobId]);

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
      navigate(`/jobs/${job!.job_id}`, { state: { flash: "Job updated." } });
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
      <JobForm
        initial={job}
        submitLabel="Save changes"
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/jobs/${job.job_id}`)}
      />

      <ConfirmDialog
        open={pending !== null}
        title="Save these changes?"
        confirmLabel="Yes, update job"
        busy={busy}
        error={saveError}
        onConfirm={confirmUpdate}
        onCancel={() => setPending(null)}
      >
        <p>
          You are about to update <strong>{job.title}</strong>:
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
                  <td className="diff-old">{formatValue(job[key])}</td>
                  <td className="diff-new">{formatValue(pending[key])}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </ConfirmDialog>
    </>
  );
}
