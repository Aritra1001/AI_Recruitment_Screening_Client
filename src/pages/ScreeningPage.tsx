import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { screeningsApi, type ScreeningFilter } from "../api/screenings";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { ScreeningStatusBadge } from "../components/ScreeningBadge";
import type { Screening } from "../types";
import { useAutoRefresh } from "../useAutoRefresh";

const TABS: { filter: ScreeningFilter; label: string }[] = [
  { filter: "pending", label: "Waiting for a decision" },
  { filter: "interview", label: "Interview" },
  { filter: "rejected", label: "Rejected" },
  { filter: "all", label: "All" },
];

const candidateName = (s: Screening) => s.resume.candidate_name || s.resume.original_filename;

/** Candidates recruiters sent to domain managers. Managers see their domains' jobs and decide
 * here; admins and recruiters follow the decisions. */
export function ScreeningPage() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole("manager");
  const [filter, setFilter] = useState<ScreeningFilter>("pending");
  const [items, setItems] = useState<Screening[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      screeningsApi
        .list({ status: filter })
        .then(setItems)
        .catch((e: Error) => setError(e.message)),
    [filter],
  );
  useEffect(() => {
    setItems(null);
    setError(null);
    load();
  }, [load]);
  useAutoRefresh(() => {
    load();
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Screening</h1>
          <p className="muted">
            {isManager
              ? "Candidates recruiters sent for your domains' jobs. Decide who gets an interview."
              : "Candidates sent to the domain managers, and what they decided."}
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.filter}
            role="tab"
            aria-selected={filter === tab.filter}
            className={`tab ${filter === tab.filter ? "active" : ""}`}
            onClick={() => setFilter(tab.filter)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Alert kind="error">{error}</Alert>

      <div className="card table-card">
        {items === null ? (
          <div className="page-status">{error ? "Couldn't load candidates." : "Loading…"}</div>
        ) : items.length === 0 ? (
          <div className="page-status">
            {filter === "pending"
              ? isManager
                ? "Nothing is waiting for you."
                : "No candidates are waiting for a manager."
              : "No candidates here yet."}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Match</th>
                <th>Sent by</th>
                <th>Status</th>
                <th className="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.screening_id}>
                  <td>
                    <Link to={`/screening/${s.screening_id}`} className="job-title">
                      {candidateName(s)}
                    </Link>
                    {s.resume.candidate_name && <div className="muted cell-sub">{s.resume.original_filename}</div>}
                  </td>
                  <td>
                    <Link to={`/jobs/${s.job.job_id}`}>{s.job.title}</Link>
                    {s.domain && <div className="muted cell-sub">{s.domain.name}</div>}
                  </td>
                  <td>
                    {s.score_at_submission.toFixed(0)} <span className="muted">/ min {s.min_score_at_submission}</span>
                  </td>
                  <td>
                    {s.sender.user_id === user?.user_id ? "You" : s.sender.full_name}
                    <div className="muted cell-sub">{new Date(s.sent_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <ScreeningStatusBadge status={s.status} />
                    {s.decider && <div className="muted cell-sub">by {s.decider.full_name}</div>}
                  </td>
                  <td className="actions-col">
                    <Link to={`/screening/${s.screening_id}`} className={`btn btn-sm ${s.can_decide ? "btn-primary" : ""}`}>
                      {s.can_decide ? "Decide" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
