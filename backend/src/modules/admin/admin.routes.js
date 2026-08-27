const { Router } = require("express");
const { z } = require("zod");
const {
  Order,
  User,
  Product,
  Category,
  Brand,
  AttributeGroup,
  Attribute,
  FlashDrop,
  PointsRule,
  PointsTransaction,
  Address,
  Cart,
  Setting,
  Competition,
  isOid,
} = require("../../models");
const { auth, requireStaff, requireRoles } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { slugify, paginate, randomCode } = require("../../lib/utils");
const { normalizeEmail, normalizePhone, phoneLookupVariants } = require("../../lib/identity");
const { listCompetitionParticipants, listCompetitionEntries, listCompetitionWinners, participantWidgets } = require("./competition-participants");
const { listCompetitionPrizes, upsertPrize, removePrize, duplicatePrize } = require("./competition-prizes");
const { getCompetitionAnalytics } = require("./competition-analytics");
const { listFlashDrops, upsertDrop, removeDrop, duplicateDrop, getDrop } = require("./flash-drop-admin");
const { getFlashDropAnalytics } = require("./flash-drop-analytics");
const { listFlashDropParticipants } = require("./flash-drop-participants");
const { listFlashDropHistory } = require("./flash-drop-history");
const { getFlashDropSettings, saveFlashDropSettings, resetFlashDropSettings } = require("./flash-drop-settings");
const { listFlashDropLogs } = require("./flash-drop-logs");
const { getFlashDropReports } = require("./flash-drop-reports");
const { getFlashDropSystemSettings, saveFlashDropSystemSettings } = require("./flash-drop-system-settings");
const { getProductsCatalog, enrichProductDetail } = require("./products-catalog");
const { getInventoryAdjustments } = require("./inventory-adjustments");
const { getOrdersCatalog } = require("./orders-catalog");
const { getOrderDetail } = require("./order-detail");
const { getPointsOverview } = require("./points-overview");
const { getPointsMembers } = require("./points-members");
const { getPointsTransactions } = require("./points-transactions");
const { getPointsRewards } = require("./points-rewards");
const { getPointsTiers } = require("./points-tiers");
const { getPointsSettings, savePointsSettings } = require("./points-settings");
const { getDeliveryOverview } = require("./delivery-overview");
const { getDeliveryShipments } = require("./delivery-shipments");
const { getDeliveryCouriers } = require("./delivery-couriers");
const { getDeliveryZones } = require("./delivery-zones");
const { getDeliveryReturns } = require("./delivery-returns");
const { getDeliveryReports } = require("./delivery-reports");
const { getDeliverySettings, saveDeliverySettings, resetDeliverySettings } = require("./delivery-settings");
const { getPaymentsCatalog } = require("./payments-catalog");
const { getSalesReports } = require("./sales-reports");
const { getOrderReports } = require("./order-reports");
const { getCustomerReports } = require("./customer-reports");
const { getInventoryReports } = require("./inventory-reports");
const { getMarketingOverview } = require("./marketing-overview");
const {
  getMarketingCampaigns,
  getMarketingEmail,
  getMarketingSms,
  getMarketingPush,
  getMarketingDiscounts,
  getMarketingBanners,
} = require("./marketing-pages");
const {
  getSupport,
  getSettings,
  saveSettings,
  resetSettings,
  getProductUnits,
  getProductImport,
} = require("./support-settings");
const {
  listDropCategories,
  upsertCategory,
  removeCategory,
  duplicateCategory,
  reorderCategories,
  saveRules,
} = require("./flash-drop-categories");
const { publicUser } = require("../../lib/jwt");
const { creditPoints } = require("../../services/points.service");
const { uploadBuffer, FOLDERS } = require("../../lib/cloudinary");
const bcrypt = require("bcryptjs");
const multer = require("multer");

const router = Router();
router.use(auth(), requireStaff);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) return cb(null, true);
    cb(httpError(400, "Only JPEG, PNG, WEBP, or GIF images are allowed"));
  },
});

function uploadImageMw(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(httpError(400, "Image must be 5MB or smaller"));
    return next(err.status ? err : httpError(400, err.message || "Upload failed"));
  });
}

router.post(
  "/uploads",
  uploadImageMw,
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(400, "No image file provided");
    const folder = String(req.body?.folder || req.query?.folder || "misc").toLowerCase();
    if (!FOLDERS.has(folder)) {
      throw httpError(400, `Invalid upload folder. Use one of: ${[...FOLDERS].join(", ")}`);
    }
    const result = await uploadBuffer(req.file.buffer, {
      folder,
      mimeType: req.file.mimetype,
    });
    res.status(201).json(result);
  })
);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfDay(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function pctChange(curr, prev) {
  if (!prev && !curr) return 0;
  if (!prev) return 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function pctChange1(curr, prev) {
  if (!prev && !curr) return 0;
  if (!prev) return 100;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function monthBounds(offset = 0) {
  const d = new Date();
  return {
    start: new Date(d.getFullYear(), d.getMonth() + offset, 1),
    end: new Date(d.getFullYear(), d.getMonth() + offset + 1, 1),
  };
}

function expirySource(t) {
  const ty = String(t.type || "").toUpperCase();
  if (ty === "ORDER" || ty === "PURCHASE") return "purchase";
  if (ty === "WELCOME") return "welcome";
  if (ty === "REVIEW") return "review";
  if (ty === "DAILY_LOGIN") return "login";
  if (ty === "REFERRAL") return "referral";
  if (ty === "ADMIN") return "adjust";
  if (ty === "EXPIRE") return "expire";
  return "other";
}

function expirySourceLabel(key) {
  return {
    purchase: "Purchase Points",
    welcome: "Welcome Bonus",
    review: "Product Review",
    login: "Daily Login",
    referral: "Referral Bonus",
    adjust: "Adjustment",
    expire: "Expired",
    other: "Other",
  }[key] || "Other";
}

function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function expiryStatusOf(t, days) {
  if (String(t.status || "").toUpperCase() === "EXPIRED" || (days != null && days < 0)) return "expired";
  if (days != null && days <= 7) return "soon";
  return "active";
}

function mapExpiryCustomer(u) {
  if (!u || typeof u !== "object") return null;
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    customerNumber: u.customerNumber,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    email: u.email,
    pointsBalance: u.pointsBalance,
    membershipLevel: u.membershipLevel,
  };
}

function buildExpiry(docs, settingMap, kesPerPoint) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const in60 = new Date(now.getTime() + 60 * 86400000);
  const thisM = monthBounds(0);
  const lastM = monthBounds(-1);

  const batches = docs.filter((t) => t.expiresAt && (t.points || 0) > 0);
  const expireTxns = docs.filter((t) => String(t.type || "").toUpperCase() === "EXPIRE");

  const sumPts = (list) => list.reduce((s, t) => s + Math.abs(t.points || 0), 0);
  const upcoming = batches.filter((t) => String(t.status || "").toUpperCase() !== "EXPIRED" && new Date(t.expiresAt) > now);
  const expiredBatches = batches.filter((t) => String(t.status || "").toUpperCase() === "EXPIRED" || new Date(t.expiresAt) <= now);
  const d7 = upcoming.filter((t) => new Date(t.expiresAt) <= in7);
  const in30all = upcoming.filter((t) => new Date(t.expiresAt) <= in30);
  const d30 = upcoming.filter((t) => new Date(t.expiresAt) > in7 && new Date(t.expiresAt) <= in30);
  const d60 = upcoming.filter((t) => new Date(t.expiresAt) > in30 && new Date(t.expiresAt) <= in60);
  const d90plus = upcoming.filter((t) => new Date(t.expiresAt) > in60);

  const autoThis = expireTxns.filter((t) => t.createdAt >= thisM.start && t.createdAt < thisM.end);
  const autoLast = expireTxns.filter((t) => t.createdAt >= lastM.start && t.createdAt < lastM.end);
  const autoThisPts = sumPts(autoThis);
  const autoLastPts = sumPts(autoLast);
  const already = sumPts(expireTxns);

  const trend = [];
  for (let i = 5; i >= 0; i -= 1) {
    const b = monthBounds(-i);
    const pts = sumPts(expireTxns.filter((t) => t.createdAt >= b.start && t.createdAt < b.end));
    trend.push({
      label: b.start.toLocaleString("en-GB", { month: "short" }),
      points: pts,
    });
  }
  const maxTrend = Math.max(1, ...trend.map((x) => x.points));

  const rows = batches
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
    .map((t) => {
      const json = typeof t.toJSON === "function" ? t.toJSON() : t;
      const days = daysUntil(json.expiresAt);
      const source = expirySource(json);
      const status = expiryStatusOf(json, days);
      const u = json.user && typeof json.user === "object" ? json.user : null;
      return {
        ...json,
        customer: mapExpiryCustomer(u),
        daysLeft: days,
        source,
        sourceLabel: expirySourceLabel(source),
        expiryStatus: status,
      };
    });

  let reminders = [];
  try {
    reminders = JSON.parse(settingMap.pointsExpiryReminders || "[]");
  } catch {
    reminders = [];
  }

  return {
    stats: {
      totalExpiring: sumPts(upcoming),
      in30: sumPts(in30all),
      in7: sumPts(d7),
      alreadyExpired: already,
      autoThisMonth: autoThisPts,
      autoPct: pctChange1(autoThisPts, autoLastPts),
      customersAffected: new Set(autoThis.map((t) => String(t.user?._id || t.user?.id || t.user || ""))).size,
      kesPerPoint,
    },
    buckets: {
      d7: sumPts(d7),
      d30: sumPts(d30),
      d60: sumPts(d60),
      d90plus: sumPts(d90plus),
      total: sumPts(upcoming),
    },
    trend: trend.map((x) => ({ ...x, pct: Math.round((x.points / maxTrend) * 100) })),
    rows,
    reminders,
    history: expireTxns
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 40)
      .map((t) => {
        const json = typeof t.toJSON === "function" ? t.toJSON() : t;
        const u = json.user && typeof json.user === "object" ? json.user : null;
        return { ...json, customer: mapExpiryCustomer(u), source: expirySource(json), sourceLabel: expirySourceLabel(expirySource(json)) };
      }),
    rules: [
      { id: "standard", name: "Standard expiry", trigger: "All earned points", duration: "12 months", reminder: "30 days before", isActive: settingMap.pointsAutoExpiry !== "false" },
      { id: "promo", name: "Promotion points", trigger: "Bonus / campaign points", duration: "6 months", reminder: "7 days before", isActive: true },
      { id: "welcome", name: "Welcome points", trigger: "Welcome bonus", duration: "12 months", reminder: "30 days before", isActive: true },
    ],
  };
}

function pointKind(t) {
  const ty = String(t.type || "").toUpperCase();
  if (ty === "EXPIRE") return "expire";
  if (ty === "REDEEM") return "redeem";
  if (ty === "ADMIN") return "adjust";
  if ((t.points || 0) < 0) return "redeem";
  return "earn";
}

function kindLabel(kind) {
  return { earn: "Earn", redeem: "Redeem", adjust: "Adjust", expire: "Expire" }[kind] || "Earn";
}

async function sumPoints(match) {
  const r = await PointsTransaction.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);
  return r[0]?.total || 0;
}

function statusBucket(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return "delivered";
  if (s === "SHIPPED" || s === "IN_TRANSIT") return "shipped";
  if (s === "CANCELLED") return "cancelled";
  return "processing";
}

function prettyOrderBadge(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return "Delivered";
  if (s === "SHIPPED" || s === "IN_TRANSIT") return "Shipped";
  if (s === "CANCELLED") return "Cancelled";
  if (s === "PENDING_PAYMENT") return "Processing";
  if (s === "PROCESSING" || s === "PAID") return "Processing";
  return "Completed";
}

function orderTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return "done";
  if (s === "CANCELLED") return "cancel";
  return "process";
}

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const today = startOfDay(0);
    const yesterday = startOfDay(-1);
    const start90 = startOfDay(-89);

    const paidMatch = (from, to) => ({
      $or: [
        { paymentStatus: "COMPLETED", paidAt: { $gte: from, $lt: to } },
        { paymentStatus: "COMPLETED", paidAt: null, createdAt: { $gte: from, $lt: to } },
      ],
    });

    const [
      salesToday,
      salesYesterday,
      ordersToday,
      ordersYesterday,
      customers,
      customersYesterday,
      pointsToday,
      pointsYesterday,
      flashSalesToday,
      flashSalesYesterday,
      pendingOrders,
      lowStockCount,
      statusRows,
      salesRows,
      lowStockProducts,
      recentDocs,
      nextFlash,
      topCustomers,
    ] = await Promise.all([
      Order.aggregate([{ $match: paidMatch(today, startOfDay(1)) }, { $group: { _id: null, total: { $sum: "$totalKes" } } }]),
      Order.aggregate([{ $match: paidMatch(yesterday, today) }, { $group: { _id: null, total: { $sum: "$totalKes" } } }]),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
      User.countDocuments({ role: "CUSTOMER", isActive: true }),
      User.countDocuments({ role: "CUSTOMER", isActive: true, createdAt: { $lt: today } }),
      PointsTransaction.aggregate([
        { $match: { points: { $gt: 0 }, createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
      PointsTransaction.aggregate([
        { $match: { points: { $gt: 0 }, createdAt: { $gte: yesterday, $lt: today } } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
      Order.aggregate([
        { $match: { ...paidMatch(today, startOfDay(1)), "items.wasFlashDrop": true } },
        { $unwind: "$items" },
        { $match: { "items.wasFlashDrop": true } },
        { $group: { _id: null, total: { $sum: "$items.lineTotalKes" } } },
      ]),
      Order.aggregate([
        { $match: { ...paidMatch(yesterday, today), "items.wasFlashDrop": true } },
        { $unwind: "$items" },
        { $match: { "items.wasFlashDrop": true } },
        { $group: { _id: null, total: { $sum: "$items.lineTotalKes" } } },
      ]),
      Order.countDocuments({ status: { $in: ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"] } }),
      Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
      Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      Order.aggregate([
        {
          $match: {
            $or: [
              { paymentStatus: "COMPLETED", paidAt: { $gte: start90 } },
              { paymentStatus: "COMPLETED", paidAt: null, createdAt: { $gte: start90 } },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $ifNull: ["$paidAt", "$createdAt"] },
              },
            },
            total: { $sum: "$totalKes" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Product.find({ isActive: true, stock: { $lte: 20 } }).sort({ stock: 1 }).limit(5).select("name stock images sku"),
      Order.find().sort({ createdAt: -1 }).limit(6).populate("user", "firstName lastName"),
      FlashDrop.findOne({ isActive: true, endsAt: { $gte: now } }).sort({ startsAt: 1 }),
      User.find({ role: "CUSTOMER" }).sort({ pointsBalance: -1 }).limit(5).select("firstName lastName pointsBalance"),
    ]);

    const salesMap = Object.fromEntries(salesRows.map((r) => [r._id, r.total]));
    const salesByDay = [];
    for (let i = 89; i >= 0; i--) {
      const d = startOfDay(-i);
      const key = d.toISOString().slice(0, 10);
      salesByDay.push({ date: key, totalKes: salesMap[key] || 0 });
    }

    const orderStatus = { delivered: 0, processing: 0, shipped: 0, cancelled: 0 };
    let orderTotal = 0;
    for (const row of statusRows) {
      const bucket = statusBucket(row._id);
      orderStatus[bucket] += row.n;
      orderTotal += row.n;
    }

    res.json({
      kpis: {
        todaysSalesKes: salesToday[0]?.total || 0,
        salesChangePct: pctChange(salesToday[0]?.total || 0, salesYesterday[0]?.total || 0),
        ordersToday,
        ordersChangePct: pctChange(ordersToday, ordersYesterday),
        activeCustomers: customers,
        customersChangePct: pctChange(customers, customersYesterday),
        pointsIssued: pointsToday[0]?.total || 0,
        pointsChangePct: pctChange(pointsToday[0]?.total || 0, pointsYesterday[0]?.total || 0),
        flashDropSalesKes: flashSalesToday[0]?.total || 0,
        flashDropSalesChangePct: pctChange(flashSalesToday[0]?.total || 0, flashSalesYesterday[0]?.total || 0),
        pendingOrders,
        lowStock: lowStockCount,
      },
      salesByDay,
      orderStatus: { ...orderStatus, total: orderTotal },
      lowStockProducts: lowStockProducts.map((p) => {
        const json = p.toJSON();
        const images = (json.images || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return {
          id: json.id,
          name: json.name,
          sku: json.sku,
          stock: json.stock,
          image: images[0]?.url || null,
        };
      }),
      recentOrders: recentDocs.map((o) => {
        const json = o.toJSON();
        return {
          id: json.id,
          orderNumber: json.orderNumber,
          customer: json.user ? `${json.user.firstName} ${json.user.lastName}` : "Guest",
          itemCount: (json.items || []).reduce((s, i) => s + (i.quantity || 1), 0),
          totalKes: json.totalKes,
          status: json.status,
        };
      }),
      nextFlashDrop: nextFlash
        ? {
            id: nextFlash.id,
            name: nextFlash.name,
            startsAt: nextFlash.startsAt,
            endsAt: nextFlash.endsAt,
            productCount: (nextFlash.products || []).length,
          }
        : null,
      leaderboard: topCustomers.map((u, i) => ({
        rank: i + 1,
        name: `${u.firstName} ${u.lastName}`,
        points: u.pointsBalance || 0,
      })),
    });
  })
);

router.get(
  "/inventory-adjustments",
  asyncHandler(async (req, res) => {
    res.json(getInventoryAdjustments(req.query));
  })
);

router.get(
  "/products-catalog",
  asyncHandler(async (req, res) => {
    res.json(await getProductsCatalog(req.query));
  })
);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const q = (req.query.q || "").trim();
    const filter = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { sku: rx }, { description: rx }];
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.status === "published") filter.isActive = true;
    if (req.query.status === "draft") filter.isActive = false;
    if (req.query.stock === "out") filter.stock = 0;
    if (req.query.stock === "low") filter.stock = { $gt: 0, $lte: 10 };
    if (req.query.stock === "in") filter.stock = { $gt: 10 };

    const [total, products, published, draft, outOfStock, lowStock, salesRows] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("brand category"),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: false }),
      Product.countDocuments({ stock: 0 }),
      Product.countDocuments({ stock: { $gt: 0, $lte: 10 } }),
      Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.product", qty: { $sum: "$items.quantity" } } },
      ]),
    ]);
    const salesMap = Object.fromEntries(salesRows.map((r) => [String(r._id), r.qty]));
    const catalogTotal = published + draft;
    res.json({
      total,
      page,
      limit,
      stats: {
        total: catalogTotal,
        published,
        draft,
        outOfStock,
        lowStock,
      },
      products: products.map((p) => {
        const json = p.toJSON();
        return {
          ...json,
          brandId: json.brand?.id,
          categoryId: json.category?.id,
          sales: salesMap[json.id] || 0,
        };
      }),
    });
  })
);

const imageRef = z.string().refine(
  (s) => /^https?:\/\//i.test(s) || s.startsWith("data:image/"),
  "Invalid image"
);

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().optional(),
  description: z.string().min(10),
  shortDescription: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  brandName: z.string().optional(),
  categoryPath: z.string().optional(),
  subCategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priceKes: z.number().int().min(0),
  compareAtKes: z.number().int().optional().nullable(),
  stock: z.number().int().min(0),
  lowStockAt: z.number().int().min(0).optional(),
  warranty: z.string().optional(),
  deliveryInfo: z.string().optional(),
  visibility: z.enum(["all", "hidden"]).optional(),
  isActive: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  specs: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  notes: z.string().optional(),
  images: z.array(imageRef).optional(),
  color: z.string().optional(),
  modelNumber: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  unit: z.string().optional(),
  productType: z.string().optional(),
  allowReviews: z.boolean().optional(),
});

async function resolveBrandId(body) {
  if (body.brandId && isOid(body.brandId)) return body.brandId;
  if (body.brandName) {
    const found = await Brand.findOne({ name: new RegExp(`^${escapeRegex(body.brandName)}$`, "i") });
    if (found) return found._id;
    const created = await Brand.create({
      name: body.brandName,
      slug: slugify(body.brandName) + "-" + Date.now().toString(36),
      isActive: true,
    });
    return created._id;
  }
  const first = await Brand.findOne({ isActive: true }).sort({ name: 1 });
  if (!first) throw httpError(400, "Create a brand first, then add products.");
  return first._id;
}

async function resolveCategoryId(body) {
  if (body.categoryId && isOid(body.categoryId)) return body.categoryId;
  const path = String(body.categoryPath || "").trim();
  const leaf = path.includes(">") ? path.split(">").pop().trim() : path;
  if (leaf) {
    const found = await Category.findOne({ name: new RegExp(`^${escapeRegex(leaf)}$`, "i") });
    if (found) return found._id;
  }
  const first = await Category.findOne({ isActive: true, $or: [{ parent: null }, { parent: { $exists: false } }] }).sort({ sortOrder: 1 });
  if (!first) throw httpError(400, "Create a category first, then add products.");
  return first._id;
}

router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Product not found");
    const product = await Product.findById(req.params.id).populate("brand category");
    if (!product) throw httpError(404, "Product not found");
    const salesRows = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.product": product._id } },
      { $group: { _id: null, qty: { $sum: "$items.quantity" } } },
    ]);
    res.json({ product: enrichProductDetail(product, salesRows[0]?.qty || 0) });
  })
);

router.post(
  "/products/:id/duplicate",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Product not found");
    const src = await Product.findById(req.params.id);
    if (!src) throw httpError(404, "Product not found");
    const stamp = Date.now().toString(36);
    const product = await Product.create({
      name: `${src.name} (copy)`,
      slug: `${slugify(src.name)}-copy-${stamp}`,
      sku: `${src.sku}-COPY-${stamp.slice(-4).toUpperCase()}`,
      barcode: src.barcode,
      description: src.description,
      shortDescription: src.shortDescription,
      brand: src.brand,
      category: src.category,
      subCategory: src.subCategory,
      tags: src.tags,
      priceKes: src.priceKes,
      compareAtKes: src.compareAtKes,
      stock: src.stock,
      lowStockAt: src.lowStockAt,
      warranty: src.warranty,
      deliveryInfo: src.deliveryInfo,
      visibility: src.visibility,
      isActive: false,
      isTrending: false,
      isNewArrival: src.isNewArrival,
      seoTitle: src.seoTitle,
      seoDescription: src.seoDescription,
      specs: src.specs,
      notes: src.notes,
      images: src.images,
    });
    await product.populate("brand category");
    res.status(201).json({ product: enrichProductDetail(product, 0) });
  })
);

router.post(
  "/products",
  asyncHandler(async (req, res) => {
    const body = productSchema.parse(req.body);
    const brandId = await resolveBrandId(body);
    const categoryId = await resolveCategoryId(body);
    const product = await Product.create({
      name: body.name,
      slug: slugify(body.name) + "-" + Date.now().toString(36),
      sku: body.sku,
      barcode: body.barcode || "",
      description: body.description,
      shortDescription: body.shortDescription || "",
      brand: brandId,
      category: categoryId,
      subCategory: body.subCategory || "",
      tags: body.tags || [],
      priceKes: body.priceKes,
      compareAtKes: body.compareAtKes || undefined,
      stock: body.stock,
      lowStockAt: body.lowStockAt,
      warranty: body.warranty || "12 months",
      deliveryInfo: body.deliveryInfo || "Nairobi 1-2 days • Nationwide 2-5 days",
      visibility: body.visibility || "all",
      isActive: body.isActive !== false,
      isTrending: Boolean(body.isTrending),
      isNewArrival: Boolean(body.isNewArrival),
      seoTitle: body.seoTitle || "",
      seoDescription: body.seoDescription || "",
      specs: body.specs || [],
      notes: body.notes || "",
      images: (body.images || []).map((url, i) => ({ url, sortOrder: i })),
    });
    await product.populate("brand category");
    res.status(201).json({ product: enrichProductDetail(product, 0) });
  })
);

router.patch(
  "/products/:id",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Product not found");
    const body = productSchema.partial().parse(req.body);
    const product = await Product.findById(req.params.id);
    if (!product) throw httpError(404, "Product not found");
    if (body.name) product.slug = slugify(body.name);
    if (body.brandId || body.brandName) product.brand = await resolveBrandId(body);
    if (body.categoryId || body.categoryPath) product.category = await resolveCategoryId(body);
    const assign = { ...body };
    delete assign.brandId;
    delete assign.categoryId;
    delete assign.brandName;
    delete assign.categoryPath;
    delete assign.images;
    Object.assign(product, assign);
    if (body.images) {
      product.images = body.images.map((url, i) => ({ url, sortOrder: i }));
    }
    await product.save();
    await product.populate("brand category");
    const salesRows = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.product": product._id } },
      { $group: { _id: null, qty: { $sum: "$items.quantity" } } },
    ]);
    res.json({ product: enrichProductDetail(product, salesRows[0]?.qty || 0) });
  })
);

router.delete(
  "/products/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    await Product.updateOne({ _id: req.params.id }, { isActive: false });
    res.json({ ok: true });
  })
);

const ORDER_STATUS = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAY_STATUS = ["PENDING", "COMPLETED", "FAILED"];

function statusFilter(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "pending") return { status: "PENDING_PAYMENT" };
  if (s === "processing") return { status: { $in: ["PAID", "PROCESSING"] } };
  if (s === "shipped") return { status: "SHIPPED" };
  if (s === "delivered") return { status: "DELIVERED" };
  if (s === "cancelled") return { status: "CANCELLED" };
  if (ORDER_STATUS.includes(String(raw || "").toUpperCase())) return { status: String(raw).toUpperCase() };
  return {};
}

function paymentFilter(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "paid") return { paymentStatus: "COMPLETED" };
  if (s === "pending") return { paymentStatus: "PENDING" };
  if (s === "failed") return { paymentStatus: "FAILED" };
  if (PAY_STATUS.includes(String(raw || "").toUpperCase())) return { paymentStatus: String(raw).toUpperCase() };
  return {};
}

function serializeAdminOrder(order) {
  const json = typeof order.toJSON === "function" ? order.toJSON() : order;
  const user = json.user && typeof json.user === "object" ? json.user : null;
  const items = json.items || [];
  const itemCount = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const vatKes = json.vatKes || 0;
  return {
    ...json,
    user: user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        }
      : json.user,
    itemCount,
    vatKes,
    paymentRef: (json.payments || []).find((p) => p.reference)?.reference || "",
  };
}

router.get(
  "/orders-catalog",
  asyncHandler(async (req, res) => {
    res.json(getOrdersCatalog(req.query));
  })
);

router.get(
  "/points-overview",
  asyncHandler(async (req, res) => {
    res.json(getPointsOverview(req.query));
  })
);

router.get(
  "/points-members",
  asyncHandler(async (req, res) => {
    res.json(getPointsMembers(req.query));
  })
);

router.get(
  "/points-transactions",
  asyncHandler(async (req, res) => {
    res.json(getPointsTransactions(req.query));
  })
);

router.get(
  "/points-rewards",
  asyncHandler(async (req, res) => {
    res.json(getPointsRewards(req.query));
  })
);

router.get(
  "/points-tiers",
  asyncHandler(async (req, res) => {
    res.json(getPointsTiers(req.query));
  })
);

router.get(
  "/points-settings",
  asyncHandler(async (_req, res) => {
    res.json(getPointsSettings());
  })
);

router.put(
  "/points-settings",
  asyncHandler(async (req, res) => {
    res.json(savePointsSettings(req.body || {}));
  })
);

router.get(
  "/delivery-overview",
  asyncHandler(async (req, res) => {
    res.json(getDeliveryOverview(req.query));
  })
);

router.get(
  "/delivery-shipments",
  asyncHandler(async (req, res) => {
    res.json(getDeliveryShipments(req.query));
  })
);

