const { loadAllRows, statsOf, fmtLabel } = require("./flash-drop-admin");

function emptySeries(from, to) {
  const start = from ? new Date(from) : new Date();
  const end = to ? new Date(to) : new Date();
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  return Array.from({ length: Math.min(days, 31) }, (_, i) => ({
    d: new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10),
    label: i === 0 || i === days - 1 ? String(i + 1) : "",
    dateLabel: fmtLabel(new Date(start.getTime() + i * 86400000)),
    revenue: 0,
    sold: 0,
  }));
}

async function getFlashDropAnalytics() {
  const rows = await loadAllRows();
  const stats = statsOf(rows);
  const totalRevenue = stats.revenue;
  const categoryMap = {};
  rows.forEach((r) => {
    if (!categoryMap[r.category]) categoryMap[r.category] = { revenue: 0, count: 0, sold: 0 };
    categoryMap[r.category].revenue += r.revenue || 0;
    categoryMap[r.category].count += 1;
    categoryMap[r.category].sold += r.sold || 0;
  });
  const categoryRevenue = Object.entries(categoryMap).map(([name, v], i) => {
    const pct = totalRevenue ? Math.round((v.revenue / totalRevenue) * 1000) / 10 : 0;
    const colors = ["#6D28D9", "#2563eb", "#ea580c", "#16a34a", "#dc2626"];
    return {
      key: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      pct,
      value: v.revenue,
      money: `KSh ${Math.round(v.revenue / 1000)}K`,
      color: colors[i % colors.length],
    };
  });

  const avgDiscount = rows.length
    ? Math.round((rows.reduce((s, r) => s + (r.discount || 0), 0) / rows.length) * 10) / 10
    : 0;

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);

  return {
    from,
    to,
    compareLabel: "Previous period",
    tipIndex: 0,
    kpis: {
      drops: stats.total,
      dropsDelta: 0,
      revenue: stats.revenue,
      revenueDelta: 0,
      sold: stats.sold,
      soldDelta: 0,
      participants: 0,
      participantsDelta: 0,
      avgDiscount,
      avgDiscountDelta: 0,
      conversion: 0,
      conversionDelta: 0,
    },
    revenueSeries: emptySeries(from, to),
    topDrops: rows
      .slice()
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 10)
      .map((r, i) => ({
        n: i + 1,
        name: r.name,
        sku: r.sku,
        revenue: r.revenue,
        sold: r.sold,
        discount: r.discountLabel,
        conversion: 0,
        image: r.image,
      })),
    categoryRevenue,
    discounts: [
      { label: "0–10%", pct: 0 },
      { label: "11–20%", pct: 0 },
      { label: "21–30%", pct: 0 },
      { label: "31–40%", pct: 0 },
      { label: "41–50%", pct: 0 },
      { label: "51–60%", pct: 0 },
      { label: "60%+", pct: 0 },
    ],
    status: [
      { key: "active", name: "Active", count: stats.active, pct: stats.total ? Math.round((stats.active / stats.total) * 1000) / 10 : 0, color: "#16a34a" },
      { key: "upcoming", name: "Upcoming", count: stats.upcoming, pct: stats.total ? Math.round((stats.upcoming / stats.total) * 1000) / 10 : 0, color: "#ea580c" },
      { key: "completed", name: "Completed", count: stats.completed, pct: stats.total ? Math.round((stats.completed / stats.total) * 1000) / 10 : 0, color: "#2563eb" },
      { key: "cancelled", name: "Cancelled", count: stats.cancelled, pct: stats.total ? Math.round((stats.cancelled / stats.total) * 1000) / 10 : 0, color: "#94a3b8" },
    ],
    performance: categoryRevenue.map((c) => ({
      name: c.name,
      drops: categoryMap[c.name]?.count || 0,
      participants: 0,
      sold: categoryMap[c.name]?.sold || 0,
      revenue: c.value,
      avgDiscount,
      conversion: 0,
    })),
    totals: {
      drops: stats.total,
      participants: 0,
      sold: stats.sold,
      revenue: stats.revenue,
      avgDiscount,
      conversion: 0,
    },
    insights: rows.length
      ? [{ icon: "trend", tone: "green", text: "Analytics reflect live flash drop data from your database." }]
      : [{ icon: "box", tone: "blue", text: "No flash drops yet. Create one to start tracking performance." }],
  };
}

module.exports = { getFlashDropAnalytics };
