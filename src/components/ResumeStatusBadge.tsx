import type { ResumeStatus } from "../types";

const LABELS: Record<ResumeStatus, string> = {
  uploaded: "Not extracted",
  extracting: "Extracting…",
  extracted: "Extracted",
  failed: "Extraction failed",
};

export function ResumeStatusBadge({ status }: { status: ResumeStatus }) {
  return <span className={`status-badge status-${status}`}>{LABELS[status] ?? status}</span>;
}
