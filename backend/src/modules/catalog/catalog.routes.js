const { Router } = require("express");
const { Category, Brand, Product, Review, Order, isOid } = require("../../models");
const { paginate } = require("../../lib/utils");
const { asyncHandler, httpError } = require("../../middleware/error");
const { activeFlashMap, decorateProduct } = require("../../services/pricing.service");
const { pointsFromPurchase } = require("../../services/points.service");

const router = Router();

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await Category.find({
      isActive: true,
      $or: [{ parent: null }, { parent: { $exists: false } }],
    }).sort({ sortOrder: 1 });
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: countMap[c.id] || 0,
      })),
    });
  })
);

router.get(
  "/brands",
  asyncHandler(async (_req, res) => {
    const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json({ brands });
  })
);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const q = (req.query.q || "").trim();
    const filter = { isActive: true };
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { description: rx }, { sku: rx }];
    }
    if (req.query.category) {
      const cat = await Category.findOne({ slug: req.query.category });
      if (!cat) return res.json({ page, limit, total: 0, products: [] });
      filter.category = cat._id;
    }
    if (req.query.brand) {
      const brand = await Brand.findOne({ slug: req.query.brand, isActive: true });
      if (!brand) return res.json({ page, limit, total: 0, products: [] });
      filter.brand = brand._id;
    }
    if (req.query.trending === "true") filter.isTrending = true;
    if (req.query.minPrice) filter.priceKes = { ...(filter.priceKes || {}), $gte: Number(req.query.minPrice) };
    if (req.query.maxPrice) filter.priceKes = { ...(filter.priceKes || {}), $lte: Number(req.query.maxPrice) };

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ isTrending: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("brand category"),
    ]);
    const flash = await activeFlashMap(products.map((p) => p.id));
    res.json({
      page,
      limit,
      total,
      products: products.map((p) => decorateProduct(p, flash.get(p.id))),
    });
  })
);

router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const q = [{ slug: req.params.id }];
    if (isOid(req.params.id)) q.push({ _id: req.params.id });
    const product = await Product.findOne({ $or: q, isActive: true }).populate("brand category");
    if (!product) throw httpError(404, "Product not found");
    const reviews = await Review.find({ product: product._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("user", "firstName lastName");
    const flash = await activeFlashMap([product.id]);
    const decorated = decorateProduct(product, flash.get(product.id));
    decorated.pointsEstimate = await pointsFromPurchase(decorated.priceKes);
    const [ratingBuckets, soldAgg] = await Promise.all([
      Review.aggregate([
        { $match: { product: product._id } },
        { $group: { _id: "$rating", n: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "COMPLETED" } },
        { $unwind: "$items" },
        { $match: { "items.product": product._id } },
        { $group: { _id: null, n: { $sum: "$items.quantity" } } },
      ]),
    ]);
    const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of ratingBuckets) stars[row._id] = row.n;
    decorated.ratingBreakdown = stars;
    decorated.soldCount = soldAgg[0]?.n || Math.max(decorated.ratingCount || 0, 0);
    decorated.reviews = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      author: `${r.user.firstName} ${r.user.lastName[0]}.`,
    }));
    const related = await Product.find({
      isActive: true,
      category: product.category,
      _id: { $ne: product._id },
    })
      .limit(6)
      .populate("brand category");
    const relatedFlash = await activeFlashMap(related.map((p) => p.id));
    decorated.related = related.map((p) => decorateProduct(p, relatedFlash.get(p.id)));
    res.json({ product: decorated });
  })
);

module.exports = router;
