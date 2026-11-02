import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { JobCreatePage } from "./pages/JobCreatePage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { JobEditPage } from "./pages/JobEditPage";
import { JobsPage } from "./pages/JobsPage";
import { LoginPage } from "./pages/LoginPage";
import { ResumeDetailPage } from "./pages/ResumeDetailPage";
import { ResumesPage } from "./pages/ResumesPage";
import { ResumeUploadPage } from "./pages/ResumeUploadPage";
import { SignupPage } from "./pages/SignupPage";
import { ForbiddenPage, NotFoundPage } from "./pages/StatusPages";

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
        <Route index element={<Navigate to="/jobs" replace />} />
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
        <Route path="/resumes" element={<ResumesPage />} />
        <Route path="/resumes/upload" element={<ResumeUploadPage />} />
        <Route path="/resumes/:resumeId" element={<ResumeDetailPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
