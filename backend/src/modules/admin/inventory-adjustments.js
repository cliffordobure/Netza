const { InventoryAdjustment, Product } = require("../../models");

const TYPE_LABEL = {
  addition: "Addition",
  deduction: "Deduction",
  correction: "Stock Correction",
  return: "Return to Stock",
};

const ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  MANAGER: "Manager",
};

const ROLE_KEY = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
};

const FILTERS = {
  types: [
    { id: "addition", label: "Addition" },
    { id: "deduction", label: "Deduction" },
    { id: "correction", label: "Stock Correction" },
    { id: "return", label: "Return to Stock" },
  ],
  reasons: [
    { id: "stock-received", label: "Stock Received" },
    { id: "damaged", label: "Damaged" },
    { id: "expired", label: "Expired" },
    { id: "stock-correction", label: "Stock Correction" },
    { id: "lost", label: "Lost" },
    { id: "return-to-stock", label: "Return to Stock" },
  ],
  locations: ["Main Warehouse", "Nairobi DC", "Store Front"],
  users: [
    { id: "super_admin", label: "Super Admin" },
    { id: "admin", label: "Administrator" },
    { id: "manager", label: "Manager" },
  ],
};

const SEED = [
  {
    reference: "ADJ-2026-0482",
    productName: "Samsung Galaxy A54 5G",
    productSku: "SP-A54-128",
    type: "addition",
    typeLabel: "Addition",
    reason: "Stock Received",
    location: "Main Warehouse",
    qtyChange: 20,
    valueKes: 859980,
    userName: "Mercy Wanjiku",
    userRole: "Administrator",
    roleKey: "admin",
    createdAt: new Date("2026-05-27T06:15:00.000Z"),
  },
  {
    reference: "ADJ-2026-0481",
    productName: "HP Pavilion 15 Laptop",
    productSku: "HP-PAV-15",
    type: "deduction",
    typeLabel: "Deduction",
    reason: "Damaged",
    location: "Nairobi DC",
    qtyChange: -1,
    valueKes: -89999,
    userName: "Admin User",
    userRole: "Super Admin",
    roleKey: "super_admin",
    createdAt: new Date("2026-05-27T05:42:00.000Z"),
  },
  {
    reference: "ADJ-2026-0480",
    productName: "Sony WH-CH520 Headphones",
    productSku: "SNY-CH520",
    type: "deduction",
    typeLabel: "Deduction",
    reason: "Stock Correction",
    location: "Store Front",
    qtyChange: -2,
    valueKes: -12998,
    userName: "Francis Kimani",
    userRole: "Manager",
    roleKey: "manager",
    createdAt: new Date("2026-05-26T13:30:00.000Z"),
  },
];

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

function actorFromUser(user) {
  const role = user?.role || "ADMIN";
  const first = user?.firstName || "Admin";
  const last = user?.lastName || "User";
  return {
    userName: `${first} ${last}`.trim(),
    userRole: ROLE_LABEL[role] || "Administrator",
    roleKey: ROLE_KEY[role] || "admin",
  };
}

function mapRow(doc, n) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  const product = json.product && typeof json.product === "object" ? json.product : null;
  const images = product?.images || [];
  const image = json.productImage || images[0]?.url || images[0] || "";
  return {
    id: json.id,
    n,
    at: json.createdAt,
    atLabel: fmtDateTime(json.createdAt),
    reference: json.reference,
    productId: product?.id || json.product || "",
    productName: json.productName || product?.name || "—",
    productSku: json.productSku || product?.sku || "",
    productImage: image,
    type: json.type,
    typeLabel: json.typeLabel || TYPE_LABEL[json.type] || json.type,
    reason: json.reason || "",
    location: json.location || "",
    qtyChange: json.qtyChange || 0,
    valueKes: json.valueKes || 0,
    notes: json.notes || "",
    userName: json.userName,
    userRole: json.userRole,
    roleKey: json.roleKey,
    reversed: Boolean(json.reversed),
  };
}

async function ensureSeed() {
  const count = await InventoryAdjustment.estimatedDocumentCount();
  if (count > 0) return;
  await InventoryAdjustment.insertMany(SEED);
}

function reasonSlug(reason) {
  return String(reason || "").toLowerCase().replace(/\s+/g, "-");
}

