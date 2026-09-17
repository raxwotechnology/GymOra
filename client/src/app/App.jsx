import React from "react";
import AppProviders from "./providers/AppProviders";
import AppRoutes from "./routes/AppRoutes";
import "../styles.css";

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
