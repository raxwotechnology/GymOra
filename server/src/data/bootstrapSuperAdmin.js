const User = require("../models/User");
const { hashPassword, generateTemporaryPassword } = require("../utils/password");

function getBootstrapSuperAdminConfig() {
  const passwordFromEnv = String(process.env.SUPERADMIN_PASSWORD || "").trim();
  const generatedPassword = generateTemporaryPassword();

  return {
    name: process.env.SUPERADMIN_NAME || "Platform Administrator",
    email: String(process.env.SUPERADMIN_EMAIL || "admin@fitnesshub.local").toLowerCase().trim(),
    password: passwordFromEnv || generatedPassword,
    generatedPassword: passwordFromEnv ? "" : generatedPassword
  };
}

async function bootstrapSuperAdmin() {
  const config = getBootstrapSuperAdminConfig();
  const existing = await User.findOne({ role: "super-admin" }).lean();

  if (existing) {
    return { created: false, email: existing.email };
  }

  await User.create({
    name: config.name,
    email: config.email,
    passwordHash: hashPassword(config.password),
    role: "super-admin",
    status: "active",
    phone: "",
    bio: "",
    title: "Super Admin",
    profileImageUrl: "",
    requestedGoal: "",
    gym: null,
    coachProfile: null,
    memberProfile: null,
    mustChangePassword: true,
    passwordUpdatedAt: new Date()
  });

  return {
    created: true,
    email: config.email,
    temporaryPassword: config.generatedPassword || config.password
  };
}

module.exports = bootstrapSuperAdmin;
