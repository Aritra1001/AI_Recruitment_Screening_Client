import type { JobInput } from "./types";

export const FIELD_LABELS: Record<keyof JobInput, string> = {
  title: "Title",
  description: "Description",
  required_skills: "Required skills",
  preferred_skills: "Preferred skills",
  minimum_experience: "Minimum experience",
};

/** One-line display of a job field's value; long text is cut unless `full`. */
export function formatValue(value: unknown, full = false): string {
  if (value === null || value === undefined) return "(not set)";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "(none)";
  const text = String(value);
  return !full && text.length > 140 ? `${text.slice(0, 140)}…` : text;
}
