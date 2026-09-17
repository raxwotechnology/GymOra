import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../features/auth/context/AuthContext";
import { DashboardProvider } from "../../features/dashboard/context/DashboardContext";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <DashboardProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </DashboardProvider>
    </AuthProvider>
  );
}