router.get(
  "/delivery-couriers",
  asyncHandler(async (req, res) => {
    res.json(getDeliveryCouriers(req.query));
  })
);

router.get(
  "/delivery-zones",
  asyncHandler(async (req, res) => {
    res.json(getDeliveryZones(req.query));
  })
);

router.get(
  "/delivery-returns",
  asyncHandler(async (req, res) => {
    res.json(getDeliveryReturns(req.query));
  })
);

router.get(
  "/delivery-reports",
  asyncHandler(async (req, res) => {
    res.json(getDeliveryReports(req.query));
  })
);

router.get(
  "/delivery-settings",
  asyncHandler(async (_req, res) => {
    res.json(getDeliverySettings());
  })
);

router.put(
  "/delivery-settings",
  asyncHandler(async (req, res) => {
    res.json(saveDeliverySettings(req.body || {}));
  })
);

router.post(
  "/delivery-settings/reset",
  asyncHandler(async (_req, res) => {
    res.json(resetDeliverySettings());
  })
);

router.get(
  "/payments",
  asyncHandler(async (req, res) => {
    res.json(getPaymentsCatalog(req.query));
  })
);

router.get(
  "/sales-reports",
  asyncHandler(async (req, res) => {
    res.json(getSalesReports(req.query));
  })
);

router.get(
  "/order-reports",
  asyncHandler(async (req, res) => {
    res.json(getOrderReports(req.query));
  })
);

router.get(
  "/customer-reports",
  asyncHandler(async (req, res) => {
    res.json(getCustomerReports(req.query));
  })
);

router.get(
  "/inventory-reports",
  asyncHandler(async (req, res) => {
    res.json(getInventoryReports(req.query));
  })
);

router.get(
  "/marketing-overview",
  asyncHandler(async (req, res) => {
    res.json(getMarketingOverview(req.query));
  })
);

router.get(
  "/marketing-campaigns",
  asyncHandler(async (req, res) => {
    res.json(getMarketingCampaigns(req.query));
  })
);

router.get(
  "/marketing-email",
  asyncHandler(async (req, res) => {
    res.json(getMarketingEmail(req.query));
  })
);

router.get(
  "/marketing-sms",
  asyncHandler(async (req, res) => {
    res.json(getMarketingSms(req.query));
  })
);

router.get(
  "/marketing-push",
  asyncHandler(async (req, res) => {
    res.json(getMarketingPush(req.query));
  })
);

router.get(
  "/marketing-discounts",
  asyncHandler(async (req, res) => {
    res.json(getMarketingDiscounts(req.query));
  })
);

router.get(
  "/marketing-banners",
  asyncHandler(async (req, res) => {
    res.json(getMarketingBanners(req.query));
  })
);

router.get(
  "/support",
  asyncHandler(async (req, res) => {
    res.json(getSupport(req.query));
  })
);

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json(getSettings());
  })
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    res.json(saveSettings(req.body || {}));
  })
);

router.post(
  "/settings/reset",
  asyncHandler(async (_req, res) => {
    res.json(resetSettings());
  })
);

router.get(
  "/product-units",
  asyncHandler(async (req, res) => {
    res.json(getProductUnits(req.query));
  })
);

router.get(
  "/product-import",
  asyncHandler(async (_req, res) => {
    res.json(getProductImport());
  })
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const q = (req.query.q || "").trim();
    const filter = {
      ...statusFilter(req.query.status),
      ...paymentFilter(req.query.paymentStatus),
    };
    if (req.query.returns === "1") filter.returnStatus = { $nin: [null, "", "NONE"] };
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const end = new Date(req.query.to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (q) {
      const rx = new RegExp(escapeRegex(q.replace(/^#/, "")), "i");
      const users = await User.find({
        $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }],
      }).select("_id");
      filter.$or = [
        { orderNumber: rx },
        { "address.phone": rx },
        { "payments.reference": rx },
        { user: { $in: users.map((u) => u._id) } },
      ];
    }

    const [total, orders, statusRows, payRows, returnCount] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "firstName lastName phone email"),
      Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: "$paymentStatus", n: { $sum: 1 } } }]),
      Order.countDocuments({ returnStatus: { $nin: [null, "", "NONE"] } }),
    ]);
    const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.n]));
    const pending = byStatus.PENDING_PAYMENT || 0;
    const processing = (byStatus.PAID || 0) + (byStatus.PROCESSING || 0);
    const shipped = byStatus.SHIPPED || 0;
    const delivered = byStatus.DELIVERED || 0;
    const cancelled = byStatus.CANCELLED || 0;
    res.json({
      total,
      page,
      limit,
      stats: {
        total: pending + processing + shipped + delivered + cancelled,
        pending,
        processing,
        shipped,
        delivered,
        cancelled,
        returns: returnCount,
        paid: payRows.find((r) => r._id === "COMPLETED")?.n || 0,
      },
      orders: orders.map(serializeAdminOrder),
    });
  })
);

router.post(
  "/orders",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string(),
        items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })).min(1),
        paymentMethod: z.enum(["MPESA", "PESAPAL", "CARD", "POINTS"]),
        paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
        status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
        street: z.string().optional(),
        city: z.string().optional(),
        county: z.string().optional(),
        phone: z.string().optional(),
        postalCode: z.string().optional(),
        deliveryKes: z.number().optional(),
      })
      .parse(req.body);
    const user = await User.findById(body.userId);
    if (!user) throw httpError(404, "Customer not found");
    const address =
      (await Address.findOne({ user: user._id, isDefault: true })) || (await Address.findOne({ user: user._id }));
    const lines = [];
    let subtotal = 0;
    for (const row of body.items) {
      const product = await Product.findById(row.productId);
      if (!product) throw httpError(400, "Product not found");
      const lineTotal = (product.priceKes || 0) * row.quantity;
      subtotal += lineTotal;
      lines.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        unitPriceKes: product.priceKes,
        quantity: row.quantity,
        lineTotalKes: lineTotal,
      });
    }
    const deliveryKes = body.deliveryKes ?? 300;
    const vatKes = Math.round(subtotal * 0.16);
    const paymentStatus = body.paymentStatus || "PENDING";
    const status = body.status || (paymentStatus === "COMPLETED" ? "PROCESSING" : "PENDING_PAYMENT");
    const totalKes = subtotal + deliveryKes + vatKes;
    const seq = (await Order.countDocuments()) + 1;
    const order = await Order.create({
      orderNumber: `NETZA-2026-${String(1200 + seq).padStart(4, "0")}`,
      user: user._id,
      address: {
        label: address?.label || "Delivery",
        county: body.county || address?.county || "Nairobi",
        city: body.city || address?.city || "Nairobi",
        street: body.street || address?.street || "",
        phone: body.phone || address?.phone || user.phone,
        postalCode: body.postalCode || "",
      },
      status,
      paymentMethod: body.paymentMethod,
      paymentStatus,
      subtotalKes: subtotal,
      deliveryKes,
      vatKes,
      totalKes,
      paidAt: paymentStatus === "COMPLETED" ? new Date() : null,
      items: lines,
      payments: [
        {
          provider: body.paymentMethod,
          reference: `ADM${Date.now().toString(36).toUpperCase()}`,
          amountKes: totalKes,
          phone: user.phone,
          status: paymentStatus,
        },
      ],
    });
    await order.populate("user", "firstName lastName phone email");
    res.status(201).json({ order: serializeAdminOrder(order) });
  })
);

router.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const demo = getOrderDetail(req.params.id);
    if (demo) return res.json({ order: demo });
    const q = {};
    if (isOid(req.params.id)) q._id = req.params.id;
    else q.orderNumber = req.params.id;
    const order = await Order.findOne(q).populate("user", "firstName lastName phone email");
    if (!order) throw httpError(404, "Order not found");
    res.json({ order: serializeAdminOrder(order) });
  })
);

router.patch(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
        paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
        returnStatus: z.enum(["NONE", "REQUESTED", "APPROVED", "REFUNDED"]).optional(),
      })
      .parse(req.body);
    const order = await Order.findById(req.params.id);
    if (!order) throw httpError(404, "Order not found");
    if (body.status) order.status = body.status;
    if (body.paymentStatus) {
      order.paymentStatus = body.paymentStatus;
      if (body.paymentStatus === "COMPLETED" && !order.paidAt) order.paidAt = new Date();
    }
    if (body.returnStatus) order.returnStatus = body.returnStatus;
    await order.save();
    await order.populate("user", "firstName lastName phone email");
    res.json({ order: serializeAdminOrder(order) });
  })
);

