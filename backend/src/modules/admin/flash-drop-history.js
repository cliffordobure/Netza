const { loadAllRows, statsOf, fmtLabel } = require("./flash-drop-admin");

async function listFlashDropHistory(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const category = String(query.category || "").trim();
  const channel = String(query.channel || "").trim().toLowerCase();

  const allRows = await loadAllRows();
  let rows = allRows.filter((r) => ["completed", "expired", "cancelled"].includes(r.status) || r.status === "completed");
  if (status) rows = rows.filter((r) => r.status === status);
  if (category) rows = rows.filter((r) => r.category === category);
  if (q) rows = rows.filter((r) => `${r.name} ${r.sku}`.toLowerCase().includes(q));
  if (channel) rows = rows.filter((r) => (r.channel || "").toLowerCase() === channel);

  const skip = (page - 1) * limit;
  const drops = rows.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 }));
  const stats = statsOf(allRows);
  const completed = rows.filter((r) => r.status === "completed").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;
  const expired = rows.filter((r) => r.status === "expired").length;
  const historyTotal = rows.length;

  return {
    drops,
    total: historyTotal,
    page,
    limit,
    stats: {
      total: historyTotal,
      completed,
      completedPct: historyTotal ? Math.round((completed / historyTotal) * 1000) / 10 : 0,
      cancelled,
      cancelledPct: historyTotal ? Math.round((cancelled / historyTotal) * 1000) / 10 : 0,
      expired,
      expiredPct: historyTotal ? Math.round((expired / historyTotal) * 1000) / 10 : 0,
      sold: stats.sold,
      revenue: stats.revenue,
      avgDiscount: allRows.length
        ? Math.round((allRows.reduce((s, r) => s + (r.discount || 0), 0) / allRows.length) * 10) / 10
        : 0,
    },
    overview: [
      { key: "completed", name: "Completed", count: completed, pct: historyTotal ? Math.round((completed / historyTotal) * 1000) / 10 : 0, color: "#16a34a" },
      { key: "expired", name: "Expired", count: expired, pct: historyTotal ? Math.round((expired / historyTotal) * 1000) / 10 : 0, color: "#ea580c" },
      { key: "cancelled", name: "Cancelled", count: cancelled, pct: historyTotal ? Math.round((cancelled / historyTotal) * 1000) / 10 : 0, color: "#dc2626" },
    ],
    months: [],
    tipIndex: 0,
    categories: [],
    performance: [],
    recent: rows.slice(0, 3).map((r) => ({
      name: r.name,
      at: r.endLabel || fmtLabel(r.endsAt),
      revenue: r.revenue,
      sold: r.sold,
      stock: r.stock,
      image: r.image,
      sku: r.sku,
    })),
    categoriesList: [...new Set(allRows.map((r) => r.category))],
  };
}

module.exports = { listFlashDropHistory };
