const { Router } = require("express");
const { Address } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { quoteDelivery } = require("../../lib/delivery");

const router = Router();
router.use(auth());

router.get(
  "/quote",
  asyncHandler(async (req, res) => {
    let address = {
      city: req.query.city,
      county: req.query.county,
      street: req.query.street,
    };
    if (req.query.addressId) {
      const found = await Address.findOne({ _id: req.query.addressId, user: req.user._id });
      if (!found) throw httpError(404, "Delivery address not found");
      address = found.toJSON();
    } else if (!address.city && !address.county && !address.street) {
      const fallback = await Address.findOne({ user: req.user._id, isDefault: true })
        || await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (fallback) address = fallback.toJSON();
    }

    const subtotalKes = Number(req.query.subtotalKes || 0);
    const method = String(req.query.method || "STANDARD").toUpperCase();
    const [standard, express] = await Promise.all([
      quoteDelivery({ address, method: "STANDARD", subtotalKes }),
      quoteDelivery({ address, method: "EXPRESS", subtotalKes }),
    ]);
    const chosen = method === "EXPRESS" ? express : standard;
    res.json({
      ...chosen,
      standardKes: standard.deliveryKes,
      expressKes: express.deliveryKes,
      address: {
        id: address.id || address._id || null,
        city: address.city || "",
        county: address.county || "",
        street: address.street || "",
      },
    });
  })
);

module.exports = router;