router.get(
  "/customers",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const q = (req.query.q || "").trim();
    const tab = String(req.query.tab || "all");
    const zoneQ = String(req.query.zone || "").trim();
    const typeQ = String(req.query.type || "").trim().toLowerCase();

    function groupKey(level) {
      const l = String(level || "BRONZE").toUpperCase();
      if (l === "GOLD" || l === "PLATINUM") return "VIP";
      if (l === "SILVER") return "WHOLESALE";
      return "REGULAR";
    }

    function groupLabel(level) {
      const k = groupKey(level);
      if (k === "VIP") return "VIP";
      if (k === "WHOLESALE") return "Wholesale";
      return "Regular";
    }

    function typeKey(level) {
      const k = groupKey(level);
      if (k === "VIP") return "corporate";
      if (k === "WHOLESALE") return "wholesale";
      return "retail";
    }

    function typeLabel(level) {
      const t = typeKey(level);
      if (t === "corporate") return "Corporate";
      if (t === "wholesale") return "Wholesale";
      return "Retail";
    }

    function zoneFromAddress(addr) {
      if (!addr) return "Nairobi CBD";
      const city = String(addr.city || "").trim();
      const county = String(addr.county || "").trim();
      const raw = city || county || "Nairobi";
      const lower = raw.toLowerCase();
      if (lower === "nairobi" || lower.includes("cbd")) return "Nairobi CBD";
      if (lower.includes("westland")) return "Westlands";
      if (lower.includes("kilimani")) return "Kilimani";
      if (lower.includes("karen")) return "Karen";
      if (lower.includes("roysambu")) return "Roysambu";
      if (lower.includes("south")) return "South B";
      return raw;
    }

    const filter = { role: "CUSTOMER" };
    if (req.query.group) {
      const g = String(req.query.group).toUpperCase();
      if (g === "VIP" || g === "GOLD" || g === "PLATINUM") filter.membershipLevel = { $in: ["GOLD", "PLATINUM"] };
      else if (g === "WHOLESALE" || g === "SILVER") filter.membershipLevel = "SILVER";
      else if (g === "REGULAR" || g === "BRONZE") filter.membershipLevel = "BRONZE";
      else filter.membershipLevel = g;
    }
    if (typeQ === "retail") filter.membershipLevel = "BRONZE";
    if (typeQ === "wholesale") filter.membershipLevel = "SILVER";
    if (typeQ === "corporate") filter.membershipLevel = { $in: ["GOLD", "PLATINUM"] };
    if (req.query.status === "active") {
      filter.isActive = { $ne: false };
      filter.blacklisted = { $ne: true };
    }
    if (req.query.status === "inactive") filter.isActive = false;
    if (tab === "blacklist") filter.blacklisted = true;
    if (tab === "groups" && req.query.group) {
      /* group already applied above */
    }
    if (tab === "segments") {
      const seg = String(req.query.segment || "loyal");
      if (seg === "loyal") filter.membershipLevel = { $in: ["GOLD", "PLATINUM"] };
      if (seg === "new") filter.createdAt = { $gte: new Date(Date.now() - 30 * 86400000) };
      if (seg === "inactive") filter.isActive = false;
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = filter.createdAt || {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const end = new Date(req.query.to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (q) {
      const rx = new RegExp(escapeRegex(q.replace(/^#/, "")), "i");
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { phone: rx },
        { customerNumber: rx },
        { referralCode: rx },
      ];
    }

    const allAddresses = await Address.find().select("user city county isDefault").lean();
    const zoneByUser = {};
    for (const a of allAddresses) {
      const uid = String(a.user);
      if (!zoneByUser[uid] || a.isDefault) zoneByUser[uid] = zoneFromAddress(a);
    }
    const zones = [...new Set(Object.values(zoneByUser))].sort();
    if (zoneQ) {
      const zoneIds = Object.entries(zoneByUser)
        .filter(([, z]) => z === zoneQ)
        .map(([id]) => id);
      filter._id = { $in: zoneIds };
    }

    const thirty = new Date(Date.now() - 30 * 86400000);
    const sixty = new Date(Date.now() - 60 * 86400000);
    const [
      total,
      users,
      allCount,
      new30,
      prev30,
      activeCount,
      vipCount,
      groupRows,
      orderCountAll,
      spendAll,
      spendPrev,
      vipUserIds,
    ] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ customerNumber: 1, createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments({ role: "CUSTOMER" }),
      User.countDocuments({ role: "CUSTOMER", createdAt: { $gte: thirty } }),
      User.countDocuments({ role: "CUSTOMER", createdAt: { $gte: sixty, $lt: thirty } }),
      User.countDocuments({ role: "CUSTOMER", isActive: { $ne: false }, blacklisted: { $ne: true } }),
      User.countDocuments({ role: "CUSTOMER", membershipLevel: { $in: ["GOLD", "PLATINUM"] } }),
      User.aggregate([
        { $match: { role: "CUSTOMER" } },
        { $group: { _id: "$membershipLevel", n: { $sum: 1 } } },
      ]),
      Order.aggregate([{ $group: { _id: "$user", n: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { paymentStatus: "COMPLETED" } },
        { $group: { _id: "$user", spent: { $sum: "$totalKes" }, n: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "COMPLETED",
            createdAt: { $gte: sixty, $lt: thirty },
          },
        },
        { $group: { _id: null, spent: { $sum: "$totalKes" } } },
      ]),
      User.find({ role: "CUSTOMER", membershipLevel: { $in: ["GOLD", "PLATINUM"] } }).select("_id").lean(),
    ]);

    const vipIdSet = new Set((vipUserIds || []).map((u) => String(u._id)));
    const vipSpent = (spendAll || [])
      .filter((r) => vipIdSet.has(String(r._id)))
      .reduce((s, r) => s + (r.spent || 0), 0);

    const ids = users.map((u) => u._id);
    const [countRows, spendRows, addrDocs] = await Promise.all([
      Order.aggregate([
        { $match: { user: { $in: ids } } },
        { $group: { _id: "$user", n: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { user: { $in: ids }, paymentStatus: "COMPLETED" } },
        { $group: { _id: "$user", spent: { $sum: "$totalKes" }, n: { $sum: 1 } } },
      ]),
      tab === "addresses" ? Address.find().populate("user", "firstName lastName customerNumber phone email") : [],
    ]);
    const countMap = Object.fromEntries(countRows.map((c) => [String(c._id), c.n]));
    const spendMap = Object.fromEntries(spendRows.map((c) => [String(c._id), c]));
    const allOrderMap = Object.fromEntries((orderCountAll || []).map((c) => [String(c._id), c.n]));
    const allSpendMap = Object.fromEntries((spendAll || []).map((c) => [String(c._id), c]));
    const repeatCount = (orderCountAll || []).filter((r) => r.n >= 2).length;
    const totalSpent = (spendAll || []).reduce((s, r) => s + (r.spent || 0), 0);
    const prevSpent = spendPrev[0]?.spent || 0;
    const paidOrders = (spendAll || []).reduce((s, r) => s + (r.n || 0), 0);
    const avgOrder = paidOrders ? Math.round(totalSpent / paidOrders) : 0;
    const newPct = prev30 ? Math.round(((new30 - prev30) / prev30) * 1000) / 10 : new30 ? 100 : 0;
    const spentPct = prevSpent ? Math.round(((totalSpent - prevSpent) / prevSpent) * 1000) / 10 : totalSpent ? 100 : 0;
    const vipPct = allCount ? Math.round((vipCount / allCount) * 1000) / 10 : 0;
    const repeatPct = allCount ? Math.round((repeatCount / allCount) * 1000) / 10 : 0;
    const activePct = allCount ? Math.round((activeCount / allCount) * 1000) / 10 : 0;
    const vipRevPct = totalSpent ? Math.round((vipSpent / totalSpent) * 1000) / 10 : 0;

    const bucket = { REGULAR: 0, WHOLESALE: 0, VIP: 0, OTHER: 0 };
    for (const g of groupRows) {
      const k = groupKey(g._id);
      if (bucket[k] != null) bucket[k] += g.n;
      else bucket.OTHER += g.n;
    }
    const donutColors = { REGULAR: "#3b82f6", WHOLESALE: "#f97316", VIP: "#8b5cf6", OTHER: "#94a3b8" };
    const groupDonut = ["REGULAR", "WHOLESALE", "VIP", "OTHER"]
      .filter((k) => bucket[k] > 0 || k !== "OTHER")
      .map((k) => ({
        key: k,
        name: k === "REGULAR" ? "Regular" : k === "WHOLESALE" ? "Wholesale" : k === "VIP" ? "VIP" : "Other",
        value: bucket[k],
        pct: allCount ? Math.round((bucket[k] / allCount) * 1000) / 10 : 0,
        color: donutColors[k],
      }));

    const topSpenders = (spendAll || [])
      .slice()
      .sort((a, b) => (b.spent || 0) - (a.spent || 0))
      .slice(0, 5);
    const topUsers = await User.find({ _id: { $in: topSpenders.map((t) => t._id) } })
      .select("firstName lastName avatarUrl membershipLevel")
      .lean();
    const topUserMap = Object.fromEntries(topUsers.map((u) => [String(u._id), u]));
    const topCustomers = topSpenders.map((t, i) => {
      const u = topUserMap[String(t._id)] || {};
      return {
        rank: i + 1,
        id: String(t._id),
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Customer",
        spentKes: t.spent || 0,
        avatarUrl: u.avatarUrl || "",
        group: groupLabel(u.membershipLevel),
      };
    });

    let activity = [];
    if (tab === "activity") {
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("user", "firstName lastName customerNumber");
      activity = recentOrders.map((o) => {
        const json = o.toJSON();
        return {
          id: json.id,
          type: "order",
          at: json.createdAt,
          text: `${json.user ? `${json.user.firstName} ${json.user.lastName}` : "Customer"} placed ${json.orderNumber}`,
        };
      });
    }

    const groupsLegacy = Object.fromEntries(groupRows.map((g) => [g._id || "BRONZE", g.n]));
    groupsLegacy.REGULAR = bucket.REGULAR;
    groupsLegacy.WHOLESALE = bucket.WHOLESALE;
    groupsLegacy.VIP = bucket.VIP;

    res.json({
      total,
      page,
      limit,
      tab,
      zones,
      stats: {
        total: allCount,
        totalPct: newPct,
        new30,
        newPct,
        active: activeCount,
        activePct,
        vip: vipCount,
        vipPct,
        repeat: repeatCount,
        repeatPct,
        spentKes: totalSpent,
        spentPct,
        withOrders: (orderCountAll || []).length,
        withOrdersPct: allCount ? Math.round(((orderCountAll || []).length / allCount) * 1000) / 10 : 0,
        loyal: vipCount,
        avgOrderKes: avgOrder,
        vipRevPct,
      },
      groups: groupsLegacy,
      groupDonut,
      topCustomers,
      insights: [
        {
          icon: "checkCircle",
          tone: "green",
          text: `Customer growth is up by ${Math.abs(newPct)}% this month.`,
        },
        {
          icon: "clock",
          tone: "blue",
          text: `VIP customers contribute ${vipRevPct}% of total revenue.`,
        },
        {
          icon: "warning",
          tone: "orange",
          text: `Average order value is KES ${avgOrder.toLocaleString("en-KE")}.`,
        },
        {
          icon: "truck",
          tone: "purple",
          text: `Repeat customers have ${Math.max(12, Math.round(repeatPct * 0.8))}% higher lifetime value.`,
        },
      ],
      addresses: (addrDocs || [])
        .filter((a) => a.user)
        .map((a) => {
          const json = a.toJSON();
          const u = json.user;
          return {
            id: json.id,
            label: json.label,
            street: json.street,
            city: json.city,
            county: json.county,
            phone: json.phone,
            customer: u ? `${u.firstName} ${u.lastName}` : "",
            customerNumber: u?.customerNumber,
          };
        }),
      activity,
      customers: users.map((u) => {
        const json = publicUser(u);
        const spent = spendMap[json.id] || allSpendMap[json.id] || {};
        const orders = countMap[json.id] || allOrderMap[json.id] || 0;
        return {
          ...json,
          pointsBalance: u.pointsBalance || 0,
          orderCount: orders,
          spentKes: spent.spent || 0,
          avgOrderKes: orders && spent.spent ? Math.round(spent.spent / (spent.n || orders)) : 0,
          zone: zoneByUser[json.id] || "Nairobi CBD",
          groupLabel: groupLabel(u.membershipLevel),
          groupKey: groupKey(u.membershipLevel),
          customerType: typeLabel(u.membershipLevel),
          customerTypeKey: typeKey(u.membershipLevel),
        };
      }),
    });
  })
);

router.post(
  "/customers",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().min(9),
        membershipLevel: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
        gender: z.string().optional(),
        preferredPayment: z.string().optional(),
        adminNotes: z.string().optional(),
        city: z.string().optional(),
        street: z.string().optional(),
        county: z.string().optional(),
      })
      .parse(req.body);
    let phone;
    try {
      phone = normalizePhone(body.phone);
    } catch (e) {
      throw httpError(400, e.message || "Invalid phone");
    }
    const email = normalizeEmail(body.email);
    const exists = await User.findOne({
      $or: [{ phone: { $in: phoneLookupVariants(phone) } }, ...(email ? [{ email }] : [])],
    });
    if (exists) throw httpError(400, "A customer with that phone or email already exists.");
    const n = (await User.countDocuments({ role: "CUSTOMER" })) + 1;
    const passwordHash = await bcrypt.hash("Customer@123", 10);
    const user = await User.create({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: email || undefined,
      phone,
      passwordHash,
      role: "CUSTOMER",
      referralCode: randomCode("NETZA"),
      profileCompleted: true,
      membershipLevel: body.membershipLevel || "BRONZE",
      customerNumber: `CUST-${String(n).padStart(5, "0")}`,
      gender: body.gender || "",
      preferredPayment: body.preferredPayment || "MPESA",
      adminNotes: body.adminNotes || "",
      isActive: true,
    });
    await Cart.create({ user: user._id, items: [] }).catch(() => {});
    if (body.street || body.city) {
      await Address.create({
        user: user._id,
        label: "Home",
        county: body.county || "Nairobi",
        city: body.city || "Nairobi",
        street: body.street || "",
        phone: body.phone,
        isDefault: true,
      });
    }
    res.status(201).json({ customer: { ...publicUser(user), pointsBalance: 0, orderCount: 0, spentKes: 0 } });
  })
);

router.post(
  "/customers/import",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        items: z.array(
          z
            .object({
              firstName: z.string().optional(),
              lastName: z.string().optional(),
              name: z.string().optional(),
              email: z.string().optional(),
              phone: z.string().optional(),
              group: z.string().optional(),
            })
            .passthrough()
        ),
      })
      .parse(req.body);
    let created = 0;
    for (const row of body.items) {
      const phone = String(row.phone || "").trim();
      if (!phone) continue;
      if (await User.findOne({ phone })) continue;
      const parts = String(row.name || `${row.firstName || ""} ${row.lastName || ""}`).trim().split(/\s+/);
      const firstName = row.firstName || parts[0] || "Customer";
      const lastName = row.lastName || parts.slice(1).join(" ") || "NETZA";
      const n = (await User.countDocuments({ role: "CUSTOMER" })) + 1;
      await User.create({
        firstName,
        lastName,
        email: row.email || undefined,
        phone,
        passwordHash: await bcrypt.hash("Customer@123", 10),
        role: "CUSTOMER",
        referralCode: randomCode("NETZA"),
        membershipLevel: String(row.group || "BRONZE").toUpperCase(),
        customerNumber: `CUST-${String(n).padStart(5, "0")}`,
        profileCompleted: true,
      });
      created += 1;
    }
    res.json({ created });
  })
);

router.get(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    const user = isOid(req.params.id)
      ? await User.findById(req.params.id)
      : await User.findOne({ $or: [{ customerNumber: req.params.id }, { phone: req.params.id }] });
    if (!user || user.role !== "CUSTOMER") throw httpError(404, "Customer not found");
    const [orders, addresses, txns, totals, referred, referralPts] = await Promise.all([
      Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).populate("items.product", "images name"),
      Address.find({ user: user._id }),
      PointsTransaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(30),
      Order.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: null,
            n: { $sum: 1 },
            spent: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "COMPLETED"] }, "$totalKes", 0] },
            },
            paidN: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "COMPLETED"] }, 1, 0] },
            },
          },
        },
      ]),
      User.find({ referredBy: user._id, role: "CUSTOMER" }).select("firstName lastName customerNumber phone createdAt membershipLevel"),
      PointsTransaction.aggregate([
        { $match: { user: user._id, type: "REFERRAL" } },
        { $group: { _id: null, pts: { $sum: "$points" } } },
      ]),
    ]);
    const t = totals[0] || { n: 0, spent: 0, paidN: 0 };
    const serializedOrders = orders.map((o) => {
      const json = o.toJSON();
      const first = (json.items || [])[0] || {};
      const product = first.product && typeof first.product === "object" ? first.product : null;
      return {
        ...json,
        thumb: product?.images?.[0]?.url || "",
        itemName: first.name || product?.name || "Order",
      };
    });
    const activity = [
      ...serializedOrders.map((o) => ({
        id: `order-${o.id}`,
        type: "order",
        text: `Order #${o.orderNumber} placed`,
        at: o.createdAt,
        badge: prettyOrderBadge(o.status),
        tone: orderTone(o.status),
      })),
      ...txns.map((txn) => {
        const json = txn.toJSON();
        return {
          id: `pts-${json.id}`,
          type: "points",
          text: json.points >= 0 ? `Earned ${json.points} Points` : `Redeemed ${Math.abs(json.points)} Points`,
          at: json.createdAt,
          badge: "Points",
          tone: "points",
        };
      }),
      ...(user.sentMessages || []).map((m, i) => ({
        id: `msg-${i}`,
        type: "message",
        text: "Sent message",
        at: m.at,
        badge: "Message",
        tone: "message",
      })),
      {
        id: "join",
        type: "join",
        text: "Joined NETZA Kenya",
        at: user.createdAt,
        badge: "New Member",
        tone: "join",
      },
    ].sort((a, b) => new Date(b.at) - new Date(a.at));
    res.json({
      customer: {
        ...publicUser(user),
        pointsBalance: user.pointsBalance || 0,
        orderCount: t.n,
        spentKes: t.spent || 0,
        avgOrderKes: t.paidN ? Math.round(t.spent / t.paidN) : 0,
        addresses: addresses.map((a) => a.toJSON()),
        orders: serializedOrders,
        pointsHistory: txns.map((x) => x.toJSON()),
        activity,
        referred: referred.map((u) => publicUser(u)),
        referredCount: referred.length,
        referralPoints: referralPts[0]?.pts || 0,
        notesLog: user.notesLog || [],
      },
    });
  })
);

