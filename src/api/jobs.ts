import type { Job, JobInput } from "../types";
import { apiRequest } from "./client";

export const jobsApi = {
  list: (limit: number, offset: number) => apiRequest<Job[]>(`/jobs?limit=${limit}&offset=${offset}`),
  get: (id: string) => apiRequest<Job>(`/jobs/${id}`),
  create: (job: JobInput) => apiRequest<Job>("/jobs", { method: "POST", body: JSON.stringify(job) }),
  update: (id: string, changes: Partial<JobInput>) =>
    apiRequest<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
  remove: (id: string) => apiRequest<void>(`/jobs/${id}`, { method: "DELETE" }),
};
