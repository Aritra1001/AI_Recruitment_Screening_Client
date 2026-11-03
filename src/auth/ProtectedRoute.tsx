import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "../types";
import { useAuth } from "./AuthContext";

interface Props {
  children: ReactNode;
  /** If given, the user must have one of these roles; otherwise any logged-in user may enter. */
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-status">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !hasRole(...roles)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
