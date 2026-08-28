const { Router } = require("express");
const { z } = require("zod");
const { Banner } = require("../../models");
const { auth, requireStaff } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");

const router = Router();

const PLACEMENT_LABELS = {
  home: "Home Hero",
  splash: "App Splash",
  category: "Category Strip",
  checkout: "Checkout",
  email: "Email Header",
};

function placementLabel(p) {
  return PLACEMENT_LABELS[p] || p || "Home Hero";
}

function placementValue(labelOrSlug) {
  const raw = String(labelOrSlug || "home").trim();
  const found = Object.entries(PLACEMENT_LABELS).find(([, label]) => label === raw);
  if (found) return found[0];
  const slug = raw.toLowerCase().replace(/\s+/g, "-");
  if (PLACEMENT_LABELS[slug]) return slug;
  if (raw.toLowerCase().includes("home")) return "home";
  if (raw.toLowerCase().includes("splash")) return "splash";
  if (raw.toLowerCase().includes("categor")) return "category";
  if (raw.toLowerCase().includes("checkout")) return "checkout";
  if (raw.toLowerCase().includes("email")) return "email";
  return slug || "home";
}

function statusOf(b, now = new Date()) {
  if (!b.isActive) return { status: "paused", statusLabel: "Paused" };
  if (b.startsAt && new Date(b.startsAt) > now) return { status: "scheduled", statusLabel: "Scheduled" };
  if (b.endsAt && new Date(b.endsAt) < now) return { status: "expired", statusLabel: "Expired" };
  return { status: "active", statusLabel: "Active" };
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function serializeAdmin(b, n = 1) {
  const st = statusOf(b);
  return {
    id: b.id,
    n,
    name: b.title || "Untitled banner",
    title: b.title || "",
    subtitle: b.subtitle || "",
    ctaLabel: b.ctaLabel || "Shop now",
    placement: placementLabel(b.placement),
    placementKey: b.placement || "home",
    status: st.status,
    statusLabel: st.statusLabel,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    starts: fmtDate(b.startsAt),
    ends: fmtDate(b.endsAt),
    startsAt: b.startsAt || null,
    endsAt: b.endsAt || null,
    image: b.imageUrl || "",
    imageUrl: b.imageUrl || "",
    link: b.link || "",
    isActive: Boolean(b.isActive),
    sortOrder: b.sortOrder || 0,
  };
}

function serializePublic(b) {
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

const bodySchema = z.object({
  title: z.string().max(120).optional(),
  name: z.string().max(120).optional(),
  subtitle: z.string().max(200).optional(),
  ctaLabel: z.string().max(40).optional(),
  link: z.string().max(500).optional(),
  imageUrl: z.string().max(2000).optional(),
  placement: z.string().max(80).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

function parseDate(v) {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Public: active banners for the app carousel. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const placement = placementValue(req.query.placement || "home");
    const banners = await Banner.find(activeFilter(placement)).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ banners: banners.map(serializePublic) });
  })
);

router.get(
  "/admin/all",
  auth(),
  requireStaff,
  asyncHandler(async (req, res) => {
    let list = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
    const q = (req.query.q || "").trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          (b.title || "").toLowerCase().includes(q) ||
          (b.placement || "").toLowerCase().includes(q) ||
          placementLabel(b.placement).toLowerCase().includes(q)
      );
    }
    if (req.query.placement) {
      const key = placementValue(req.query.placement);
      list = list.filter((b) => (b.placement || "home") === key);
    }
    if (req.query.status) {
      const now = new Date();
      list = list.filter((b) => statusOf(b, now).status === req.query.status);
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const total = list.length;
    const start = (page - 1) * limit;
    const slice = list.slice(start, start + limit);
    const now = new Date();
    const allStatus = list.map((b) => statusOf(b, now).status);

    res.json({
      total,
      page,
      limit,
      stats: {
        active: allStatus.filter((s) => s === "active").length,
        activeDelta: 0,
        impressions: 0,
        impressionsDelta: 0,
        clicks: 0,
        clicksDelta: 0,
        avgCtr: 0,
        avgCtrDelta: 0,
        scheduled: allStatus.filter((s) => s === "scheduled").length,
        scheduledDelta: 0,
      },
      banners: slice.map((b, i) => serializeAdmin(b, start + i + 1)),
      filters: {
        statuses: [
          { value: "active", label: "Active" },
          { value: "scheduled", label: "Scheduled" },
          { value: "paused", label: "Paused" },
          { value: "expired", label: "Expired" },
        ],
        placements: Object.values(PLACEMENT_LABELS),
      },
    });
  })
);

router.post(
  "/",
  auth(),
  requireStaff,
  asyncHandler(async (req, res) => {
    const body = bodySchema.parse(req.body || {});
    const banner = await Banner.create({
      title: body.title || body.name || "",
      subtitle: body.subtitle || "",
      ctaLabel: body.ctaLabel || "Shop now",
      link: body.link || "/catalog",
      imageUrl: body.imageUrl || "",
      placement: placementValue(body.placement || "home"),
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive !== false,
      startsAt: parseDate(body.startsAt) || undefined,
      endsAt: parseDate(body.endsAt) || undefined,
    });
    res.status(201).json({ banner: serializeAdmin(banner) });
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
    if (body.title !== undefined || body.name !== undefined) banner.title = body.title || body.name || banner.title;
    if (body.subtitle !== undefined) banner.subtitle = body.subtitle;
    if (body.ctaLabel !== undefined) banner.ctaLabel = body.ctaLabel;
    if (body.link !== undefined) banner.link = body.link;
    if (body.imageUrl !== undefined) banner.imageUrl = body.imageUrl;
    if (body.placement !== undefined) banner.placement = placementValue(body.placement);
    if (body.sortOrder !== undefined) banner.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) banner.isActive = body.isActive;
    if (body.startsAt !== undefined) banner.startsAt = parseDate(body.startsAt);
    if (body.endsAt !== undefined) banner.endsAt = parseDate(body.endsAt);
    await banner.save();
    res.json({ banner: serializeAdmin(banner) });
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
