const { Product, Category, Brand, Order } = require("../../models");
const { paginate } = require("../../lib/utils");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stockStatusOf(p) {
  const stock = Number(p.stock) || 0;
  const lowAt = Number(p.lowStockAt) || 10;
  if (stock <= 0) return "out";
  if (stock <= lowAt) return "low";
  return "in";
}

function fmtDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function fmtDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mapCatalogRow(p, salesMap = {}) {
  const json = typeof p.toJSON === "function" ? p.toJSON() : p;
  const images = (json.images || [])
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const stockStatus = stockStatusOf(json);
  const categoryName = json.category?.name || "Uncategorized";
  const brandName = json.brand?.name || "";
  return {
    id: json.id,
    name: json.name,
    sub: [brandName, categoryName].filter(Boolean).join(" · "),
    sku: json.sku,
    category: categoryName,
    categoryId: json.category?.id || "",
    brand: brandName,
    brandId: json.brand?.id || "",
    supplier: brandName || "Direct",
    priceKes: json.priceKes,
    stock: json.stock,
    isActive: json.isActive !== false,
    stockStatus,
    createdAt: json.createdAt,
    createdLabel: fmtDate(json.createdAt),
    image: images[0]?.url || null,
    sales: salesMap[json.id] || 0,
  };
}

