const express = require("express");
const SystemSettings = require("../models/SystemSettings");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "gymora-api",
    time: new Date().toISOString()
  });
});

// Public endpoint — no auth required — used by login page to get branding
router.get("/settings", async (_req, res) => {
  try {
    const settings = await SystemSettings.getSingleton();
    return res.json({
      systemName: settings.systemName || "Gymora",
      tagline: settings.tagline || "Next Level Fitness ERP",
      logoUrl: settings.logoUrl || "/gymora-logo.png",
      heroImageUrl: settings.heroImageUrl || "",
      primaryColor: settings.primaryColor || "#2563eb",
      privacyPolicy: settings.privacyPolicy || "",
      termsOfUse: settings.termsOfUse || "",
      helpCenter: settings.helpCenter || "",
      supportEmail: settings.supportEmail || "support@gymora.io",
      contactPhone: settings.contactPhone || "",
      contactNumbers: settings.contactNumbers || [],
      address: settings.address || ""
    });
  } catch {
    return res.json({
      systemName: "Gymora",
      tagline: "Next Level Fitness ERP",
      logoUrl: "/gymora-logo.png",
      heroImageUrl: "",
      primaryColor: "#2563eb"
    });
  }
});

module.exports = router;
