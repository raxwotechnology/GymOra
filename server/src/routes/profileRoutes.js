const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { updateMyProfile, updateMyWorkoutProgress, markNotificationsRead } = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads", "profile-images");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${req.user._id}-${Date.now()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  }
});

router.patch("/me", requireAuth, upload.single("profileImage"), updateMyProfile);
router.patch("/me/workout-progress", requireAuth, updateMyWorkoutProgress);
router.patch("/me/notifications/read", requireAuth, markNotificationsRead);

module.exports = router;
