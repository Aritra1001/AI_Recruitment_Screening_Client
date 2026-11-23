import { domainName } from "./api/domains";
import type { Domain, JobInput } from "./types";

export const FIELD_LABELS: Record<keyof JobInput, string> = {
  title: "Title",
  description: "Description",
  required_skills: "Required skills",
  preferred_skills: "Preferred skills",
  minimum_experience: "Minimum experience",
  domain_id: "Domain",
  shortlist_min_score: "Minimum score to shortlist",
};

/** One-line display of a job field's value; long text is cut unless `full`. A domain_id is
 * shown by name, looked up in `domains`. */
export function formatField(field: keyof JobInput, value: unknown, domains: Domain[] | null, full = false): string {
  if (field === "domain_id") return domainName(domains, value);
  if (field === "shortlist_min_score" && value != null) return `${value} / 100`;
  return formatValue(value, full);
}

/** One-line display of a value; long text is cut unless `full`. */
export function formatValue(value: unknown, full = false): string {
  if (value === null || value === undefined) return "(not set)";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "(none)";
  const text = String(value);
  return !full && text.length > 140 ? `${text.slice(0, 140)}…` : text;
}
