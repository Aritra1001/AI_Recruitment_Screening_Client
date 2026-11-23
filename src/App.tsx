import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { ApprovalDetailPage } from "./pages/ApprovalDetailPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { JobCreatePage } from "./pages/JobCreatePage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { JobEditPage } from "./pages/JobEditPage";
import { JobsPage } from "./pages/JobsPage";
import { LoginPage } from "./pages/LoginPage";
import { ResumeDetailPage } from "./pages/ResumeDetailPage";
import { ResumesPage } from "./pages/ResumesPage";
import { ResumeUploadPage } from "./pages/ResumeUploadPage";
import { DomainsPage } from "./pages/DomainsPage";
import { ScoreComparisonPage } from "./pages/ScoreComparisonPage";
import { ScreeningDetailPage } from "./pages/ScreeningDetailPage";
import { ScreeningPage } from "./pages/ScreeningPage";
import { SignupPage } from "./pages/SignupPage";
import { ForbiddenPage, NotFoundPage } from "./pages/StatusPages";

/** Managers start at their screening queue; everyone else at the jobs. */
function Home() {
  const { hasRole } = useAuth();
  return <Navigate to={hasRole("manager") ? "/screening" : "/jobs"} replace />;
}

// UI-level RBAC: hides routes a role can't use. The API enforces the same rules server-side.
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route
          path="/jobs/new"
          element={
            <ProtectedRoute roles={["admin"]}>
              <JobCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route
          path="/jobs/:jobId/edit"
          element={
            <ProtectedRoute roles={["admin"]}>
              <JobEditPage />
            </ProtectedRoute>
          }
        />
        <Route path="/jobs/:jobId/scores/:resumeId" element={<ScoreComparisonPage />} />
        <Route path="/resumes" element={<ResumesPage />} />
        <Route
          path="/resumes/upload"
          element={
            <ProtectedRoute roles={["admin", "recruiter"]}>
              <ResumeUploadPage />
            </ProtectedRoute>
          }
        />
        <Route path="/resumes/:resumeId" element={<ResumeDetailPage />} />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/screening" element={<ScreeningPage />} />
        <Route path="/screening/:screeningId" element={<ScreeningDetailPage />} />
        <Route
          path="/domains"
          element={
            <ProtectedRoute roles={["admin"]}>
              <DomainsPage />
            </ProtectedRoute>
          }
        />
        {/* Not admin-only: a recruiter follows (and can withdraw) their own resume deletion here. */}
        <Route path="/approvals/:requestId" element={<ApprovalDetailPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
