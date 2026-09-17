const express = require("express");
const { getDashboard } = require("../controllers/dashboard");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, getDashboard);

module.exports = router;