router.patch(
  "/customers/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        membershipLevel: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
        isActive: z.boolean().optional(),
        blacklisted: z.boolean().optional(),
        gender: z.string().optional(),
        dateOfBirth: z.string().optional(),
        preferredPayment: z.string().optional(),
        adminNotes: z.string().optional(),
        note: z.string().optional(),
        tags: z.array(z.string()).optional(),
        segment: z.string().optional(),
      })
      .parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) throw httpError(404, "Customer not found");
    if (body.firstName) user.firstName = body.firstName;
    if (body.lastName) user.lastName = body.lastName;
    if (body.email !== undefined) user.email = body.email;
    if (body.phone) user.phone = body.phone;
    if (body.membershipLevel) user.membershipLevel = body.membershipLevel;
    if (body.isActive !== undefined) user.isActive = body.isActive;
    if (body.blacklisted !== undefined) user.blacklisted = body.blacklisted;
    if (body.gender !== undefined) user.gender = body.gender;
    if (body.dateOfBirth) user.dateOfBirth = new Date(body.dateOfBirth);
    if (body.preferredPayment !== undefined) user.preferredPayment = body.preferredPayment;
    if (body.adminNotes !== undefined) user.adminNotes = body.adminNotes;
    if (body.tags) user.tags = body.tags;
    if (body.segment !== undefined) user.segment = body.segment;
    if (body.note) {
      user.notesLog = user.notesLog || [];
      user.notesLog.unshift({ body: body.note, at: new Date(), author: req.user?.firstName || "Admin" });
      user.adminNotes = body.note;
    }
    await user.save();
    res.json({ customer: publicUser(user) });
  })
);

router.post(
  "/customers/:id/points",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({ points: z.coerce.number().int(), note: z.string().optional() }).parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) throw httpError(404, "Customer not found");
    user.pointsBalance = (user.pointsBalance || 0) + body.points;
    await user.save();
    await PointsTransaction.create({
      user: user._id,
      type: "ADMIN",
      points: body.points,
      description: body.note || "Admin adjustment",
    });
    res.json({ pointsBalance: user.pointsBalance });
  })
);

router.post(
  "/customers/:id/message",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({ subject: z.string().optional(), body: z.string().min(1) }).parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) throw httpError(404, "Customer not found");
    user.sentMessages = user.sentMessages || [];
    user.sentMessages.unshift({ body: body.body, at: new Date() });
    await user.save();
    res.json({ ok: true, to: user.email || user.phone, subject: body.subject || "NETZA Kenya" });
  })
);

router.get(
  "/flash-drops",
  asyncHandler(async (req, res) => {
    res.json(listFlashDrops(req.query));
  })
);

router.post(
  "/flash-drops",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        discountPercent: z.number().int().min(0).max(90).optional(),
        discount: z.number().optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
        startLabel: z.string().optional(),
        endLabel: z.string().optional(),
        maxQtyPerCustomer: z.number().int().min(1).optional(),
        productIds: z.array(z.string()).optional(),
        qtyEach: z.number().int().min(1).optional(),
        randomCount: z.number().int().min(1).optional(),
        category: z.string().optional(),
        type: z.string().optional(),
        stock: z.number().optional(),
        sold: z.number().optional(),
        revenue: z.number().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        image: z.string().optional(),
        originalKes: z.number().optional(),
        flashKes: z.number().optional(),
        maxQty: z.number().optional(),
        reserved: z.number().optional(),
        productSku: z.string().optional(),
        productName: z.string().optional(),
        productId: z.string().optional(),
        showCountdown: z.boolean().optional(),
        allowBackorders: z.boolean().optional(),
        requirePoints: z.boolean().optional(),
        notify: z.boolean().optional(),
        bonusPoints: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isDraft: z.boolean().optional(),
      })
      .parse(req.body);

    let mongoDrop = null;
    if (body.productIds?.length) {
      let ids = body.productIds;
      if (body.randomCount && body.randomCount < ids.length) {
        ids = [...ids].sort(() => Math.random() - 0.5).slice(0, body.randomCount);
      }
      const products = await Product.find({ _id: { $in: ids } });
      const pct = body.discountPercent ?? (body.type === "percentage" ? Number(body.discount || 50) : 50);
      const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
      const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(Date.now() + 12 * 3600 * 1000);
      mongoDrop = await FlashDrop.create({
        name: body.name,
        discountPercent: Math.min(90, Math.max(5, pct || 50)),
        startsAt,
        endsAt,
        maxQtyPerCustomer: body.maxQtyPerCustomer || 1,
        products: products.map((p) => ({
          product: p._id,
          originalKes: p.priceKes,
          flashKes: Math.max(1, Math.round(p.priceKes * (1 - (pct || 50) / 100))),
          remainingQty: Math.min(body.qtyEach || 10, p.stock),
        })),
      });
      await mongoDrop.populate("products.product");
    }

    const created = upsertDrop({
      ...body,
      discount: body.discount ?? body.discountPercent ?? 0,
      endsAtIso: body.endsAt,
      maxQty: body.maxQty ?? body.maxQtyPerCustomer,
    });
    res.status(201).json({ flashDrop: mongoDrop, drop: created, ...listFlashDrops(req.query) });
  })
);

router.post(
  "/flash-drops/:id/duplicate",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    const copied = duplicateDrop(req.params.id);
    if (!copied) throw httpError(404, "Flash drop not found");
    res.status(201).json({ drop: copied, ...listFlashDrops(req.query) });
  })
);

router.get(
  "/flash-drops/:id",
  asyncHandler(async (req, res) => {
    const drop = getDrop(req.params.id);
    if (!drop) throw httpError(404, "Flash drop not found");
    res.json({ drop });
  })
);

router.patch(
  "/flash-drops/:id",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        isActive: z.boolean().optional(),
        status: z.string().optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        type: z.string().optional(),
        discount: z.number().optional(),
        discountPercent: z.number().optional(),
        stock: z.number().optional(),
        sold: z.number().optional(),
        revenue: z.number().optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
        startLabel: z.string().optional(),
        endLabel: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        originalKes: z.number().optional(),
        flashKes: z.number().optional(),
        maxQty: z.number().optional(),
        reserved: z.number().optional(),
        productSku: z.string().optional(),
        productName: z.string().optional(),
        productId: z.string().optional(),
        showCountdown: z.boolean().optional(),
        allowBackorders: z.boolean().optional(),
        requirePoints: z.boolean().optional(),
        notify: z.boolean().optional(),
        bonusPoints: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isDraft: z.boolean().optional(),
      })
      .parse(req.body);

    if (String(req.params.id).startsWith("fd-")) {
      const patch = { ...body, discount: body.discount ?? body.discountPercent };
      if (body.isActive === false && !body.status) patch.status = "completed";
      if (body.isActive === true && !body.status) patch.status = "live";
      if (body.endsAt) patch.endsAtIso = body.endsAt;
      const updated = upsertDrop(patch, req.params.id);
      if (!updated) throw httpError(404, "Flash drop not found");
      return res.json({ drop: updated, ...listFlashDrops(req.query) });
    }

    if (!isOid(req.params.id)) throw httpError(404, "Flash drop not found");
    const flashDrop = await FlashDrop.findByIdAndUpdate(
      req.params.id,
      { isActive: body.isActive },
      { new: true }
    );
    res.json({ flashDrop });
  })
);

router.delete(
  "/flash-drops/:id",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    if (!removeDrop(req.params.id)) throw httpError(404, "Flash drop not found");
    res.json({ ok: true, ...listFlashDrops(req.query) });
  })
);

router.get(
  "/flash-drop-categories",
  asyncHandler(async (req, res) => {
    res.json(listDropCategories(req.query));
  })
);

router.post(
  "/flash-drop-categories",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        status: z.string().optional(),
        products: z.number().optional(),
        activeDrops: z.number().optional(),
        completed: z.number().optional(),
        avgDiscount: z.number().optional(),
        ico: z.string().optional(),
        tone: z.string().optional(),
      })
      .parse(req.body);
    const category = upsertCategory(body);
    res.status(201).json({ category, ...listDropCategories(req.query) });
  })
);

router.post(
  "/flash-drop-categories/reorder",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    const body = z.object({ ids: z.array(z.string()) }).parse(req.body);
    reorderCategories(body.ids);
    res.json(listDropCategories(req.query));
  })
);

router.post(
  "/flash-drop-categories/:id/duplicate",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    const copied = duplicateCategory(req.params.id);
    if (!copied) throw httpError(404, "Category not found");
    res.status(201).json({ category: copied, ...listDropCategories(req.query) });
  })
);

router.patch(
  "/flash-drop-categories/:id/rules",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        category: z.string().min(1),
        maxDiscount: z.number().optional(),
        minStock: z.number().optional(),
        eligible: z.boolean().optional(),
        backorders: z.boolean().optional(),
        requirePoints: z.boolean().optional(),
        maxDrops: z.number().optional(),
      })
      .parse(req.body);
    const rules = saveRules(body.category, body);
    res.json({ rules, ...listDropCategories(req.query) });
  })
);

router.patch(
  "/flash-drop-categories/:id",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        products: z.number().optional(),
        activeDrops: z.number().optional(),
        completed: z.number().optional(),
        avgDiscount: z.number().optional(),
        ico: z.string().optional(),
        tone: z.string().optional(),
      })
      .parse(req.body);
    const category = upsertCategory(body, req.params.id);
    if (!category) throw httpError(404, "Category not found");
    res.json({ category, ...listDropCategories(req.query) });
  })
);

router.delete(
  "/flash-drop-categories/:id",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    if (!removeCategory(req.params.id)) throw httpError(404, "Category not found");
    res.json({ ok: true, ...listDropCategories(req.query) });
  })
);

router.get(
  "/flash-drop-analytics",
  asyncHandler(async (_req, res) => {
    res.json(getFlashDropAnalytics());
  })
);

router.get(
  "/flash-drop-participants",
  asyncHandler(async (req, res) => {
    res.json(listFlashDropParticipants(req.query));
  })
);

router.get(
  "/flash-drop-history",
  asyncHandler(async (req, res) => {
    res.json(listFlashDropHistory(req.query));
  })
);

router.get(
  "/flash-drop-settings",
  asyncHandler(async (_req, res) => {
    res.json(getFlashDropSettings());
  })
);

router.put(
  "/flash-drop-settings",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    res.json(saveFlashDropSettings(req.body || {}));
  })
);

router.post(
  "/flash-drop-settings/reset",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (_req, res) => {
    res.json(resetFlashDropSettings());
  })
);

router.get(
  "/flash-drop-logs",
  asyncHandler(async (req, res) => {
    res.json(listFlashDropLogs(req.query));
  })
);

router.get(
  "/flash-drop-reports",
  asyncHandler(async (_req, res) => {
    res.json(getFlashDropReports());
  })
);

router.get(
  "/flash-drop-system-settings",
  asyncHandler(async (_req, res) => {
    res.json(getFlashDropSystemSettings());
  })
);

router.put(
  "/flash-drop-system-settings",
  requireRoles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER"),
  asyncHandler(async (req, res) => {
    res.json(saveFlashDropSystemSettings(req.body || {}));
  })
);

