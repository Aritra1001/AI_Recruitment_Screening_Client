import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <div className="card status-card">
      <h1>Access denied</h1>
      <p className="muted">Your role does not allow this action. Only admins can create, edit or delete jobs.</p>
      <Link to="/jobs" className="btn btn-primary">
        Back to jobs
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="card status-card">
      <h1>Page not found</h1>
      <Link to="/jobs" className="btn btn-primary">
        Back to jobs
      </Link>
    </div>
  );
}
