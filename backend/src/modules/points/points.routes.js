const { Router } = require("express");
const { z } = require("zod");
    const { User, PointsTransaction, PointsRule, Review, Competition } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { creditPoints } = require("../../services/points.service");

const router = Router();
router.use(auth());

const REWARDS = {
  OFF100: { points: 1000, description: "KSh 100 Discount Coupon" },
  OFF250: { points: 2500, description: "KSh 250 Discount Coupon" },
  OFF500: { points: 5000, description: "KSh 500 Discount Coupon" },
  CAP: { points: 3000, description: "TAJIRA Cap merchandise" },
};

router.get(
  "/wallet",
  asyncHandler(async (req, res) => {
    const earned = await PointsTransaction.aggregate([
      { $match: { user: req.user._id, points: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const txns = await PointsTransaction.find({ user: req.user._id }).select("type points description createdAt");
    let challengeThisMonth = 0;
    let referralLifetime = 0;
    let flashDropThisMonth = 0;
    let vouchers = 0;
    for (const t of txns) {
      if (t.type === "REFERRAL") referralLifetime += t.points || 0;
      if (t.type === "REDEEM") vouchers += 1;
      const thisMonth = t.createdAt && t.createdAt >= startOfMonth;
      if (thisMonth && (t.type === "COMPETITION" || t.type === "COMPETITION_WIN")) {
        challengeThisMonth += t.points || 0;
      }
      if (thisMonth && (t.type === "FLASH_DROP" || /flash drop/i.test(t.description || ""))) {
        flashDropThisMonth += t.points || 0;
      }
    }

    const reviewCount = await Review.countDocuments({ user: req.user._id });
    const challengesActive = await Competition.countDocuments({
      isActive: { $ne: false },
      publishState: { $ne: "draft" },
      status: "active",
    });
    const balance = req.user.pointsBalance || 0;
    res.json({
      balance,
      totalEarned: earned[0]?.total || 0,
      membershipLevel: req.user.membershipLevel,
      loginStreak: req.user.loginStreak || 0,
      kesValue: Math.floor(balance / 10),
      referralCode: req.user.referralCode,
      stats: {
        streakDays: req.user.loginStreak || 0,
        challengeThisMonth,
        referralLifetime,
        flashDropThisMonth,
        vouchers,
        challengesActive,
        reviewCount,
      },
    });
  })
);

router.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const transactions = await PointsTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ transactions });
  })
);

router.get(
  "/rules",
  asyncHandler(async (_req, res) => {
    const rules = await PointsRule.find({ isActive: true }).select("key name points");
    res.json({ rules });
  })
);

router.post(
  "/redeem",
  asyncHandler(async (req, res) => {
    const body = z.object({ rewardKey: z.enum(["OFF100", "OFF250", "OFF500", "CAP"]) }).parse(req.body);
    const reward = REWARDS[body.rewardKey];
    const user = await User.findById(req.user._id);
    if (!user) throw httpError(404, "User not found");
    if ((user.pointsBalance || 0) < reward.points) {
      throw httpError(400, "Not enough points to redeem this reward");
    }
    await creditPoints(user._id, "REDEEM", -reward.points, reward.description, body.rewardKey);
    const fresh = await User.findById(user._id);
    res.json({
      ok: true,
      balance: fresh?.pointsBalance || 0,
      description: reward.description,
      points: reward.points,
    });
  })
);

module.exports = router;
