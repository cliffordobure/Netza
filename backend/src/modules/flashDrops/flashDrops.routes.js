const { Router } = require("express");
const { FlashDrop } = require("../../models");
const { asyncHandler } = require("../../middleware/error");
const { decorateProduct } = require("../../services/pricing.service");

const router = Router();

router.get(
  "/active",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const drop = await FlashDrop.findOne({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .sort({ startsAt: -1 })
      .populate({ path: "products.product", populate: [{ path: "brand" }, { path: "category" }] });
    if (!drop) return res.json({ flashDrop: null, products: [] });
    res.json({
      flashDrop: {
        id: drop.id,
        name: drop.name,
        discountPercent: drop.discountPercent,
        startsAt: drop.startsAt,
        endsAt: drop.endsAt,
      },
      products: drop.products
        .filter((item) => item.remainingQty > 0 && item.product)
        .map((item) =>
          decorateProduct(item.product, {
            flashDropName: drop.name,
            originalKes: item.originalKes,
            flashKes: item.flashKes,
            remainingQty: item.remainingQty,
            endsAt: drop.endsAt,
            discountPercent: drop.discountPercent,
          })
        ),
    });
  })
);

module.exports = router;
