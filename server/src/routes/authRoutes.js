const express = require("express");
const {
  login,
  changePassword,
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
  listRegistrationGyms,
  registerMember
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  loginSchema,
  changePasswordSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResetSchema,
  registerMemberSchema,
} = require("../schemas/authSchemas");

const router = express.Router();

router.post("/login", validate(loginSchema), login);
router.post("/forgot-password/request-otp", validate(forgotPasswordRequestSchema), requestForgotPasswordOtp);
router.post("/forgot-password/reset", validate(forgotPasswordResetSchema), resetPasswordWithOtp);
router.patch("/change-password", requireAuth, validate(changePasswordSchema), changePassword);
router.get("/registration-gyms", listRegistrationGyms);
router.post("/register-member", validate(registerMemberSchema), registerMember);

module.exports = router;
