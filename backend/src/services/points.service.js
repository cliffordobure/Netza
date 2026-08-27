const { User, PointsRule, PointsTransaction, Order, idOf } = require("../models");
const { membershipFromEarned } = require("../lib/utils");

async function getRule(key) {
  return PointsRule.findOne({ key, isActive: true });
}

async function creditPoints(userId, type, points, description, reference = "", extra = {}) {
  if (!points) return null;
  await User.updateOne({ _id: userId }, { $inc: { pointsBalance: points } });
  const txn = await PointsTransaction.create({
    user: userId,
    type,
    points,
    description,
    reference,
    status: extra.status || (String(type).toUpperCase() === "EXPIRE" ? "EXPIRED" : "COMPLETED"),
    expiresAt: extra.expiresAt,
  });
  const earned = await PointsTransaction.aggregate([
    { $match: { user: txn.user, points: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);
  await User.updateOne(
    { _id: userId },
    { membershipLevel: membershipFromEarned(earned[0]?.total || 0) }
  );
  return txn;
}

async function pointsFromPurchase(totalKes) {
  const rule = await getRule("PURCHASE");
  if (!rule) return 0;
  let kesPerPoint = 100;
  try {
    const cfg = JSON.parse(rule.configJson || "{}");
    if (cfg.kesPerPoint) kesPerPoint = Number(cfg.kesPerPoint);
  } catch {
    /* ignore */
  }
  return Math.floor(totalKes / kesPerPoint) * rule.points;
}

async function awardPurchasePoints(userId, order) {
  const pts = await pointsFromPurchase(order.totalKes);
  const orderId = idOf(order);
  if (pts > 0) {
    await creditPoints(userId, "PURCHASE", pts, `Purchase points for order ${order.orderNumber}`, orderId);
  }
  const priorPaid = await Order.countDocuments({
    user: userId,
    paymentStatus: "COMPLETED",
    _id: { $ne: order._id },
  });
  let firstPts = 0;
  if (priorPaid === 0) {
    const first = await getRule("FIRST_PURCHASE");
    if (first) {
      firstPts = first.points;
      await creditPoints(userId, "FIRST_PURCHASE", first.points, "First purchase bonus", orderId);
    }
  }
  return pts + firstPts;
}

module.exports = { getRule, creditPoints, pointsFromPurchase, awardPurchasePoints };
