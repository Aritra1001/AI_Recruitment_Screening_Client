import { RECOMMENDATION_LABELS, formatScore, scoreBand } from "../api/scores";
import type { ResumeScore } from "../types";

/** The recommendation once scored, otherwise the scoring status. */
export function ScoreBadge({ score }: { score: Pick<ResumeScore, "status" | "recommendation"> }) {
  if (score.status === "scoring") return <span className="status-badge status-extracting">Scoring…</span>;
  if (score.status === "failed" || !score.recommendation) {
    return <span className="status-badge status-failed">Scoring failed</span>;
  }
  return (
    <span className={`status-badge rec-${score.recommendation}`}>{RECOMMENDATION_LABELS[score.recommendation]}</span>
  );
}

/** A 0-100 score as a number and a bar coloured by recommendation band. */
export function ScoreMeter({ value, label }: { value: number; label?: string }) {
  const width = Math.min(Math.max(value, 0), 100);
  return (
    <span className="score-meter" aria-label={`${label ?? "Score"}: ${formatScore(value)} out of 100`}>
      <span className="score-meter-value">{formatScore(value)}</span>
      <span className="score-meter-track">
        <span className={`score-meter-bar bar-${scoreBand(value)}`} style={{ width: `${width}%` }} />
      </span>
    </span>
  );
}
