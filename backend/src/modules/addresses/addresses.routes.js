const { Router } = require("express");
const { z } = require("zod");
const { Address } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");

const router = Router();
router.use(auth());

const schema = z.object({
  label: z.string().default("Home"),
  county: z.string().min(2),
  city: z.string().min(2),
  street: z.string().min(3),
  phone: z.string().min(10),
  isDefault: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, label: 1 });
    res.json({ addresses });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = schema.parse(req.body);
    if (body.isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }
    const address = await Address.create({
      ...body,
      user: req.user._id,
      isDefault: Boolean(body.isDefault),
    });
    res.status(201).json({ address });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) throw httpError(404, "Address not found");
    const body = schema.partial().parse(req.body);
    if (body.isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }
    Object.assign(existing, body);
    await existing.save();
    res.json({ address: existing });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await Address.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  })
);

module.exports = router;
