import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { approvalsApi } from "../api/approvals";
import { useAuth } from "../auth/AuthContext";
import { useAutoRefresh } from "../useAutoRefresh";

// The API's maximum page size; "200+" is never going to matter for a pending queue.
const MAX_PENDING = 200;

export function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const { pathname } = useLocation();
  const [toReview, setToReview] = useState(0);

  // Requests this admin can act on: refreshed on every navigation, after a decision, when
  // the tab comes back into view, and every 30 seconds.
  const refresh = useCallback(() => {
    if (!isAdmin) return;
    approvalsApi
      .list("pending", MAX_PENDING, 0)
      .then((requests) => setToReview(requests.filter((r) => r.can_review).length))
      .catch(() => {});
  }, [isAdmin]);
  useEffect(() => refresh(), [refresh, pathname]);
  useAutoRefresh(refresh, isAdmin);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/jobs" className="brand">
          Recruitment Portal
        </Link>
        <nav className="nav">
          <NavLink to="/jobs" end>
            Jobs
          </NavLink>
          {isAdmin && <NavLink to="/jobs/new">New job</NavLink>}
          <NavLink to="/resumes">Resumes</NavLink>
          {isAdmin && (
            <NavLink to="/approvals">
              Approvals
              {toReview > 0 && (
                <span className="nav-count" aria-label={`${toReview} waiting for you`}>
                  {toReview}
                </span>
              )}
            </NavLink>
          )}
        </nav>
        <div className="user-box">
          <span className="user-name">{user?.full_name}</span>
          <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          <button className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
