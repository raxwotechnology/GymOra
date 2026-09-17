const router = require("express").Router();
const { getPublicPlans, registerTrial, initiateRegistration, getRegistrationStatus } = require("../controllers/publicController");

router.get("/plans", getPublicPlans);
router.post("/register-trial", registerTrial);
router.post("/initiate-registration", initiateRegistration);
router.get("/registration-status/:orderId", getRegistrationStatus);

module.exports = router;