async function getProductsCatalog(query = {}) {
  const { page, limit, skip } = paginate(query);
  const q = (query.q || "").trim();
  const filter = {};

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { sku: rx }, { description: rx }, { shortDescription: rx }, { barcode: rx }];
  }

  if (query.category && query.category !== "all") {
    const cat = await Category.findOne({
      $or: [
        { slug: query.category },
        { name: new RegExp(`^${escapeRegex(query.category)}$`, "i") },
      ],
    });
    if (!cat) {
      return emptyCatalog(page, limit);
    }
    filter.category = cat._id;
  }

  if (query.brand && query.brand !== "all") {
    const brand = await Brand.findOne({
      $or: [
        { slug: query.brand },
        { name: new RegExp(`^${escapeRegex(query.brand)}$`, "i") },
      ],
    });
    if (!brand) {
      return emptyCatalog(page, limit);
    }
    filter.brand = brand._id;
  }

  if (query.supplier && query.supplier !== "all") {
    const brand = await Brand.findOne({
      $or: [
        { slug: query.supplier },
        { name: new RegExp(`^${escapeRegex(query.supplier)}$`, "i") },
      ],
    });
    if (!brand) {
      return emptyCatalog(page, limit);
    }
    filter.brand = brand._id;
  }

  if (query.status === "active" || query.status === "published") filter.isActive = true;
  else if (query.status === "inactive" || query.status === "draft") filter.isActive = false;
  else if (query.status === "in") filter.stock = { $gt: 10 };
  else if (query.status === "low") filter.stock = { $gt: 0, $lte: 10 };
  else if (query.status === "out") filter.stock = 0;

  if (query.stock === "out") filter.stock = 0;
  if (query.stock === "low") filter.stock = { $gt: 0, $lte: 10 };
  if (query.stock === "in") filter.stock = { $gt: 10 };

  const thirty = new Date(Date.now() - 30 * 86400000);
  const sixty = new Date(Date.now() - 60 * 86400000);

  const [
    total,
    products,
    active,
    inactive,
    outOfStock,
    lowStock,
    categoriesCount,
    brandsCount,
    salesRows,
    allForValue,
    new30,
    prev30,
  ] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("brand category"),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: false }),
    Product.countDocuments({ stock: 0 }),
    Product.countDocuments({ stock: { $gt: 0, $lte: 10 } }),
    Category.countDocuments({ isActive: true }),
    Brand.countDocuments({ isActive: true }),
    Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.product", qty: { $sum: "$items.quantity" } } },
    ]),
    Product.find({}).select("priceKes stock category isActive lowStockAt createdAt"),
    Product.countDocuments({ createdAt: { $gte: thirty } }),
    Product.countDocuments({ createdAt: { $gte: sixty, $lt: thirty } }),
  ]);

  const catalogTotal = active + inactive || allForValue.length || total;
  const salesMap = Object.fromEntries(salesRows.map((r) => [String(r._id), r.qty]));
  const stockValue = allForValue.reduce((s, p) => s + (Number(p.priceKes) || 0) * (Number(p.stock) || 0), 0);
  const totalPct = prev30 ? Math.round(((new30 - prev30) / prev30) * 1000) / 10 : new30 ? 100 : 0;

  const categoryCounts = {};
  let inStock = 0;
  let lowCounted = 0;
  let outCounted = 0;
  let inactiveCounted = 0;
  for (const p of allForValue) {
    const key = String(p.category || "other");
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    if (p.isActive === false) {
      inactiveCounted += 1;
      continue;
    }
    const st = stockStatusOf(p);
    if (st === "out") outCounted += 1;
    else if (st === "low") lowCounted += 1;
    else inStock += 1;
  }

  const categoryDocs = await Category.find({ _id: { $in: Object.keys(categoryCounts).filter((id) => id !== "other") } }).select("name");
  const catNameMap = Object.fromEntries(categoryDocs.map((c) => [c.id, c.name]));
  const colors = ["#4F46E5", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#94A3B8"];
  const categoryDonut = Object.entries(categoryCounts)
    .map(([id, value], i) => ({
      key: id,
      name: catNameMap[id] || "Other",
      value,
      pct: catalogTotal ? Math.round((value / catalogTotal) * 1000) / 10 : 0,
      color: colors[i % colors.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topCategories = Object.entries(categoryCounts)
    .map(([id, value]) => ({
      key: id,
      name: catNameMap[id] || "Other",
      value,
      pct: catalogTotal ? Math.round((value / catalogTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const mapped = products.map((p) => mapCatalogRow(p, salesMap));
  const topSelling = [...mapped].sort((a, b) => b.sales - a.sales).slice(0, 5);
  if (topSelling.length < 5) {
    const more = await Product.find({}).sort({ createdAt: -1 }).limit(5).populate("brand category");
    for (const p of more) {
      const row = mapCatalogRow(p, salesMap);
      if (!topSelling.find((t) => t.id === row.id)) topSelling.push(row);
      if (topSelling.length >= 5) break;
    }
  }

  const [categories, brands] = await Promise.all([
    Category.find({ isActive: true, $or: [{ parent: null }, { parent: { $exists: false } }] }).sort({ sortOrder: 1, name: 1 }),
    Brand.find({ isActive: true }).sort({ name: 1 }),
  ]);

  const inventoryTotal = inStock + lowCounted + outCounted + inactiveCounted || catalogTotal;
  const lowPctOfTotal = catalogTotal ? Math.round((lowCounted / catalogTotal) * 1000) / 10 : 0;
  const outPctOfTotal = catalogTotal ? Math.round((outCounted / catalogTotal) * 1000) / 10 : 0;

  return {
    total,
    page,
    limit,
    stats: {
      total: catalogTotal,
      totalPct,
      active,
      activePct: catalogTotal ? Math.round((active / catalogTotal) * 1000) / 10 : 0,
      outOfStock: outCounted || outOfStock,
      outPct: outPctOfTotal,
      lowStock: lowCounted || lowStock,
      lowPct: lowPctOfTotal,
      categories: categoriesCount,
      brands: brandsCount,
      stockValue,
      stockValuePct: totalPct,
      inactive: inactiveCounted || inactive,
    },
    products: mapped,
    meta: {
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      brands: brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
      suppliers: brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
    },
    categoryDonut,
    topCategories,
    topSelling: topSelling.map((p) => ({ name: p.name, sold: p.sales, image: p.image })),
    inventorySummary: [
      { key: "in", name: "In Stock", value: inStock, pct: inventoryTotal ? Math.round((inStock / inventoryTotal) * 1000) / 10 : 0, color: "#22c55e" },
      { key: "low", name: "Low Stock", value: lowCounted || lowStock, pct: inventoryTotal ? Math.round(((lowCounted || lowStock) / inventoryTotal) * 1000) / 10 : 0, color: "#f59e0b" },
      { key: "out", name: "Out of Stock", value: outCounted || outOfStock, pct: inventoryTotal ? Math.round(((outCounted || outOfStock) / inventoryTotal) * 1000) / 10 : 0, color: "#ef4444" },
      { key: "inactive", name: "Inactive", value: inactiveCounted || inactive, pct: inventoryTotal ? Math.round(((inactiveCounted || inactive) / inventoryTotal) * 1000) / 10 : 0, color: "#94a3b8" },
    ],
    stockOverview: [
      { key: "in", name: "In Stock", pct: catalogTotal ? Math.round((inStock / catalogTotal) * 1000) / 10 : 0, value: inStock, color: "#22c55e" },
      { key: "low", name: "Low Stock", pct: catalogTotal ? Math.round(((lowCounted || lowStock) / catalogTotal) * 1000) / 10 : 0, value: lowCounted || lowStock, color: "#f59e0b" },
      { key: "out", name: "Out of Stock", pct: catalogTotal ? Math.round(((outCounted || outOfStock) / catalogTotal) * 1000) / 10 : 0, value: outCounted || outOfStock, color: "#ef4444" },
      { key: "inactive", name: "Inactive", pct: catalogTotal ? Math.round(((inactiveCounted || inactive) / catalogTotal) * 1000) / 10 : 0, value: inactiveCounted || inactive, color: "#94a3b8" },
    ],
    recentActivities: mapped.slice(0, 4).map((p, i) => ({
      id: `ra-${p.id}`,
      text: `${p.name} · ${p.stockStatus === "out" ? "out of stock" : p.stockStatus === "low" ? "low stock" : "in stock"} (${p.stock} units)`,
      atLabel: p.createdLabel,
      tone: ["purple", "green", "orange", "blue"][i % 4],
    })),
  };
}

function emptyCatalog(page, limit) {
  return {
    total: 0,
    page,
    limit,
    stats: {
      total: 0,
      totalPct: 0,
      active: 0,
      activePct: 0,
      outOfStock: 0,
      outPct: 0,
      lowStock: 0,
      lowPct: 0,
      categories: 0,
      brands: 0,
      stockValue: 0,
      stockValuePct: 0,
      inactive: 0,
    },
    products: [],
    meta: { categories: [], brands: [], suppliers: [] },
    categoryDonut: [],
    topCategories: [],
    topSelling: [],
    inventorySummary: [],
    stockOverview: [],
    recentActivities: [],
  };
}

function enrichProductDetail(product, sales = 0) {
  const json = typeof product.toJSON === "function" ? product.toJSON() : product;
  const images = (json.images || [])
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((i) => i.url)
    .filter(Boolean);
  const stockStatus = stockStatusOf(json);
  return {
    ...json,
    brandId: json.brand?.id || json.brandId || "",
    brandName: json.brand?.name || "",
    categoryId: json.category?.id || json.categoryId || "",
    categoryPath: [json.category?.name, json.subCategory].filter(Boolean).join(" > "),
    images,
    primaryImage: images[0] || "",
    galleryCount: images.length,
    galleryMax: 10,
    stockStatus,
    stockStatusLabel: stockStatus === "out" ? "Out of Stock" : stockStatus === "low" ? "Low Stock" : "In Stock",
    available: Math.max(0, (json.stock || 0) - (json.reserved || 0)),
    soldAllTime: sales,
    sales,
    createdLabel: fmtDateTime(json.createdAt),
    updatedLabel: fmtDateTime(json.updatedAt),
    views: json.views || 0,
    orders: sales,
    reviews: json.ratingCount || 0,
    rating: json.ratingAvg || 0,
    warrantyPeriod: json.warranty || "12 months",
    adminNotes: json.notes || "",
    isFeatured: Boolean(json.isTrending),
    auditTrail: [],
  };
}

module.exports = {
  getProductsCatalog,
  enrichProductDetail,
  stockStatusOf,
  mapCatalogRow,
};
