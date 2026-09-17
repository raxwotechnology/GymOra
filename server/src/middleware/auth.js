const User = require("../models/User");
const Gym = require("../models/Gym");
const { verifyAuthToken } = require("../utils/token");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub).lean();

    if (!user) {
      return res.status(401).json({ message: "User not found for this session" });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({ message: "This account is not active." });
    }

    if (user.role !== "super-admin" && user.gym) {
      const gym = await Gym.findById(user.gym).select("status").lean();
      if (gym && gym.status === "suspended") {
        return res.status(403).json({ message: "Your gym's subscription has expired or been suspended. Please upgrade to continue." });
      }
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Session expired or invalid" });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have access to this resource" });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  allowRoles
};
