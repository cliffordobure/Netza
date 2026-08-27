const { Router } = require("express");
const { z } = require("zod");
const { Banner } = require("../../models");
const { auth, requireStaff } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");

const router = Router();

function serialize(b) {
  return {
    id: b.id,
    title: b.title || "",
    subtitle: b.subtitle || "",
    ctaLabel: b.ctaLabel || "Shop now",
    link: b.link || "/catalog",
    imageUrl: b.imageUrl || "",
    placement: b.placement || "home",
    sortOrder: b.sortOrder || 0,
    isActive: Boolean(b.isActive),
    startsAt: b.startsAt || null,
    endsAt: b.endsAt || null,
  };
}

function activeFilter(placement) {
  const now = new Date();
  return {
    isActive: true,
    placement: placement || "home",
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
    ],
  };
}

/** Public: active home (or other) banners for the app carousel. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const placement = (req.query.placement || "home").toString();
    const banners = await Banner.find(activeFilter(placement)).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ banners: banners.map(serialize) });
  })
);

const bodySchema = z.object({
  title: z.string().max(120).optional(),
  subtitle: z.string().max(200).optional(),
  ctaLabel: z.string().max(40).optional(),
  link: z.string().max(300).optional(),
  imageUrl: z.string().max(500).optional(),
  placement: z.string().max(40).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

router.get(
  "/admin/all",
  auth(),
  requireStaff,
  asyncHandler(async (_req, res) => {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json({ banners: banners.map(serialize) });
  })
);

router.post(
  "/",
  auth(),
  requireStaff,
  asyncHandler(async (req, res) => {
    const body = bodySchema.parse(req.body || {});
    const banner = await Banner.create({
      title: body.title || "",
      subtitle: body.subtitle || "",
      ctaLabel: body.ctaLabel || "Shop now",
      link: body.link || "/catalog",
      imageUrl: body.imageUrl || "",
      placement: body.placement || "home",
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive !== false,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    });
    res.status(201).json({ banner: serialize(banner) });
  })
);

router.patch(
  "/:id",
  auth(),
  requireStaff,
  asyncHandler(async (req, res) => {
    const body = bodySchema.parse(req.body || {});
    const banner = await Banner.findById(req.params.id);
    if (!banner) throw httpError(404, "Banner not found");
    for (const key of ["title", "subtitle", "ctaLabel", "link", "imageUrl", "placement", "sortOrder", "isActive"]) {
      if (body[key] !== undefined) banner[key] = body[key];
    }
    if (body.startsAt !== undefined) banner.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt !== undefined) banner.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    await banner.save();
    res.json({ banner: serialize(banner) });
  })
);

router.delete(
  "/:id",
  auth(),
  requireStaff,
  asyncHandler(async (req, res) => {
    const banner = await Banner.findById(req.params.id);
    if (!banner) throw httpError(404, "Banner not found");
    await banner.deleteOne();
    res.json({ ok: true });
  })
);

module.exports = router;