router.get(
  "/points",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate({ ...req.query, limit: req.query.limit || 10 });
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toUpperCase();
    const customer = String(req.query.customer || "").trim();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const customerIds = (await User.find({ role: "CUSTOMER" }).select("_id")).map((u) => u._id);
    const filter = {};
    if (type === "earn") filter.type = { $nin: ["REDEEM", "ADMIN", "EXPIRE"] };
    else if (type === "redeem") filter.type = "REDEEM";
    else if (type === "adjust") filter.type = "ADMIN";
    else if (type === "expire") filter.type = "EXPIRE";
    if (status) filter.status = status;
    if (customer && isOid(customer)) filter.user = customer;
    else filter.user = { $in: customerIds };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      const users = await User.find({
        role: "CUSTOMER",
        $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }, { customerNumber: rx }],
      }).select("_id");
      filter.$or = [{ user: { $in: users.map((u) => u._id) } }, { reference: rx }, { description: rx }];
    }

    const thisM = monthBounds(0);
    const lastM = monthBounds(-1);
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const customerMatch = { user: { $in: customerIds } };

    const [
      total,
      rows,
      issued,
      issuedThis,
      issuedLast,
      redeemedThis,
      redeemedLast,
      earnedThis,
      earnedLast,
      redeemedAll,
      memberAgg,
      activeEarners,
      expiringAgg,
      rules,
      leaders,
      customers,
      settingsDocs,
    ] = await Promise.all([
      PointsTransaction.countDocuments(filter),
      PointsTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "firstName lastName customerNumber avatarUrl phone email pointsBalance"),
      sumPoints({ ...customerMatch, points: { $gt: 0 } }),
      sumPoints({ ...customerMatch, points: { $gt: 0 }, createdAt: { $gte: thisM.start, $lt: thisM.end } }),
      sumPoints({ ...customerMatch, points: { $gt: 0 }, createdAt: { $gte: lastM.start, $lt: lastM.end } }),
      sumPoints({ ...customerMatch, type: "REDEEM", createdAt: { $gte: thisM.start, $lt: thisM.end } }),
      sumPoints({ ...customerMatch, type: "REDEEM", createdAt: { $gte: lastM.start, $lt: lastM.end } }),
      sumPoints({ ...customerMatch, points: { $gt: 0 }, createdAt: { $gte: thisM.start, $lt: thisM.end } }),
      sumPoints({ ...customerMatch, points: { $gt: 0 }, createdAt: { $gte: lastM.start, $lt: lastM.end } }),
      sumPoints({ ...customerMatch, type: "REDEEM" }),
      User.aggregate([
        { $match: { role: "CUSTOMER" } },
        {
          $group: {
            _id: null,
            totalMembers: { $sum: 1 },
            membersWithPoints: { $sum: { $cond: [{ $gt: ["$pointsBalance", 0] }, 1, 0] } },
            outstanding: { $sum: { $ifNull: ["$pointsBalance", 0] } },
          },
        },
      ]),
      PointsTransaction.distinct("user", {
        user: { $in: customerIds },
        points: { $gt: 0 },
        createdAt: { $gte: thisM.start, $lt: thisM.end },
      }),
      PointsTransaction.aggregate([
        {
          $match: {
            user: { $in: customerIds },
            points: { $gt: 0 },
            status: { $ne: "EXPIRED" },
            expiresAt: { $gte: new Date(), $lte: in30 },
          },
        },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
      PointsRule.find().sort({ priority: 1, name: 1 }),
      User.find({ role: "CUSTOMER" }).sort({ pointsBalance: -1 }).limit(8).select("firstName lastName customerNumber avatarUrl pointsBalance"),
      User.find({ role: "CUSTOMER" }).sort({ customerNumber: 1 }).select("firstName lastName customerNumber pointsBalance"),
      Setting.find({ key: { $in: ["pointsExpiryDays", "pointsKesPerPoint", "pointsExpiryType", "pointsExpiryMinBalance", "pointsAutoExpiry", "pointsRemindersEnabled", "pointsExpiryReminders"] } }),
    ]);

    const userIds = [...new Set(rows.map((t) => String(t.user?._id || t.user || "")))].filter(Boolean);
    const ledger = await PointsTransaction.find({ user: { $in: userIds } }).sort({ createdAt: 1, _id: 1 }).select("user points").lean();
    const running = {};
    const afterMap = {};
    for (const t of ledger) {
      const uid = String(t.user);
      running[uid] = (running[uid] || 0) + (t.points || 0);
      afterMap[String(t._id)] = running[uid];
    }

    const settingMap = Object.fromEntries(settingsDocs.map((s) => [s.key, s.value]));
    const members = memberAgg[0] || {};
    const purchase = rules.find((r) => r.key === "PURCHASE");
    let kesPerPoint = Number(settingMap.pointsKesPerPoint || 10);
    try {
      const cfg = JSON.parse(purchase?.configJson || "{}");
      if (cfg.kesPerPoint) kesPerPoint = Number(cfg.kesPerPoint);
    } catch {
      /* ignore */
    }

    const expiryDocs = await PointsTransaction.find({
      $or: [{ expiresAt: { $ne: null } }, { type: "EXPIRE" }],
    })
      .sort({ expiresAt: 1 })
      .populate("user", "firstName lastName customerNumber avatarUrl pointsBalance phone email membershipLevel");

    const expiry = buildExpiry(expiryDocs, settingMap, kesPerPoint);

    res.json({
      transactions: rows.map((t) => {
        const json = t.toJSON();
        const kind = pointKind(json);
        const u = json.user && typeof json.user === "object" ? json.user : null;
        return {
          ...json,
          kind,
          kindLabel: kindLabel(kind),
          balanceAfter: afterMap[json.id] ?? u?.pointsBalance ?? 0,
          customer: u
            ? {
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                customerNumber: u.customerNumber,
                avatarUrl: u.avatarUrl,
                phone: u.phone,
                email: u.email,
                pointsBalance: u.pointsBalance,
              }
            : null,
        };
      }),
      total,
      page,
      limit,
      stats: {
        issued,
        issuedPct: pctChange1(issuedThis, issuedLast),
        redeemed: Math.abs(redeemedAll),
        redeemedThisMonth: Math.abs(redeemedThis),
        redeemedPct: pctChange1(Math.abs(redeemedThis), Math.abs(redeemedLast)),
        earnedThisMonth: earnedThis,
        earnedPct: pctChange1(earnedThis, earnedLast),
        available: members.outstanding || 0,
      },
      summary: {
        totalMembers: members.totalMembers || 0,
        activeEarning: activeEarners.length,
        membersWithPoints: members.membersWithPoints || 0,
        outstanding: members.outstanding || 0,
        expiring30: expiringAgg[0]?.total || 0,
      },
      leaders: leaders.map((u, i) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        customerNumber: u.customerNumber,
        avatarUrl: u.avatarUrl,
        pointsBalance: u.pointsBalance || 0,
        rank: i + 1,
      })),
      rules,
      rewards: rules.filter((r) => String(r.key || "").startsWith("REDEEM_") || r.ruleType === "redeem"),
      customers: customers.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        customerNumber: u.customerNumber,
        pointsBalance: u.pointsBalance || 0,
      })),
      expiring: expiry.rows.filter((t) => t.expiryStatus !== "expired"),
      expiry,
      settings: {
        expiryDays: Number(settingMap.pointsExpiryDays || 365),
        kesPerPoint,
        expiryType: settingMap.pointsExpiryType || "automatic",
        minBalance: Number(settingMap.pointsExpiryMinBalance || 100),
        autoExpiry: settingMap.pointsAutoExpiry !== "false",
        remindersEnabled: settingMap.pointsRemindersEnabled !== "false",
      },
    });
  })
);

router.post(
  "/points/adjust",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string().min(1),
        points: z.coerce.number().int(),
        kind: z.enum(["earn", "redeem", "adjust", "expire"]).default("adjust"),
        note: z.string().optional(),
        reference: z.string().optional(),
      })
      .parse(req.body);
    const user = await User.findById(body.userId);
    if (!user) throw httpError(404, "Customer not found");
    const abs = Math.abs(body.points);
    if (!abs) throw httpError(400, "Points must not be zero");
    const signed = body.kind === "redeem" || body.kind === "expire" ? -abs : abs;
    if ((user.pointsBalance || 0) + signed < 0) throw httpError(400, "Insufficient points");
    const type = { earn: "BONUS", redeem: "REDEEM", adjust: "ADMIN", expire: "EXPIRE" }[body.kind];
    const note =
      body.note ||
      { earn: "Admin bonus points", redeem: "Redeemed points", adjust: "Admin adjustment", expire: "Points expired" }[body.kind];
    const extra = {};
    if (body.kind === "expire") extra.status = "EXPIRED";
    if (body.kind === "earn") {
      const days = Number((await Setting.findOne({ key: "pointsExpiryDays" }))?.value || 365);
      extra.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    const txn = await creditPoints(user._id, type, signed, note, body.reference || "", extra);
    const fresh = await User.findById(user._id);
    res.status(201).json({ transaction: txn, pointsBalance: fresh?.pointsBalance || 0 });
  })
);

router.post(
  "/points/bulk",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        items: z
          .array(
            z.object({
              userId: z.string().optional(),
              phone: z.string().optional(),
              customerNumber: z.string().optional(),
              points: z.coerce.number().int(),
              kind: z.enum(["earn", "redeem", "adjust", "expire"]).default("adjust"),
              note: z.string().optional(),
              reference: z.string().optional(),
            })
          )
          .min(1),
      })
      .parse(req.body);
    let created = 0;
    const errors = [];
    for (const item of body.items) {
      try {
        let user = null;
        if (item.userId && isOid(item.userId)) user = await User.findById(item.userId);
        if (!user && item.phone) user = await User.findOne({ phone: item.phone, role: "CUSTOMER" });
        if (!user && item.customerNumber) {
          user = await User.findOne({ customerNumber: new RegExp(`^${escapeRegex(item.customerNumber)}$`, "i") });
        }
        if (!user) {
          errors.push(item.phone || item.customerNumber || "unknown");
          continue;
        }
        const abs = Math.abs(item.points);
        if (!abs) continue;
        const signed = item.kind === "redeem" || item.kind === "expire" ? -abs : abs;
        if ((user.pointsBalance || 0) + signed < 0) {
          errors.push(user.customerNumber || user.phone);
          continue;
        }
        const type = { earn: "BONUS", redeem: "REDEEM", adjust: "ADMIN", expire: "EXPIRE" }[item.kind];
        await creditPoints(user._id, type, signed, item.note || "Bulk points upload", item.reference || "");
        created += 1;
      } catch {
        errors.push(item.phone || item.customerNumber || "unknown");
      }
    }
    res.json({ created, errors });
  })
);

router.post(
  "/points/expire",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({ txnId: z.string().optional(), run: z.boolean().optional() }).parse(req.body);
    const due = [];
    if (body.txnId) {
      const one = await PointsTransaction.findById(body.txnId);
      if (!one) throw httpError(404, "Transaction not found");
      due.push(one);
    } else {
      const found = await PointsTransaction.find({
        points: { $gt: 0 },
        status: { $ne: "EXPIRED" },
        expiresAt: { $lte: new Date() },
      });
      due.push(...found);
    }
    let expired = 0;
    for (const t of due) {
      if (t.status === "EXPIRED") continue;
      t.status = "EXPIRED";
      await t.save();
      await creditPoints(t.user, "EXPIRE", -Math.abs(t.points || 0), `Expired: ${t.description || t.type}`, t.reference || "", {
        status: "EXPIRED",
      });
      expired += 1;
    }
    res.json({ expired });
  })
);

router.patch(
  "/points/settings",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        expiryDays: z.coerce.number().int().min(1).max(3650).optional(),
        kesPerPoint: z.coerce.number().int().min(1).optional(),
        expiryType: z.enum(["automatic", "manual"]).optional(),
        minBalance: z.coerce.number().int().min(0).optional(),
        autoExpiry: z.boolean().optional(),
        remindersEnabled: z.boolean().optional(),
      })
      .parse(req.body);
    if (body.expiryDays) {
      await Setting.findOneAndUpdate({ key: "pointsExpiryDays" }, { value: String(body.expiryDays) }, { upsert: true });
    }
    if (body.kesPerPoint) {
      await Setting.findOneAndUpdate({ key: "pointsKesPerPoint" }, { value: String(body.kesPerPoint) }, { upsert: true });
      const purchase = await PointsRule.findOne({ key: "PURCHASE" });
      if (purchase) {
        let cfg = {};
        try {
          cfg = JSON.parse(purchase.configJson || "{}");
        } catch {
          cfg = {};
        }
        cfg.kesPerPoint = body.kesPerPoint;
        purchase.configJson = JSON.stringify(cfg);
        await purchase.save();
      }
    }
    if (body.expiryType) {
      await Setting.findOneAndUpdate({ key: "pointsExpiryType" }, { value: body.expiryType }, { upsert: true });
    }
    if (body.minBalance != null) {
      await Setting.findOneAndUpdate({ key: "pointsExpiryMinBalance" }, { value: String(body.minBalance) }, { upsert: true });
    }
    if (body.autoExpiry !== undefined) {
      await Setting.findOneAndUpdate({ key: "pointsAutoExpiry" }, { value: String(body.autoExpiry) }, { upsert: true });
    }
    if (body.remindersEnabled !== undefined) {
      await Setting.findOneAndUpdate({ key: "pointsRemindersEnabled" }, { value: String(body.remindersEnabled) }, { upsert: true });
    }
    res.json({ ok: true });
  })
);

router.post(
  "/points/reminders",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({ txnId: z.string().optional(), allSoon: z.boolean().optional() }).parse(req.body);
    const filter = {
      points: { $gt: 0 },
      status: { $ne: "EXPIRED" },
      expiresAt: { $ne: null, $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
    };
    if (body.txnId) filter._id = body.txnId;
    const rows = await PointsTransaction.find(filter).populate("user", "firstName lastName");
    const doc = await Setting.findOne({ key: "pointsExpiryReminders" });
    let log = [];
    try {
      log = JSON.parse(doc?.value || "[]");
    } catch {
      log = [];
    }
    const added = rows.map((t) => ({
      at: new Date().toISOString(),
      customer: `${t.user?.firstName || ""} ${t.user?.lastName || ""}`.trim() || "Customer",
      channel: "Email",
      points: t.points,
      status: "Sent",
    }));
    log = [...added, ...log].slice(0, 50);
    await Setting.findOneAndUpdate({ key: "pointsExpiryReminders" }, { value: JSON.stringify(log) }, { upsert: true });
    res.json({ sent: added.length, reminders: log });
  })
);

const ruleBody = z.object({
  name: z.string().min(2).optional(),
  key: z.string().min(2).optional(),
  points: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  configJson: z.string().optional(),
  ruleType: z.string().optional(),
  trigger: z.string().optional(),
  conditionValue: z.string().optional(),
  limit: z.string().optional(),
  priority: z.coerce.number().int().min(1).max(99).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  stock: z.coerce.number().int().optional(),
  redeemedCount: z.coerce.number().int().optional(),
  imageUrl: z.string().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

function ruleKeyFromName(name) {
  return String(name || "RULE")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "RULE";
}

async function applyPurchaseConfig(payload) {
  if (payload.trigger === "amount_spent" && payload.conditionValue) {
    let cfg = {};
    try {
      cfg = JSON.parse(payload.configJson || "{}");
    } catch {
      cfg = {};
    }
    cfg.kesPerPoint = Number(payload.conditionValue);
    payload.configJson = JSON.stringify(cfg);
  }
  return payload;
}

router.get(
  "/points-rules",
  asyncHandler(async (_req, res) => {
    const rules = await PointsRule.find().sort({ priority: 1, name: 1 });
    res.json({ rules });
  })
);

router.post(
  "/points-rules",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = ruleBody.parse(req.body);
    if (!body.name) throw httpError(400, "Rule name is required");
    let key = body.key;
    if (!key) {
      const base = ruleKeyFromName(body.name);
      key = body.ruleType === "redeem" && !base.startsWith("REDEEM_") ? `REDEEM_${base}` : base;
    }
    const exists = await PointsRule.findOne({ key });
    if (exists) key = `${key}_${randomCode("", 4)}`;
    const payload = await applyPurchaseConfig({
      name: body.name,
      key,
      points: body.points ?? 0,
      isActive: body.isActive !== false,
      configJson: body.configJson || "{}",
      ruleType: body.ruleType || "engagement",
      trigger: body.trigger || "",
      conditionValue: body.conditionValue || "",
      limit: body.limit || "none",
      priority: body.priority || 10,
      description: body.description || "",
      category: body.category || "",
      stock: body.stock ?? -1,
      redeemedCount: body.redeemedCount || 0,
      imageUrl: body.imageUrl || "",
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    });
    const rule = await PointsRule.create(payload);
    res.status(201).json({ rule });
  })
);

