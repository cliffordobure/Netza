const { FlashDrop, Order } = require("../../models");

function fmtLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(d);
  return `${date}, ${time.replace("am", "AM").replace("pm", "PM")}`;
}

function skuFor(doc, index) {
  const year = doc.createdAt ? new Date(doc.createdAt).getFullYear() : new Date().getFullYear();
  return `FD-${year}-${String(index + 1).padStart(4, "0")}`;
}

function discountLabel(type, discount) {
  if (type === "voucher") return "Voucher";
  if (type === "fixed") return `KSh ${Number(discount || 0).toLocaleString("en-KE")} OFF`;
  return `${discount || 0}% OFF`;
}

function typeLabel(type) {
  if (type === "fixed") return "Fixed Price";
  if (type === "voucher") return "Voucher Drop";
  return "Percentage";
}

function resolveStatus(doc) {
  if (doc.isActive === false) return "cancelled";
  const now = Date.now();
  const start = doc.startsAt ? new Date(doc.startsAt).getTime() : 0;
  const end = doc.endsAt ? new Date(doc.endsAt).getTime() : 0;
  if (end && now > end) return "completed";
  if (start && now > start && end && now <= end) return "live";
  if (start && now < start) return "upcoming";
  if (start && now >= start) return "live";
  return "upcoming";
}

function primaryProduct(doc) {
  const item = (doc.products || []).find((p) => p.product);
  return item?.product || null;
}

function categoryName(doc) {
  const p = primaryProduct(doc);
  if (!p) return "General";
  const cat = p.category;
  if (!cat) return "General";
  return typeof cat === "object" ? (cat.name || "General") : String(cat);
}

function imageUrl(doc) {
  const p = primaryProduct(doc);
  const imgs = p?.images;
  if (Array.isArray(imgs) && imgs[0]) return imgs[0];
  return "";
}

function inferType(doc) {
  const cat = categoryName(doc).toLowerCase();
  if (cat.includes("voucher")) return "voucher";
  return "percentage";
}

async function productOrderStats() {
  const rows = await Order.aggregate([
    { $match: { paymentStatus: "COMPLETED", "items.wasFlashDrop": true } },
    { $unwind: "$items" },
    { $match: { "items.wasFlashDrop": true } },
    {
      $group: {
        _id: "$items.product",
        sold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.lineTotalKes" },
      },
    },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), { sold: r.sold || 0, revenue: r.revenue || 0 }]));
}

function dropMetrics(doc, orderStats) {
  let stock = 0;
  let sold = 0;
  let revenue = 0;
  for (const item of doc.products || []) {
    const pid = item.product?._id || item.product;
    stock += Math.max(0, Number(item.remainingQty || 0));
    const stats = orderStats[String(pid)] || { sold: 0, revenue: 0 };
    sold += stats.sold;
    revenue += stats.revenue;
  }
  const total = stock + sold || 1;
  return { stock, sold, revenue, soldPct: Math.round((sold / total) * 100) };
}

function serializeDrop(doc, index, orderStats) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  const p = primaryProduct(doc);
  const type = inferType(doc);
  const discount = json.discountPercent ?? 0;
  const status = resolveStatus(json);
  const metrics = dropMetrics(doc, orderStats);
  const displayName = json.name || p?.name || "Flash Drop";

  return {
    id: json.id || String(json._id),
    n: index + 1,
    sku: skuFor(json, index),
    name: displayName,
    category: categoryName(doc),
    type,
    typeLabel: typeLabel(type),
    discount,
    discountLabel: discountLabel(type, discount),
    status,
    startLabel: fmtLabel(json.startsAt),
    endLabel: fmtLabel(json.endsAt),
    startsAt: json.startsAt,
    endsAt: json.endsAt ? new Date(json.endsAt).toISOString() : null,
    stock: metrics.stock,
    sold: metrics.sold,
    soldPct: metrics.soldPct,
    revenue: metrics.revenue,
    image: imageUrl(doc),
    description: json.description || `${displayName} flash drop on NETZA Kenya.`,
    discountPercent: discount,
    isActive: json.isActive !== false,
    productId: p?.id || (p?._id ? String(p._id) : ""),
    productName: p?.name || "",
    productSku: p?.sku || "",
  };
}

function statsOf(rows) {
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "live").length,
    upcoming: rows.filter((r) => r.status === "upcoming").length,
    completed: rows.filter((r) => r.status === "completed").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    sold: rows.reduce((s, r) => s + (r.sold || 0), 0),
    revenue: rows.reduce((s, r) => s + (r.revenue || 0), 0),
  };
}

function spark(seed) {
  return Array.from({ length: 8 }, (_, i) => 40 + ((seed * (i + 3) * 17) % 55));
}

function widgets(rows) {
  const stats = statsOf(rows);
  const cats = {};
  rows.forEach((r) => {
    cats[r.category] = (cats[r.category] || 0) + 1;
  });
  const avgDiscount = rows.length
    ? rows.reduce((s, r) => s + (r.discount || 0), 0) / rows.length
    : 0;

  return {
    stats,
    overview: [
      { label: "Active", value: stats.active, tone: "green" },
      { label: "Upcoming", value: stats.upcoming, tone: "orange" },
      { label: "Completed", value: stats.completed, tone: "blue" },
      { label: "Items Available", value: rows.reduce((s, r) => s + (r.stock || 0), 0), tone: "purple" },
      { label: "Items Sold", value: stats.sold, tone: "green" },
      { label: "Total Revenue", value: stats.revenue, tone: "green", money: true },
      { label: "Avg. Discount", value: `${avgDiscount.toFixed(1)}%`, tone: "orange" },
    ],
    activeDrops: rows.filter((r) => r.status === "live"),
    analytics: [
      { key: "revenue", label: "Revenue", value: stats.revenue, money: true, hint: "", up: true, tone: "green", spark: spark(4) },
      { key: "sold", label: "Items Sold", value: stats.sold, hint: "", up: true, tone: "purple", spark: spark(7) },
      { key: "discount", label: "Avg. Discount", value: `${avgDiscount.toFixed(1)}%`, hint: "", up: true, tone: "orange", spark: spark(2) },
      { key: "conversion", label: "Conversion Rate", value: "0%", hint: "", up: true, tone: "blue", spark: spark(9) },
    ],
    categories: Object.entries(cats).map(([name, count]) => ({ name, count })),
    participants: [],
    history: rows
      .filter((r) => r.status === "completed")
      .slice(0, 8)
      .map((r) => ({
        title: r.name,
        detail: `${r.sold} sold · ${r.startLabel}`,
        at: r.endLabel,
      })),
  };
}