async function getInventoryAdjustments(query = {}) {
  await ensureSeed();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const filter = {};
  const q = String(query.q || "").trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ reference: rx }, { productName: rx }, { productSku: rx }, { reason: rx }];
  }
  if (query.type && query.type !== "all") filter.type = query.type;
  if (query.reason && query.reason !== "all") filter.reason = new RegExp(`^${String(query.reason).replace(/-/g, "[- ]")}$`, "i");
  if (query.location && query.location !== "all") filter.location = query.location;
  if (query.user && query.user !== "all") filter.roleKey = query.user;

  const [total, docs, all] = await Promise.all([
    InventoryAdjustment.countDocuments(filter),
    InventoryAdjustment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("product"),
    InventoryAdjustment.find({}).lean(),
  ]);

  const added = all.filter((r) => r.qtyChange > 0);
  const deducted = all.filter((r) => r.qtyChange < 0);
  const stockAdded = added.reduce((s, r) => s + r.qtyChange, 0);
  const stockDeducted = Math.abs(deducted.reduce((s, r) => s + r.qtyChange, 0));
  const addedValue = added.reduce((s, r) => s + (r.valueKes || 0), 0);
  const deductedValue = Math.abs(deducted.reduce((s, r) => s + (r.valueKes || 0), 0));
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = all.filter((r) => r.createdAt && new Date(r.createdAt) >= monthStart).length;

  const typeCounts = { addition: 0, deduction: 0, correction: 0, return: 0 };
  const reasonCounts = {};
  for (const row of all) {
    typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
    const key = reasonSlug(row.reason);
    reasonCounts[key] = { name: row.reason, count: (reasonCounts[key]?.count || 0) + 1 };
  }
  const typeColors = { addition: "#10B981", deduction: "#EF4444", correction: "#38BDF8", return: "#0D9488" };
  const reasonColors = ["#10B981", "#EF4444", "#38BDF8", "#F59E0B", "#8B5CF6", "#0D9488"];
  const typeDonut = Object.entries(typeCounts)
    .filter(([, value]) => value)
    .map(([key, value]) => ({
      key,
      name: TYPE_LABEL[key] || key,
      value,
      pct: total ? Number(((value / all.length) * 100).toFixed(1)) : 0,
      color: typeColors[key] || "#94A3B8",
    }));
  const reasonBars = Object.entries(reasonCounts).map(([key, item], i) => ({
    key,
    name: item.name,
    count: item.count,
    color: reasonColors[i % reasonColors.length],
  }));

  return {
    total,
    page,
    limit,
    stats: {
      totalAdjustments: all.length,
      itemsAffected: new Set(all.map((r) => r.productSku || r.productName)).size,
      stockAdded,
      stockAddedValue: addedValue,
      stockDeducted,
      stockDeductedValue: deductedValue,
      netValue: addedValue - deductedValue,
      thisMonth,
      monthDelta: 0,
    },
    rows: docs.map((doc, i) => mapRow(doc, (page - 1) * limit + i + 1)),
    typeDonut,
    reasonBars,
    valueImpact: {
      added: addedValue,
      deducted: deductedValue,
      net: addedValue - deductedValue,
    },
    filters: FILTERS,
  };
}

async function nextReference() {
  const year = new Date().getFullYear();
  const count = await InventoryAdjustment.countDocuments({
    reference: new RegExp(`^ADJ-${year}-`),
  });
  return `ADJ-${year}-${String(count + 1).padStart(4, "0")}`;
}

function signedQty(type, qty) {
  const abs = Math.abs(Number(qty) || 0);
  if (type === "deduction") return -abs;
  if (type === "correction") return Number(qty) || 0;
  return abs;
}

async function createAdjustment(body, user) {
  const type = FILTERS.types.some((t) => t.id === body.type) ? body.type : "addition";
  const qtyChange = signedQty(type, body.qty ?? body.qtyChange);
  if (!qtyChange) {
    const err = new Error("Quantity must not be zero.");
    err.status = 400;
    throw err;
  }

  let product = null;
  if (body.productId) {
    product = await Product.findById(body.productId);
    if (!product) {
      const err = new Error("Product not found");
      err.status = 404;
      throw err;
    }
  }

  const nextStock = Math.max(0, (Number(product?.stock) || 0) + qtyChange);
  const price = Number(product?.priceKes) || Number(body.unitPriceKes) || 0;
  const actor = actorFromUser(user);
  const images = product?.images || [];
  const doc = await InventoryAdjustment.create({
    reference: await nextReference(),
    product: product?._id || null,
    productName: product?.name || body.productName || "",
    productSku: product?.sku || body.productSku || "",
    productImage: images[0]?.url || images[0] || "",
    type,
    typeLabel: TYPE_LABEL[type],
    reason: body.reason || TYPE_LABEL[type],
    location: body.location || "Main Warehouse",
    qtyChange,
    valueKes: qtyChange * price,
    notes: body.notes || "",
    ...actor,
  });

  if (product) {
    product.stock = nextStock;
    await product.save();
  }

  return mapRow(doc, 1);
}

async function reverseAdjustment(id, user) {
  const src = await InventoryAdjustment.findById(id);
  if (!src) {
    const err = new Error("Adjustment not found");
    err.status = 404;
    throw err;
  }
  if (src.reversed) {
    const err = new Error("This adjustment has already been reversed.");
    err.status = 400;
    throw err;
  }
  const inverseType = src.qtyChange < 0 ? "addition" : "deduction";
  const created = await createAdjustment(
    {
      productId: src.product,
      productName: src.productName,
      productSku: src.productSku,
      type: inverseType,
      reason: `Reversal of ${src.reference}`,
      location: src.location,
      qty: Math.abs(src.qtyChange),
      notes: `Reverses ${src.reference}`,
    },
    user
  );
  src.reversed = true;
  await src.save();
  return created;
}

module.exports = {
  getInventoryAdjustments,
  createAdjustment,
  reverseAdjustment,
};
