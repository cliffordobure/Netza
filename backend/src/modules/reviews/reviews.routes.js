const { Router } = require("express");
const { z } = require("zod");
const { Review, Order, Product, PointsTransaction } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { creditPoints, getRule } = require("../../services/points.service");

const router = Router();

router.get(
  "/:productId/reviews",
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ product: req.params.productId })
      .sort({ createdAt: -1 })
      .populate("user", "firstName lastName");
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        author: `${r.user.firstName} ${r.user.lastName[0]}.`,
      })),
    });
  })
);

router.post(
  "/:productId/reviews",
  auth(),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        rating: z.number().int().min(1).max(5),
        title: z.string().optional(),
        body: z.string().optional(),
      })
      .parse(req.body);

    const purchased = await Order.findOne({
      user: req.user._id,
      paymentStatus: "COMPLETED",
      "items.product": req.params.productId,
    });
    if (!purchased) throw httpError(400, "You can review products you have purchased");

    const review = await Review.findOneAndUpdate(
      { user: req.user._id, product: req.params.productId },
      {
        rating: body.rating,
        title: body.title || "",
        body: body.body || "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const agg = await Review.aggregate([
      { $match: { product: review.product } },
      { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
    ]);
    await Product.updateOne(
      { _id: req.params.productId },
      { ratingAvg: agg[0]?.avg || 0, ratingCount: agg[0]?.n || 0 }
    );

    const alreadyRewarded = await PointsTransaction.findOne({
      user: req.user._id,
      type: "REVIEW",
      reference: req.params.productId,
    });
    if (!alreadyRewarded) {
      const rule = await getRule("REVIEW");
      if (rule) {
        await creditPoints(req.user._id, "REVIEW", rule.points, "Product review", req.params.productId);
      }
    }

    res.status(201).json({ review });
  })
);

module.exports = router;
