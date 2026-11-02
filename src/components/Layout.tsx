import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, isAdmin, logout } = useAuth();

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
