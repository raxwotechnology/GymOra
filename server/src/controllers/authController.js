const Gym = require("../models/Gym");
const User = require("../models/User");
const crypto = require("crypto");
const { hashPassword, verifyPassword, isLegacyPasswordHash } = require("../utils/password");
const { signAuthToken } = require("../utils/token");
const { isEmailConfigured, sendMail } = require("../utils/email");

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function generateOtp(length = 6) {
  let otp = "";
  while (otp.length < length) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

function buildOtpEmail({ otp, gymName, ownerName, ownerEmail, memberName }) {
  const senderName = ownerName || gymName || "Your gym owner";
  const gymLabel = gymName || "your gym";
  const introName = memberName || "there";
  const subject = `${gymLabel} password reset code`;
  const text = [
    `Hi ${introName},`,
    "",
    `${senderName} sent you a password reset code for your ${gymLabel} FitnessHub account.`,
    `Your one-time password is: ${otp}`,
    "This code will expire in 10 minutes.",
    "",
    "If you did not request this reset, you can ignore this email.",
    ownerEmail ? `Reply to ${ownerEmail} if you need help.` : ""
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:24px;">
        <p style="margin:0 0 12px;color:#334155;">Hi ${introName},</p>
        <p style="margin:0 0 16px;color:#334155;">
          ${senderName} sent you a password reset code for your ${gymLabel} FitnessHub account.
        </p>
        <div style="margin:20px 0;padding:18px;border-radius:16px;background:#0f172a;color:#ffffff;text-align:center;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.72;">One-Time Password</div>
          <div style="font-size:34px;font-weight:700;letter-spacing:0.24em;margin-top:8px;">${otp}</div>
        </div>
        <p style="margin:0 0 8px;color:#334155;">This code will expire in 10 minutes.</p>
        <p style="margin:0;color:#64748b;font-size:13px;">If you did not request this reset, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

function formatAuthUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    profileImageUrl: user.profileImageUrl || "",
    gymId: user.gym,
    coachProfileId: user.coachProfile,
    memberProfileId: user.memberProfile,
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: user.lastLoginAt || null
  };
}

async function login(req, res) {
  const { email, password, rememberMe = false } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.status === "pending") {
    return res.status(403).json({ message: "Your registration is pending owner approval." });
  }

  if (user.status === "rejected") {
    return res.status(403).json({ message: "Your registration request was rejected. Please contact the gym owner." });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: "Your account is not active right now." });
  }

  if (user.role !== "super-admin" && user.gym) {
    const gym = await Gym.findById(user.gym).select("status").lean();
    if (gym && gym.status === "suspended") {
      return res.status(403).json({ message: "Your gym's subscription has expired or been suspended. Please upgrade to continue." });
    }
  }

  const updates = {
    lastLoginAt: new Date()
  };

  if (isLegacyPasswordHash(user.passwordHash)) {
    updates.passwordHash = hashPassword(password);
    updates.passwordUpdatedAt = new Date();
  }

  await User.findByIdAndUpdate(user._id, updates);
  const nextUser = await User.findById(user._id).lean();

  return res.json({
    token: signAuthToken(nextUser, { rememberMe: Boolean(rememberMe) }),
    user: formatAuthUser(nextUser)
  });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword, rememberMe = false } = req.body || {};
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "currentPassword, newPassword, and confirmPassword are required" });
  }

  if (!verifyPassword(currentPassword, authUser.passwordHash)) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match" });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters long" });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different from the current password" });
  }

  const updatedUser = await User.findByIdAndUpdate(
    authUser._id,
    {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      passwordUpdatedAt: new Date()
    },
    { new: true }
  ).lean();

  return res.json({
    message: "Password updated successfully",
    token: signAuthToken(updatedUser, { rememberMe: Boolean(rememberMe) }),
    user: formatAuthUser(updatedUser)
  });
}

