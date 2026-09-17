import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../../features/auth/context/AuthContext";
import { roleToPath } from "../../features/auth/utils/roleToPath";
import RouteErrorBoundary from "../../components/layout/RouteErrorBoundary";

const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../../features/auth/pages/ForgotPasswordPage"));
const ChangePasswordPage = lazy(() => import("../../features/auth/pages/ChangePasswordPage"));
const SuperAdminDashboard = lazy(() => import("../../features/dashboard/super-admin/pages/SuperAdminDashboard"));
const OwnerDashboard = lazy(() => import("../../features/dashboard/owner/pages/OwnerDashboard"));
const CoachDashboard = lazy(() => import("../../features/dashboard/coach/pages/CoachDashboard"));
const MemberDashboard = lazy(() => import("../../features/dashboard/member/pages/MemberDashboard"));
const GetStartedPage = lazy(() => import("../../features/register/pages/GetStartedPage"));

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? (user.mustChangePassword ? "/change-password" : roleToPath(user.role)) : "/login"} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Loading…</div>}>
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<RouteErrorBoundary><LoginPage /></RouteErrorBoundary>} />
      <Route path="/forgot-password" element={<RouteErrorBoundary><ForgotPasswordPage /></RouteErrorBoundary>} />
      <Route path="/get-started" element={<RouteErrorBoundary><GetStartedPage /></RouteErrorBoundary>} />
      <Route
        path="/change-password"
        element={(
          <ProtectedRoute allowedRoles={["super-admin", "owner", "coach", "member"]}>
            <RouteErrorBoundary>
              <ChangePasswordPage />
            </RouteErrorBoundary>
          </ProtectedRoute>
        )}
      />

      <Route element={<AppLayout />}>
        <Route
          path="/super-admin"
          element={(
            <ProtectedRoute allowedRoles={["super-admin"]}>
              <RouteErrorBoundary>
                <SuperAdminDashboard />
              </RouteErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/owner"
          element={(
            <ProtectedRoute allowedRoles={["owner"]}>
              <RouteErrorBoundary>
                <OwnerDashboard />
              </RouteErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/coach"
          element={(
            <ProtectedRoute allowedRoles={["coach"]}>
              <RouteErrorBoundary>
                <CoachDashboard />
              </RouteErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/member"
          element={(
            <ProtectedRoute allowedRoles={["member"]}>
              <RouteErrorBoundary>
                <MemberDashboard />
              </RouteErrorBoundary>
            </ProtectedRoute>
          )}
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
    </Suspense>
  );
}
