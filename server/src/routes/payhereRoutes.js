const express = require("express");
const router = express.Router();
const { requireAuth, allowRoles } = require("../middleware/auth");
const { initiateGymPayment, handlePayhereNotify } = require("../controllers/payhereController");

router.post("/initiate-gym-payment", requireAuth, allowRoles("owner", "super-admin"), initiateGymPayment);

// PUBLIC — no auth. PayHere sends IPN as x-www-form-urlencoded, not JSON
router.post("/notify", express.urlencoded({ extended: false }), handlePayhereNotify);

module.exports = router;