async function requestForgotPasswordOtp(req, res) {
  const normalizedEmail = String(req.body?.email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  const genericResponse = {
    message: "If a matching active coach or member account exists, an OTP has been sent to the registered email."
  };

  const user = await User.findOne({
    email: normalizedEmail,
    role: { $in: ["coach", "member"] },
    status: "active"
  });

  if (!user) {
    return res.json(genericResponse);
  }

  const gym = user.gym ? await Gym.findById(user.gym).select("name ownerName ownerEmail").lean() : null;
  if (!gym) {
    return res.status(400).json({ message: "This account is not linked to a gym." });
  }

  if (!isEmailConfigured()) {
    return res.status(503).json({ message: "OTP email sending is not configured on the server." });
  }

  const otp = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const ownerDisplay = gym.ownerName || gym.name || "Gym Owner";
  const ownerMailbox = gym.ownerEmail || "";
  const mail = buildOtpEmail({
    otp,
    gymName: gym.name,
    ownerName: ownerDisplay,
    ownerEmail: ownerMailbox,
    memberName: user.name
  });

  await User.findByIdAndUpdate(user._id, {
    passwordResetOtpHash: hashOtp(otp),
    passwordResetOtpExpiresAt: expiresAt,
    passwordResetOtpRequestedAt: now
  });

  try {
    await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      from: ownerMailbox ? `"${ownerDisplay}" <${ownerMailbox}>` : undefined,
      replyTo: ownerMailbox || undefined
    });
  } catch (error) {
    console.error("[auth] Failed to send forgot-password OTP", error);
    await User.findByIdAndUpdate(user._id, {
      passwordResetOtpHash: "",
      passwordResetOtpExpiresAt: null,
      passwordResetOtpRequestedAt: null
    });
    return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
  }

  return res.json(genericResponse);
}

async function resetPasswordWithOtp(req, res) {
  const { email, otp, newPassword, confirmPassword } = req.body || {};
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!normalizedEmail || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "email, otp, newPassword, and confirmPassword are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match" });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters long" });
  }

  const user = await User.findOne({
    email: normalizedEmail,
    role: { $in: ["coach", "member"] }
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid OTP or email" });
  }

  if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
    return res.status(400).json({ message: "No active OTP request was found for this account" });
  }

  if (new Date(user.passwordResetOtpExpiresAt).getTime() < Date.now()) {
    return res.status(400).json({ message: "This OTP has expired. Request a new code and try again." });
  }

  if (hashOtp(otp) !== user.passwordResetOtpHash) {
    return res.status(400).json({ message: "Invalid OTP or email" });
  }

  user.passwordHash = hashPassword(newPassword);
  user.mustChangePassword = false;
  user.passwordUpdatedAt = new Date();
  user.passwordResetOtpHash = "";
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetOtpRequestedAt = null;
  await user.save();

  return res.json({ message: "Password reset successfully. You can now sign in." });
}

async function listRegistrationGyms(_req, res) {
  const gyms = await Gym.find({ status: { $in: ["active", "trial"] } })
    .sort({ name: 1 })
    .select("_id name location ownerName")
    .lean();

  return res.json({
    gyms: gyms.map((gym) => ({
      id: gym._id,
      name: gym.name,
      location: gym.location,
      ownerName: gym.ownerName
    }))
  });
}

async function registerMember(req, res) {
  const { name, email, password, confirmPassword, phone, goal, gymId } = req.body || {};

  if (!name || !email || !password || !confirmPassword || !gymId) {
    return res.status(400).json({ message: "Name, email, password, confirmPassword, and gymId are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  const gym = await Gym.findById(gymId).lean();
  if (!gym || !["active", "trial"].includes(gym.status)) {
    return res.status(404).json({ message: "Selected gym is not available for registration" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return res.status(400).json({ message: "An account with that email already exists" });
  }

  await User.create({
    name,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: "member",
    status: "pending",
    phone: phone || "",
    requestedGoal: goal || "",
    gym: gym._id,
    coachProfile: null,
    memberProfile: null
  });

  return res.status(201).json({
    message: "Registration submitted. Your gym owner must approve your account before you can log in."
  });
}

module.exports = {
  login,
  changePassword,
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
  listRegistrationGyms,
  registerMember,
  formatAuthUser
};
