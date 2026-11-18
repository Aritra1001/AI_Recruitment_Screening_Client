import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import { Alert } from "../components/Alert";
import { JobForm } from "../components/JobForm";
import type { JobInput } from "../types";

export function JobCreatePage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: JobInput) {
    setBusy(true);
    setError(null);
    try {
      const job = await jobsApi.create(input);
      navigate(`/jobs/${job.job_id}`, {
        state: { flash: "Job sent to another admin for approval. Recruiters will see it once it's approved." },
      });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>New job</h1>
      <p className="muted">The job goes live once another admin approves it.</p>
      <Alert kind="error">{error}</Alert>
      <JobForm submitLabel="Submit for approval" busy={busy} onSubmit={handleSubmit} onCancel={() => navigate("/jobs")} />
    </>
  );
}
