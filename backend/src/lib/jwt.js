const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../config");

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, phone: user.phone },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );
}

function signRefresh(user) {
  return jwt.sign({ sub: user.id, typ: "refresh" }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function verifyAccess(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

function verifyRefresh(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    membershipLevel: user.membershipLevel,
    referralCode: user.referralCode,
    profileCompleted: user.profileCompleted,
    loginStreak: user.loginStreak,
    createdAt: user.createdAt,
    isActive: user.isActive !== false,
    customerNumber: user.customerNumber,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    preferredPayment: user.preferredPayment,
    adminNotes: user.adminNotes,
    blacklisted: Boolean(user.blacklisted),
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt,
    tags: user.tags || [],
    segment: user.segment || "",
    notesLog: user.notesLog || [],
  };
}

module.exports = {
  signAccess,
  signRefresh,
  hashToken,
  verifyAccess,
  verifyRefresh,
  publicUser,
};