async function loadAllRows() {
  const [docs, orderStats] = await Promise.all([
    FlashDrop.find()
      .sort({ createdAt: -1 })
      .populate({ path: "products.product", populate: { path: "category" } }),
    productOrderStats(),
  ]);
  return docs.map((doc, i) => serializeDrop(doc, i, orderStats));
}

async function listFlashDrops(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const category = String(query.category || "").trim();
  const type = String(query.type || "").trim().toLowerCase();

  const allRows = await loadAllRows();
  const all = allRows.filter((row) => {
    if (q && !`${row.name} ${row.sku} ${row.category}`.toLowerCase().includes(q)) return false;
    if (status && row.status !== status) return false;
    if (category && row.category !== category) return false;
    if (type && row.type !== type) return false;
    return true;
  });

  const skip = (page - 1) * limit;
  const drops = all.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 }));

  return {
    drops,
    flashDrops: drops,
    total: all.length,
    page,
    limit,
    ...widgets(allRows),
  };
}

function statusToActive(status) {
  if (status === "cancelled" || status === "completed") return false;
  return true;
}

async function upsertDrop(body = {}, dropId) {
  const patch = {};
  if (body.name != null) patch.name = String(body.name).trim() || "Flash Drop";
  if (body.discount != null || body.discountPercent != null) {
    patch.discountPercent = Math.min(90, Math.max(0, Number(body.discount ?? body.discountPercent ?? 50)));
  }
  if (body.startsAt || body.startsAtIso) patch.startsAt = new Date(body.startsAt || body.startsAtIso);
  if (body.endsAt || body.endsAtIso) patch.endsAt = new Date(body.endsAt || body.endsAtIso);
  if (body.maxQty != null || body.maxQtyPerCustomer != null) {
    patch.maxQtyPerCustomer = Math.max(1, Number(body.maxQty ?? body.maxQtyPerCustomer ?? 1));
  }
  if (body.isActive != null) patch.isActive = Boolean(body.isActive);
  if (body.status) patch.isActive = statusToActive(body.status);

  if (dropId) {
    const updated = await FlashDrop.findByIdAndUpdate(dropId, patch, { new: true }).populate({
      path: "products.product",
      populate: { path: "category" },
    });
    if (!updated) return null;
    const orderStats = await productOrderStats();
    const rows = await loadAllRows();
    const idx = rows.findIndex((r) => r.id === String(updated.id));
    return serializeDrop(updated, idx >= 0 ? idx : 0, orderStats);
  }

  const created = await FlashDrop.create({
    name: patch.name || body.name || "Flash Drop",
    discountPercent: patch.discountPercent ?? 50,
    startsAt: patch.startsAt || (body.startsAt ? new Date(body.startsAt) : new Date()),
    endsAt: patch.endsAt || (body.endsAt ? new Date(body.endsAt) : new Date(Date.now() + 12 * 3600000)),
    maxQtyPerCustomer: patch.maxQtyPerCustomer ?? 1,
    isActive: patch.isActive !== false,
    products: [],
  });
  await created.populate({ path: "products.product", populate: { path: "category" } });
  const orderStats = await productOrderStats();
  return serializeDrop(created, 0, orderStats);
}

async function removeDrop(dropId) {
  const result = await FlashDrop.findByIdAndDelete(dropId);
  return Boolean(result);
}

async function duplicateDrop(dropId) {
  const src = await FlashDrop.findById(dropId).lean();
  if (!src) return null;
  const copy = await FlashDrop.create({
    name: `${src.name || "Flash Drop"} (copy)`,
    discountPercent: src.discountPercent ?? 50,
    startsAt: src.startsAt,
    endsAt: src.endsAt,
    maxQtyPerCustomer: src.maxQtyPerCustomer ?? 1,
    isActive: true,
    products: (src.products || []).map((p) => ({
      product: p.product,
      originalKes: p.originalKes,
      flashKes: p.flashKes,
      remainingQty: p.remainingQty,
    })),
  });
  await copy.populate({ path: "products.product", populate: { path: "category" } });
  const orderStats = await productOrderStats();
  return serializeDrop(copy, 0, orderStats);
}

async function getDrop(dropId) {
  const doc = await FlashDrop.findById(dropId).populate({
    path: "products.product",
    populate: { path: "category" },
  });
  if (!doc) return null;
  const orderStats = await productOrderStats();
  const rows = await loadAllRows();
  const idx = rows.findIndex((r) => r.id === String(doc.id));
  return serializeDrop(doc, idx >= 0 ? idx : 0, orderStats);
}

module.exports = {
  listFlashDrops,
  upsertDrop,
  removeDrop,
  duplicateDrop,
  getDrop,
  serializeDrop,
  loadAllRows,
  statsOf,
  fmtLabel,
  productOrderStats,
};
