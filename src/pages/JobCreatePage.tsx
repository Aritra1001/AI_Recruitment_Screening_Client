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
      navigate(`/jobs/${job.job_id}`, { state: { flash: "Job created." } });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>New job</h1>
      <Alert kind="error">{error}</Alert>
      <JobForm submitLabel="Create job" busy={busy} onSubmit={handleSubmit} onCancel={() => navigate("/jobs")} />
    </>
  );
}
