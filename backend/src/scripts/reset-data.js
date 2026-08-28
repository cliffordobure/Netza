/**
 * Wipe all test/demo data and keep a single admin account.
 * Run: node src/scripts/reset-data.js
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDb, disconnectDb } = require("../lib/db");
const {
  User,
  RefreshToken,
  Address,
  Cart,
  Category,
  Brand,
  AttributeGroup,
  Attribute,
  Product,
  Order,
  Review,
  PointsTransaction,
  PointsRule,
  FlashDrop,
  Setting,
  Competition,
  Quote,
  Banner,
} = require("../models");
const { normalizeEmail, normalizePhone } = require("../lib/identity");

const ADMIN = {
  firstName: "Francis",
  lastName: "Admin",
  email: "admin@netza.co.ke",
  phone: "0700000000",
  password: "Admin@123",
};

async function wipeAll() {
  await Promise.all([
    RefreshToken.deleteMany({}),
    PointsTransaction.deleteMany({}),
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Address.deleteMany({}),
    Review.deleteMany({}),
    Quote.deleteMany({}),
    Banner.deleteMany({}),
    Product.deleteMany({}),
    FlashDrop.deleteMany({}),
    Competition.deleteMany({}),
    Attribute.deleteMany({}),
    AttributeGroup.deleteMany({}),
    Brand.deleteMany({}),
    Category.deleteMany({}),
    PointsRule.deleteMany({}),
    Setting.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function createAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN.password, 10);
  const user = await User.create({
    firstName: ADMIN.firstName,
    lastName: ADMIN.lastName,
    email: normalizeEmail(ADMIN.email),
    phone: normalizePhone(ADMIN.phone),
    passwordHash,
    role: "SUPER_ADMIN",
    referralCode: "NETZAADMIN",
    profileCompleted: true,
    membershipLevel: "PLATINUM",
    isActive: true,
  });
  await Cart.create({ user: user._id, items: [] });
  await Setting.insertMany([
    { key: "currency", value: "KES" },
    { key: "country", value: "KE" },
    { key: "supportPhone", value: "+254700000000" },
    { key: "pointsKesPerPoint", value: "10" },
  ]);
  await PointsRule.insertMany([
    {
      key: "PURCHASE",
      name: "Purchase Points",
      points: 1,
      ruleType: "purchase",
      trigger: "amount_spent",
      conditionValue: "100",
      limit: "none",
      priority: 1,
      isActive: true,
      description: "1 NETZA Point for every KSh 100 spent.",
      configJson: JSON.stringify({ kesPerPoint: 100 }),
    },
    {
      key: "WELCOME",
      name: "Welcome Bonus",
      points: 50,
      ruleType: "special",
      trigger: "signup",
      limit: "once",
      priority: 2,
      isActive: true,
      description: "Welcome points for new customer accounts.",
    },
  ]);
  return user;
}

async function resetToAdminOnly() {
  console.log("Wiping all data…");
  await wipeAll();
  const admin = await createAdmin();
  console.log("Done. Only admin remains.");
  console.log(`Admin login: ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`Admin phone: ${ADMIN.phone} / ${ADMIN.password}`);
  console.log(`Admin id: ${admin.id}`);
  return admin;
}

if (require.main === module) {
  connectDb()
    .then(resetToAdminOnly)
    .then(disconnectDb)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { resetToAdminOnly, wipeAll, createAdmin };
