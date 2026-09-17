const jwt = require("jsonwebtoken");

const DEFAULT_EXPIRY = "7d";
const REMEMBER_ME_EXPIRY = "30d";

function getJwtSecret() {
  return process.env.JWT_SECRET || "fitnesshub-dev-secret";
}

function signAuthToken(user, options = {}) {
  const expiresIn = options.expiresIn || (options.rememberMe ? REMEMBER_ME_EXPIRY : DEFAULT_EXPIRY);

  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      gymId: user.gym ? String(user.gym) : null
    },
    getJwtSecret(),
    { expiresIn }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signAuthToken,
  verifyAuthToken
};
