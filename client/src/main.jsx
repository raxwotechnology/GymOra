import React from "react";
import ReactDOM from "react-dom/client";
import * as XLSX from "xlsx";
import App from "./app/App";

window.__XLSX__ = XLSX;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
