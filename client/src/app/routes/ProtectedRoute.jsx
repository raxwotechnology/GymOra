import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { roleToPath } from "../../features/auth/utils/roleToPath";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleToPath(user.role)} replace />;
  }

  return children;
}