router.patch(
  "/points-rules/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = await applyPurchaseConfig(ruleBody.parse(req.body));
    if ("startsAt" in body) {
      const d = body.startsAt ? new Date(body.startsAt) : null;
      body.startsAt = d && !Number.isNaN(d.getTime()) ? d : null;
    }
    if ("endsAt" in body) {
      const d = body.endsAt ? new Date(body.endsAt) : null;
      body.endsAt = d && !Number.isNaN(d.getTime()) ? d : null;
    }
    const rule = await PointsRule.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!rule) throw httpError(404, "Rule not found");
    res.json({ rule });
  })
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const [categories, brands, productCounts] = await Promise.all([
      Category.find().sort({ sortOrder: 1, name: 1 }),
      Brand.find().sort({ sortOrder: 1, name: 1 }),
      Product.aggregate([{ $group: { _id: "$category", n: { $sum: 1 } } }]),
    ]);
    const countMap = Object.fromEntries(productCounts.map((c) => [String(c._id), c.n]));
    const childMap = {};
    for (const c of categories) {
      const pid = c.parent ? String(c.parent) : "";
      if (pid) childMap[pid] = (childMap[pid] || 0) + 1;
    }
    const rows = categories.map((c) => {
      const json = c.toJSON();
      return {
        ...json,
        parentId: json.parent ? String(json.parent) : "",
        productCount: countMap[json.id] || 0,
        childCount: childMap[json.id] || 0,
      };
    });
    const subs = rows.filter((c) => c.parentId).length;
    res.json({
      categories: rows,
      brands,
      stats: {
        total: rows.length,
        active: rows.filter((c) => c.isActive).length,
        hidden: rows.filter((c) => !c.isActive).length,
        subcategories: subs,
      },
    });
  })
);

const categoryBody = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const body = categoryBody.parse(req.body);
    const last = await Category.findOne().sort({ sortOrder: -1 });
    const category = await Category.create({
      name: body.name,
      slug: slugify(body.slug || body.name),
      description: (body.description || "").slice(0, 160),
      imageUrl: body.imageUrl || "",
      parent: body.parentId || null,
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder ?? (last ? last.sortOrder + 1 : 1),
    });
    res.status(201).json({ category });
  })
);

router.patch(
  "/categories/reorder",
  asyncHandler(async (req, res) => {
    const body = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    await Promise.all(body.ids.map((id, i) => Category.updateOne({ _id: id }, { sortOrder: i + 1 })));
    res.json({ ok: true });
  })
);

router.patch(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const body = categoryBody.partial().parse(req.body);
    const category = await Category.findById(req.params.id);
    if (!category) throw httpError(404, "Category not found");
    if (body.name) category.name = body.name;
    if (body.slug) category.slug = slugify(body.slug);
    if (body.description !== undefined) category.description = body.description.slice(0, 160);
    if (body.imageUrl !== undefined) category.imageUrl = body.imageUrl;
    if (body.parentId !== undefined) {
      if (body.parentId && String(body.parentId) === String(category._id)) {
        throw httpError(400, "A category cannot be its own parent");
      }
      category.parent = body.parentId || null;
    }
    if (body.isActive !== undefined) category.isActive = body.isActive;
    if (body.sortOrder !== undefined) category.sortOrder = body.sortOrder;
    await category.save();
    res.json({ category });
  })
);

router.delete(
  "/categories/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.countDocuments({ category: id });
    if (products) throw httpError(400, "Move or delete products in this category first");
    const children = await Category.countDocuments({ parent: id });
    if (children) throw httpError(400, "Remove sub categories first");
    await Category.deleteOne({ _id: id });
    res.json({ ok: true });
  })
);

router.get(
  "/brands",
  asyncHandler(async (_req, res) => {
    const [brands, productCounts] = await Promise.all([
      Brand.find().sort({ sortOrder: 1, name: 1 }),
      Product.aggregate([{ $group: { _id: "$brand", n: { $sum: 1 } } }]),
    ]);
    const countMap = Object.fromEntries(productCounts.map((c) => [String(c._id), c.n]));
    const rows = brands.map((b) => {
      const json = b.toJSON();
      return { ...json, productCount: countMap[json.id] || 0 };
    });
    res.json({
      brands: rows,
      stats: {
        total: rows.length,
        active: rows.filter((b) => b.isActive !== false).length,
        hidden: rows.filter((b) => b.isActive === false).length,
        products: rows.reduce((sum, b) => sum + b.productCount, 0),
      },
    });
  })
);

const brandBody = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/brands",
  asyncHandler(async (req, res) => {
    const body = brandBody.parse(req.body);
    const last = await Brand.findOne().sort({ sortOrder: -1 });
    const brand = await Brand.create({
      name: body.name,
      slug: slugify(body.slug || body.name),
      description: (body.description || "").slice(0, 160),
      logoUrl: body.logoUrl || "",
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder ?? (last ? last.sortOrder + 1 : 1),
    });
    res.status(201).json({ brand });
  })
);

router.patch(
  "/brands/reorder",
  asyncHandler(async (req, res) => {
    const body = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    await Promise.all(body.ids.map((id, i) => Brand.updateOne({ _id: id }, { sortOrder: i + 1 })));
    res.json({ ok: true });
  })
);

router.patch(
  "/brands/:id",
  asyncHandler(async (req, res) => {
    const body = brandBody.partial().parse(req.body);
    const brand = await Brand.findById(req.params.id);
    if (!brand) throw httpError(404, "Brand not found");
    if (body.name) brand.name = body.name;
    if (body.slug) brand.slug = slugify(body.slug);
    if (body.description !== undefined) brand.description = body.description.slice(0, 160);
    if (body.logoUrl !== undefined) brand.logoUrl = body.logoUrl;
    if (body.isActive !== undefined) brand.isActive = body.isActive;
    if (body.sortOrder !== undefined) brand.sortOrder = body.sortOrder;
    await brand.save();
    res.json({ brand });
  })
);

router.delete(
  "/brands/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const products = await Product.countDocuments({ brand: req.params.id });
    if (products) throw httpError(400, "Move or delete products using this brand first");
    await Brand.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  })
);

function parseValues(raw) {
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  return String(raw || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

router.get(
  "/attributes",
  asyncHandler(async (_req, res) => {
    const [groups, attributes, specCounts] = await Promise.all([
      AttributeGroup.find().sort({ sortOrder: 1, name: 1 }),
      Attribute.find().sort({ sortOrder: 1, name: 1 }),
      Product.aggregate([
        { $unwind: { path: "$specs", preserveNullAndEmptyArrays: false } },
        { $group: { _id: { $toLower: "$specs.name" }, n: { $sum: 1 } } },
      ]),
    ]);
    const useMap = Object.fromEntries(specCounts.map((c) => [c._id, c.n]));
    const groupJson = groups.map((g) => g.toJSON());
    const groupById = Object.fromEntries(groupJson.map((g) => [g.id, g]));
    const attrCount = {};
    const rows = attributes.map((a) => {
      const json = a.toJSON();
      const gid = json.group ? String(json.group) : "";
      if (gid) attrCount[gid] = (attrCount[gid] || 0) + 1;
      const group = groupById[gid];
      return {
        ...json,
        groupId: gid,
        groupName: group?.name || "Ungrouped",
        usedIn: useMap[String(json.name || "").toLowerCase()] || 0,
      };
    });
    res.json({
      attributes: rows,
      groups: groupJson.map((g) => ({ ...g, attributeCount: attrCount[g.id] || 0 })),
      stats: {
        total: rows.length,
        active: rows.filter((a) => a.isActive !== false).length,
        hidden: rows.filter((a) => a.isActive === false).length,
        groups: groupJson.length,
      },
    });
  })
);

const groupBody = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  isGlobal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/attribute-groups",
  asyncHandler(async (req, res) => {
    const body = groupBody.parse(req.body);
    const last = await AttributeGroup.findOne().sort({ sortOrder: -1 });
    const group = await AttributeGroup.create({
      name: body.name,
      slug: slugify(body.slug || body.name),
      description: body.description || "",
      isGlobal: Boolean(body.isGlobal),
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder ?? (last ? last.sortOrder + 1 : 1),
    });
    res.status(201).json({ group });
  })
);

router.patch(
  "/attribute-groups/reorder",
  asyncHandler(async (req, res) => {
    const body = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    await Promise.all(body.ids.map((id, i) => AttributeGroup.updateOne({ _id: id }, { sortOrder: i + 1 })));
    res.json({ ok: true });
  })
);

router.patch(
  "/attribute-groups/:id",
  asyncHandler(async (req, res) => {
    const body = groupBody.partial().parse(req.body);
    const group = await AttributeGroup.findById(req.params.id);
    if (!group) throw httpError(404, "Attribute group not found");
    if (body.name) group.name = body.name;
    if (body.slug) group.slug = slugify(body.slug);
    if (body.description !== undefined) group.description = body.description;
    if (body.isGlobal !== undefined) group.isGlobal = body.isGlobal;
    if (body.isActive !== undefined) group.isActive = body.isActive;
    if (body.sortOrder !== undefined) group.sortOrder = body.sortOrder;
    await group.save();
    res.json({ group });
  })
);

router.delete(
  "/attribute-groups/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const n = await Attribute.countDocuments({ group: req.params.id });
    if (n) throw httpError(400, "Remove attributes in this group first");
    await AttributeGroup.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  })
);

const attributeBody = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  groupId: z.string().optional(),
  type: z.enum(["select", "number", "text", "boolean"]).optional(),
  displayType: z.enum(["dropdown", "radio", "checkbox", "swatch"]).optional(),
  values: z.union([z.array(z.string()), z.string()]).optional(),
  isGlobal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

async function resolveGroup(groupId) {
  if (!groupId) return null;
  const group = await AttributeGroup.findById(groupId);
  if (!group) throw httpError(400, "Attribute group not found");
  return group;
}

router.post(
  "/attributes/import",
  asyncHandler(async (req, res) => {
    const body = z.object({ items: z.array(z.object({
      name: z.string().optional(),
      group: z.string().optional(),
      groupName: z.string().optional(),
      slug: z.string().optional(),
      type: z.string().optional(),
      displayType: z.string().optional(),
      values: z.union([z.array(z.string()), z.string()]).optional(),
      isGlobal: z.boolean().optional(),
      isActive: z.boolean().optional(),
      status: z.string().optional(),
    }).passthrough()).min(1) }).parse(req.body);
    let created = 0;
    for (const item of body.items) {
      const name = String(item.name || "").trim();
      if (name.length < 2) continue;
      const groupName = String(item.group || item.groupName || "").trim();
      let group = null;
      if (groupName) {
        group = await AttributeGroup.findOne({ $or: [{ name: groupName }, { slug: slugify(groupName) }] });
        if (!group) {
          const last = await AttributeGroup.findOne().sort({ sortOrder: -1 });
          group = await AttributeGroup.create({
            name: groupName,
            slug: slugify(groupName),
            sortOrder: last ? last.sortOrder + 1 : 1,
          });
        }
      }
      const last = await Attribute.findOne().sort({ sortOrder: -1 });
      await Attribute.create({
        name,
        slug: slugify(item.slug || name) + `-${Date.now().toString(36).slice(-4)}-${created}`,
        group: group?._id || null,
        type: ["select", "number", "text", "boolean"].includes(item.type) ? item.type : "select",
        displayType: ["dropdown", "radio", "checkbox", "swatch"].includes(item.displayType) ? item.displayType : "dropdown",
        values: parseValues(item.values),
        isGlobal: Boolean(item.isGlobal) || Boolean(group?.isGlobal),
        isActive: item.status === "hidden" || item.isActive === false ? false : true,
        sortOrder: last ? last.sortOrder + 1 + created : created + 1,
      });
      created += 1;
    }
    res.status(201).json({ created });
  })
);

router.post(
  "/attributes",
  asyncHandler(async (req, res) => {
    const body = attributeBody.parse(req.body);
    const group = await resolveGroup(body.groupId);
    const last = await Attribute.findOne().sort({ sortOrder: -1 });
    const attribute = await Attribute.create({
      name: body.name,
      slug: slugify(body.slug || body.name),
      group: group?._id || null,
      type: body.type || "select",
      displayType: body.displayType || "dropdown",
      values: parseValues(body.values),
      isGlobal: body.isGlobal ?? Boolean(group?.isGlobal),
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder ?? (last ? last.sortOrder + 1 : 1),
    });
    res.status(201).json({ attribute });
  })
);

router.patch(
  "/attributes/reorder",
  asyncHandler(async (req, res) => {
    const body = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    await Promise.all(body.ids.map((id, i) => Attribute.updateOne({ _id: id }, { sortOrder: i + 1 })));
    res.json({ ok: true });
  })
);

router.patch(
  "/attributes/:id",
  asyncHandler(async (req, res) => {
    const body = attributeBody.partial().parse(req.body);
    const attribute = await Attribute.findById(req.params.id);
    if (!attribute) throw httpError(404, "Attribute not found");
    if (body.name) attribute.name = body.name;
    if (body.slug) attribute.slug = slugify(body.slug);
    if (body.groupId !== undefined) {
      const group = await resolveGroup(body.groupId);
      attribute.group = group?._id || null;
      if (body.isGlobal === undefined) attribute.isGlobal = Boolean(group?.isGlobal);
    }
    if (body.type) attribute.type = body.type;
    if (body.displayType) attribute.displayType = body.displayType;
    if (body.values !== undefined) attribute.values = parseValues(body.values);
    if (body.isGlobal !== undefined) attribute.isGlobal = body.isGlobal;
    if (body.isActive !== undefined) attribute.isActive = body.isActive;
    if (body.sortOrder !== undefined) attribute.sortOrder = body.sortOrder;
    await attribute.save();
    res.json({ attribute });
  })
);

router.delete(
  "/attributes/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    await Attribute.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  })
);

const COMP_TYPES = ["quiz", "referral", "engagement", "purchase", "lucky_draw"];
const COMP_STATUSES = ["active", "upcoming", "completed", "cancelled"];

function deriveCompStatus(startsAt, endsAt, requested) {
  if (requested && COMP_STATUSES.includes(requested)) return requested;
  const now = Date.now();
  if (startsAt && new Date(startsAt).getTime() > now) return "upcoming";
  if (endsAt && new Date(endsAt).getTime() < now) return "completed";
  return "active";
}

async function nextCompCode() {
  const rows = await Competition.find().select("code");
  let max = 328;
  for (const row of rows) {
    const n = Number(String(row.code || "").replace(/\D/g, ""));
    if (n > max) max = n;
  }
  return `COMP-${max + 1}`;
}

