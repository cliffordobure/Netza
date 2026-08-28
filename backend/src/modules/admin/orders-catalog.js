const { Order, User } = require("../../models");

const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Guest")}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

function fmtDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function fmtTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function relativeLabel(value) {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function catalogStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING_PAYMENT") return { status: "pending", statusLabel: "Pending" };
  if (s === "SHIPPED") return { status: "shipped", statusLabel: "Shipped" };
  if (s === "DELIVERED") return { status: "delivered", statusLabel: "Delivered" };
  if (s === "CANCELLED") return { status: "cancelled", statusLabel: "Cancelled" };
  return { status: "processing", statusLabel: "Processing" };
}

function catalogPayment(paymentStatus) {
  const s = String(paymentStatus || "").toUpperCase();
  if (s === "COMPLETED") return { paymentStatus: "paid", paymentLabel: "Paid" };
  if (s === "FAILED") return { paymentStatus: "failed", paymentLabel: "Failed" };
  return { paymentStatus: "pending", paymentLabel: "Pending" };
}

function paymentMethodLabel(method) {
  const m = String(method || "").toUpperCase();
  if (m === "MPESA") return "M-Pesa";
  if (m === "POINTS") return "NETZA Points";
  if (m === "PESAPAL" || m === "CARD") return "Card";
  return method || "—";
}

function deliveryLabel(method) {
  return String(method || "").toUpperCase() === "EXPRESS" ? "Express" : "Standard";
}

function buildFilter(query = {}) {
  const filter = {};
  const q = (query.q || "").trim();
  if (query.status) {
    const s = String(query.status).toLowerCase();
    if (s === "pending") filter.status = "PENDING_PAYMENT";
    else if (s === "processing") filter.status = { $in: ["PAID", "PROCESSING"] };
    else if (s === "shipped") filter.status = "SHIPPED";
    else if (s === "delivered") filter.status = "DELIVERED";
    else if (s === "cancelled") filter.status = "CANCELLED";
  }
  if (query.paymentStatus) {
    const p = String(query.paymentStatus).toLowerCase();
    if (p === "paid") filter.paymentStatus = "COMPLETED";
    else if (p === "failed") filter.paymentStatus = "FAILED";
    else if (p === "pending") filter.paymentStatus = "PENDING";
  }
  if (query.delivery) {
    const d = String(query.delivery).toLowerCase();
    filter.deliveryMethod = d === "express" ? "EXPRESS" : "STANDARD";
  }
  return { filter, q };
}

function mapRow(order) {
  const json = typeof order.toJSON === "function" ? order.toJSON() : order;
  const user = json.user && typeof json.user === "object" ? json.user : {};
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Guest";
  const st = catalogStatus(json.status);
  const pay = catalogPayment(json.paymentStatus);
  const created = json.createdAt ? new Date(json.createdAt) : new Date();
  const updated = json.updatedAt ? new Date(json.updatedAt) : created;
  const items = json.items || [];
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const digits = String(json.orderNumber || "").replace(/\D/g, "");
  return {
    id: json.id,
    orderNumber: json.orderNumber,
    shortId: digits ? `#${digits.slice(-5)}` : "",
    customerName: name,
    customerPhone: user.phone || json.address?.phone || "",
    customerAvatar: avatar(name, 1),
    itemCount,
    totalKes: json.totalKes || 0,
    ...pay,
    paymentMethod: paymentMethodLabel(json.paymentMethod),
    ...st,
    statusDate: fmtDate(updated),
    deliveryMethod: deliveryLabel(json.deliveryMethod),
    deliveryCity: json.address?.city || json.address?.county || "—",
    orderDate: fmtDate(created),
    orderTime: fmtTime(created),
  };
}

async function applySearchFilter(filter, q) {
  if (!q) return filter;
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^#/, ""), "i");
  const users = await User.find({
    $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }],
  }).select("_id");
  return {
    ...filter,
    $or: [
      { orderNumber: rx },
      { "address.phone": rx },
      { "payments.reference": rx },
      { user: { $in: users.map((u) => u._id) } },
    ],
  };
}

async function getOrdersCatalog(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const skip = (page - 1) * limit;
  const { filter, q } = buildFilter(query);
  const mongoFilter = await applySearchFilter(filter, q);

  const [total, orders, statusRows, topProductRows, recentDocs] = await Promise.all([
    Order.countDocuments(mongoFilter),
    Order.find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "firstName lastName phone email"),
    Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.name", orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
      { $limit: 5 },
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber status paymentStatus address createdAt updatedAt"),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.n]));
  const pending = byStatus.PENDING_PAYMENT || 0;
  const processing = (byStatus.PAID || 0) + (byStatus.PROCESSING || 0);
  const shipped = byStatus.SHIPPED || 0;
  const delivered = byStatus.DELIVERED || 0;
  const cancelled = byStatus.CANCELLED || 0;
  const allTotal = pending + processing + shipped + delivered + cancelled;

  const donutParts = [
    { key: "delivered", name: "Delivered", value: delivered, color: "#10B981" },
    { key: "shipped", name: "Shipped", value: shipped, color: "#8B5CF6" },
    { key: "processing", name: "Processing", value: processing, color: "#3B82F6" },
    { key: "pending", name: "Pending", value: pending, color: "#F59E0B" },
    { key: "cancelled", name: "Cancelled", value: cancelled, color: "#EF4444" },
  ].filter((p) => p.value > 0);

  const statusDonut = donutParts.map((p) => ({
    ...p,
    pct: allTotal ? (p.value / allTotal) * 100 : 0,
  }));

  const recentOrders = recentDocs.map((o, i) => {
    const st = catalogStatus(o.status);
    const city = o.address?.city || "";
    let text = `${o.orderNumber} ${st.statusLabel.toLowerCase()}`;
    if (st.status === "shipped" && city) text += ` to ${city}`;
    if (st.status === "pending") text += " payment pending";
    const tone =
      st.status === "delivered" ? "green" : st.status === "shipped" ? "purple" : st.status === "pending" ? "orange" : "blue";
    return {
      id: `r${i}`,
      text,
      atLabel: relativeLabel(o.updatedAt || o.createdAt),
      tone,
    };
  });

  return {
    total,
    page,
    limit,
    stats: {
      total: allTotal,
      totalDelta: 0,
      pending,
      pendingDelta: 0,
      processing,
      processingDelta: 0,
      shipped,
      shippedDelta: 0,
      delivered,
      deliveredDelta: 0,
      cancelled,
      cancelledDelta: 0,
    },
    orders: orders.map(mapRow),
    statusDonut,
    topProducts: topProductRows.map((p) => ({
      name: p._id || "Product",
      orders: p.orders,
      image: "",
    })),
    recentOrders,
    filters: {
      deliveryMethods: ["Standard", "Express"],
    },
  };
}

module.exports = { getOrdersCatalog, mapRow };
