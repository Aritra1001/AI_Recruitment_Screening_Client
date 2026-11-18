import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ACTION_LABELS, approvalsApi, type ApprovalFilter } from "../api/approvals";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { ApprovalStatusBadge } from "../components/ApprovalBadge";
import type { ApprovalRequest } from "../types";
import { useAutoRefresh } from "../useAutoRefresh";

const PAGE_SIZE = 20;
const TABS: { filter: ApprovalFilter; label: string }[] = [
  { filter: "pending", label: "Pending" },
  { filter: "all", label: "History" },
];

export function ApprovalsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<ApprovalFilter>("pending");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await approvalsApi.list(filter, PAGE_SIZE, page * PAGE_SIZE));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Quietly pick up requests other admins raise or decide.
  useAutoRefresh(() => {
    approvalsApi.list(filter, PAGE_SIZE, page * PAGE_SIZE).then(setRequests).catch(() => {});
  });

  function selectTab(next: ApprovalFilter) {
    setFilter(next);
    setPage(0);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Approvals</h1>
          <p className="muted">
            New jobs, job edits and deletions, and resume deletions only take effect once another admin approves them.
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
            onClick={() => selectTab(tab.filter)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Alert kind="error">{error}</Alert>

      {loading ? (
        <div className="page-status">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="card page-status">
          {filter === "pending" ? "Nothing is waiting for approval." : "No requests yet."}
        </div>
      ) : (
        <ul className="approval-list">
          {requests.map((r) => (
            <li key={r.request_id}>
              <Link to={`/approvals/${r.request_id}`} className="card approval-item">
                <div className="approval-item-main">
                  <span className="approval-action">{ACTION_LABELS[r.action]}</span>
                  <strong>{r.target_name}</strong>
                  <span className="muted">
                    {r.requester.user_id === user?.user_id ? "You" : r.requester.full_name} ·{" "}
                    {new Date(r.requested_at).toLocaleString()}
                  </span>
                </div>
                <div className="approval-item-side">
                  <ApprovalStatusBadge status={r.status} />
                  {r.can_review && <span className="review-cta">Review →</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="pager">
        <button className="btn" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>
          ← Previous
        </button>
        <span className="muted">Page {page + 1}</span>
        <button className="btn" disabled={requests.length < PAGE_SIZE || loading} onClick={() => setPage(page + 1)}>
          Next →
        </button>
      </div>
    </>
  );
}