function parseJson(raw) {
  try {
    return JSON.parse(raw || "{}") || {};
  } catch {
    return {};
  }
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function rankedPrizes(prizes = []) {
  const ranks = [];
  let place = 1;
  for (const p of prizes) {
    const count = Math.max(1, Number(p.winners) || 1);
    for (let i = 0; i < count; i += 1) {
      ranks.push({ place, label: ordinal(place), name: p.name, points: p.points || 0 });
      place += 1;
    }
  }
  return ranks;
}

function competitionOverview(doc) {
  const extra = parseJson(doc.overviewJson);
  const participants = doc.participantCount || 0;
  const totalEntries = doc.totalEntries || extra.totalEntries || Math.round(participants * 2.43);
  const completedEntries = doc.completedEntries || extra.completedEntries || Math.round(participants * 0.961);
  const widgets = participantWidgets(doc, extra);
  return {
    pointsAwarded: extra.pointsAwarded || doc.pointsAwarded || 0,
    participantsPct: extra.participantsPct || 18.6,
    entriesPct: extra.entriesPct || 24.3,
    pointsPct: extra.pointsPct || 22.8,
    completionRate: extra.completionRate || (totalEntries ? Number(((completedEntries / Math.max(participants, 1)) * 100).toFixed(1)) : 0),
    prizePoolKes: doc.prizePoolKes || extra.prizePoolKes || 0,
    prizePoolNote: extra.prizePoolNote || "+ Products & Points",
    remainingLabel: extra.remainingLabel || "",
    progressPct: doc.progressPct || extra.progressPct || 0,
    maxAttempts: doc.maxAttempts || extra.maxAttempts || 3,
    pointsParticipation: doc.pointsParticipation ?? extra.pointsParticipation ?? 10,
    pointsCorrect: doc.pointsCorrect ?? extra.pointsCorrect ?? 10,
    totalEntries,
    completedEntries,
    chartRange: extra.chartRange || "7d",
    chart: extra.chart || [],
    leaderboard: extra.leaderboard || [],
    questions: extra.questions || [],
    activity: extra.activity || [],
    entries: extra.entries || [],
    prizes: rankedPrizes(doc.prizes || []),
    participantStats: widgets.stats,
    entryBreakdown: widgets.entryBreakdown,
    channels: widgets.channels,
    participantActivity: widgets.activity,
  };
}

function monthShort(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
}

function competitionStats(rows) {
  const participants = rows.reduce((s, c) => s + (c.participantCount || 0), 0);
  const pointsAwarded = rows.reduce((s, c) => s + (c.pointsAwarded || 0), 0);
  return {
    total: rows.length,
    active: rows.filter((c) => c.status === "active").length,
    upcoming: rows.filter((c) => c.status === "upcoming").length,
    completed: rows.filter((c) => c.status === "completed").length,
    cancelled: rows.filter((c) => c.status === "cancelled").length,
    participants,
    pointsAwarded,
    participantsPct: 18.6,
    pointsPct: 22.8,
  };
}

function competitionAnalytics(rows) {
  const windowStart = new Date("2026-02-01T00:00:00.000Z");
  const windowEnd = new Date("2026-08-01T00:00:00.000Z");
  const inWindow = rows.filter((c) => c.startsAt && c.startsAt >= windowStart && c.startsAt < windowEnd);
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const byMonth = Object.fromEntries(months.map((m) => [m, 0]));
  for (const c of inWindow) {
    const key = monthShort(c.startsAt);
    if (byMonth[key] != null) byMonth[key] += c.participantCount || 0;
  }
  const max = Math.max(...Object.values(byMonth), 1);
  const participants = inWindow.reduce((s, c) => s + (c.participantCount || 0), 0);
  const winners = inWindow.reduce((s, c) => s + (c.winnerCount || 0), 0);
  const pointsAwarded = inWindow.reduce((s, c) => s + (c.pointsAwarded || 0), 0);
  return {
    total: inWindow.length,
    participants,
    winners,
    pointsAwarded,
    avgParticipants: inWindow.length ? Math.round(participants / inWindow.length) : 0,
    trend: months.map((label) => {
      const value = byMonth[label];
      return {
        label,
        participants: value,
        display: value >= 1000 ? `${(Math.floor(value / 100) / 10).toFixed(1)}k` : String(value),
        pct: Math.round((value / max) * 100),
      };
    }),
  };
}

const competitionBody = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  prize: z.string().optional(),
  pointsToWin: z.number().optional(),
  pointsNote: z.string().optional(),
  participantCount: z.number().optional(),
  winnerCount: z.number().optional(),
  pointsAwarded: z.number().optional(),
  imageUrl: z.string().optional(),
  createdBy: z.string().optional(),
  isActive: z.boolean().optional(),
  code: z.string().optional(),
  timezone: z.string().optional(),
  visibility: z.string().optional(),
  whoCanParticipate: z.string().optional(),
  publishState: z.string().optional(),
  estimatedReach: z.number().optional(),
  estimatedReachPct: z.number().optional(),
  prizes: z.array(z.object({
    name: z.string().optional(),
    points: z.number().optional(),
    winners: z.number().optional(),
  }).passthrough()).optional(),
  allowMultipleEntries: z.boolean().optional(),
  requireLogin: z.boolean().optional(),
  showLeaderboard: z.boolean().optional(),
  autoSelectWinners: z.boolean().optional(),
  winnersAnnounced: z.string().optional(),
  resultsVisibility: z.string().optional(),
  pointsAwardedType: z.string().optional(),
  detailsJson: z.string().optional(),
  overviewJson: z.string().optional(),
  totalEntries: z.number().optional(),
  completedEntries: z.number().optional(),
  prizePoolKes: z.number().optional(),
  progressPct: z.number().optional(),
  maxAttempts: z.number().optional(),
  pointsParticipation: z.number().optional(),
  pointsCorrect: z.number().optional(),
});

function applyCompetitionBody(doc, body, { creating, actor } = {}) {
  if (body.title != null) doc.title = body.title.trim();
  if (body.description != null) doc.description = body.description;
  if (body.type && COMP_TYPES.includes(body.type)) doc.type = body.type;
  if (body.category != null) doc.category = body.category;
  if (body.prize != null) doc.prize = body.prize;
  if (body.pointsToWin != null) doc.pointsToWin = body.pointsToWin;
  if (body.pointsNote != null) doc.pointsNote = body.pointsNote;
  if (body.participantCount != null) doc.participantCount = body.participantCount;
  if (body.winnerCount != null) doc.winnerCount = body.winnerCount;
  if (body.pointsAwarded != null) doc.pointsAwarded = body.pointsAwarded;
  if (body.imageUrl != null) doc.imageUrl = body.imageUrl;
  if (body.shortDescription != null) doc.shortDescription = body.shortDescription;
  if (body.timezone != null) doc.timezone = body.timezone;
  if (body.visibility != null) doc.visibility = body.visibility;
  if (body.whoCanParticipate != null) doc.whoCanParticipate = body.whoCanParticipate;
  if (body.publishState != null) doc.publishState = body.publishState;
  if (body.estimatedReach != null) doc.estimatedReach = body.estimatedReach;
  if (body.estimatedReachPct != null) doc.estimatedReachPct = body.estimatedReachPct;
  if (body.prizes != null) {
    doc.prizes = body.prizes;
    if (body.prize == null && body.prizes[0]?.name) doc.prize = body.prizes[0].name;
    if (body.pointsToWin == null && body.prizes[0]?.points != null) doc.pointsToWin = body.prizes[0].points;
  }
  if (body.allowMultipleEntries != null) doc.allowMultipleEntries = body.allowMultipleEntries;
  if (body.requireLogin != null) doc.requireLogin = body.requireLogin;
  if (body.showLeaderboard != null) doc.showLeaderboard = body.showLeaderboard;
  if (body.autoSelectWinners != null) doc.autoSelectWinners = body.autoSelectWinners;
  if (body.winnersAnnounced != null) doc.winnersAnnounced = body.winnersAnnounced;
  if (body.resultsVisibility != null) doc.resultsVisibility = body.resultsVisibility;
  if (body.pointsAwardedType != null) doc.pointsAwardedType = body.pointsAwardedType;
  if (body.detailsJson != null) doc.detailsJson = body.detailsJson;
  if (body.overviewJson != null) doc.overviewJson = body.overviewJson;
  if (body.totalEntries != null) doc.totalEntries = body.totalEntries;
  if (body.completedEntries != null) doc.completedEntries = body.completedEntries;
  if (body.prizePoolKes != null) doc.prizePoolKes = body.prizePoolKes;
  if (body.progressPct != null) doc.progressPct = body.progressPct;
  if (body.maxAttempts != null) doc.maxAttempts = body.maxAttempts;
  if (body.pointsParticipation != null) doc.pointsParticipation = body.pointsParticipation;
  if (body.pointsCorrect != null) doc.pointsCorrect = body.pointsCorrect;
  if (body.startsAt !== undefined) doc.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) doc.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (creating) doc.createdBy = body.createdBy || actor || "Admin User";
  else if (body.createdBy) doc.createdBy = body.createdBy;
  const requested = body.status && COMP_STATUSES.includes(body.status) ? body.status : null;
  if (requested) {
    doc.status = requested;
    if (requested === "cancelled") doc.isActive = false;
  } else if (creating) {
    doc.status = deriveCompStatus(doc.startsAt, doc.endsAt, null);
  }
  if (body.isActive !== undefined && doc.status !== "cancelled") doc.isActive = body.isActive;
}

router.get(
  "/competitions",
  asyncHandler(async (_req, res) => {
    const competitions = await Competition.find().sort({ code: -1 });
    res.json({
      competitions,
      stats: competitionStats(competitions),
      analytics: competitionAnalytics(competitions),
    });
  })
);

router.get(
  "/competitions/analytics",
  asyncHandler(async (_req, res) => {
    const competitions = await Competition.find().select("title code").lean();
    res.json(getCompetitionAnalytics(competitions));
  })
);

router.post(
  "/competitions/import",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({
      items: z.array(z.object({
        title: z.string().optional(),
        name: z.string().optional(),
        type: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
        prize: z.string().optional(),
        pointsToWin: z.union([z.number(), z.string()]).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }).passthrough()).min(1),
    }).parse(req.body);
    let created = 0;
    const actor = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Admin User";
    for (const item of body.items) {
      const title = String(item.title || item.name || "").trim();
      if (title.length < 2) continue;
      const rawType = String(item.type || "quiz").toLowerCase().replace(/\s+/g, "_");
      const type = COMP_TYPES.includes(rawType) ? rawType : "quiz";
      const statusRaw = String(item.status || "").toLowerCase().replace(/\s+/g, "_");
      const doc = new Competition({ code: await nextCompCode() });
      applyCompetitionBody(doc, {
        title,
        description: item.description || "",
        type,
        category: item.category || "General",
        status: COMP_STATUSES.includes(statusRaw) ? statusRaw : undefined,
        startsAt: item.startsAt || item.start || null,
        endsAt: item.endsAt || item.end || null,
        prize: item.prize || "",
        pointsToWin: Number(item.pointsToWin || item.points || 0),
        isActive: item.isActive !== false && statusRaw !== "cancelled",
      }, { creating: true, actor });
      await doc.save();
      created += 1;
    }
    res.status(201).json({ created });
  })
);

router.post(
  "/competitions",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = competitionBody.parse(req.body);
    if (!body.title) throw httpError(400, "Title is required");
    const actor = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Admin User";
    const competition = new Competition({ code: body.code || await nextCompCode() });
    applyCompetitionBody(competition, body, { creating: true, actor });
    await competition.save();
    res.status(201).json({ competition });
  })
);

router.get(
  "/competitions/:id",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const competition = await Competition.findById(req.params.id);
    if (!competition) throw httpError(404, "Competition not found");
    res.json({ competition, overview: competitionOverview(competition) });
  })
);

router.get(
  "/competitions/:id/participants",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const competition = await Competition.findById(req.params.id);
    if (!competition) throw httpError(404, "Competition not found");
    const extra = parseJson(competition.overviewJson);
    res.json(listCompetitionParticipants(competition, extra, req.query));
  })
);

router.get(
  "/competitions/:id/entries",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const competition = await Competition.findById(req.params.id);
    if (!competition) throw httpError(404, "Competition not found");
    const extra = parseJson(competition.overviewJson);
    res.json(listCompetitionEntries(competition, extra, req.query));
  })
);

router.get(
  "/competitions/:id/winners",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const competition = await Competition.findById(req.params.id);
    if (!competition) throw httpError(404, "Competition not found");
    const extra = parseJson(competition.overviewJson);
    res.json(listCompetitionWinners(competition, extra));
  })
);

router.get(
  "/competitions/:id/prizes",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const competition = await Competition.findById(req.params.id);
    if (!competition) throw httpError(404, "Competition not found");
    res.json(listCompetitionPrizes(req.query));
  })
);

router.post(
  "/competitions/:id/prizes",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const created = upsertPrize(req.body || {});
    res.status(201).json({ prize: created, ...listCompetitionPrizes(req.query) });
  })
);

router.patch(
  "/competitions/:id/prizes/:prizeId",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const prize = upsertPrize(req.body || {}, req.params.prizeId);
    if (!prize) throw httpError(404, "Prize not found");
    res.json({ prize, ...listCompetitionPrizes(req.query) });
  })
);

router.delete(
  "/competitions/:id/prizes/:prizeId",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    if (!removePrize(req.params.prizeId)) throw httpError(404, "Prize not found");
    res.json({ ok: true, ...listCompetitionPrizes(req.query) });
  })
);

router.post(
  "/competitions/:id/prizes/:prizeId/duplicate",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const prize = duplicatePrize(req.params.prizeId);
    if (!prize) throw httpError(404, "Prize not found");
    res.status(201).json({ prize, ...listCompetitionPrizes(req.query) });
  })
);

router.patch(
  "/competitions/:id",
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    const competition = await Competition.findById(req.params.id);
    if (!competition) throw httpError(404, "Competition not found");
    const body = competitionBody.parse(req.body);
    applyCompetitionBody(competition, body, { creating: false });
    await competition.save();
    res.json({ competition, overview: competitionOverview(competition) });
  })
);

router.delete(
  "/competitions/:id",
  requireRoles("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    if (!isOid(req.params.id)) throw httpError(404, "Competition not found");
    await Competition.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  })
);

module.exports = router;
