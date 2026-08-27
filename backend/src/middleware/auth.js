const { verifyAccess, publicUser } = require("../lib/jwt");
const { User } = require("../models");

function auth(required = true) {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const payload = verifyAccess(token);
      const user = await User.findById(payload.sub);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid session" });
      }
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

const staffRoles = [
  "SUPER_ADMIN",
  "ADMIN",
  "INVENTORY_MANAGER",
  "SALES_MANAGER",
  "CUSTOMER_SUPPORT",
  "DELIVERY_MANAGER",
];

function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Authentication required" });
  if (!staffRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Staff access required" });
  }
  next();
}

function me(req) {
  return publicUser(req.user);
}

module.exports = { auth, requireRoles, requireStaff, staffRoles, me };
