const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const systemRoutes = require("./routes/systemRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const profileRoutes = require("./routes/profileRoutes");
const payhereRoutes = require("./routes/payhereRoutes");
const publicRoutes = require("./routes/publicRoutes");

dotenv.config();

const app = express();

const allowedOrigins = ["http://localhost:5173", "https://gym-ora.netlify.app"];
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",").forEach(url => {
    let trimmed = url.trim();
    if (trimmed) {
      if (trimmed.endsWith("/")) {
        trimmed = trimmed.slice(0, -1);
      }
      if (!allowedOrigins.includes(trimmed)) {
        allowedOrigins.push(trimmed);
      }
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "production") {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[mongodb] Connection error:", err.message);
    next();
  }
});

const uploadsDir = path.join(__dirname, "..", "uploads");
if (fs.existsSync(uploadsDir)) {
  app.use("/uploads", express.static(uploadsDir));
}

app.use("/api", systemRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payhere", payhereRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "Gymora API is running" });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("[Unhandled Error]:", err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

module.exports = app;

