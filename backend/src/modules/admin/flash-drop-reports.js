const { getFlashDropAnalytics } = require("./flash-drop-analytics");

async function getFlashDropReports() {
  const analytics = await getFlashDropAnalytics();
  return {
    from: analytics.from,
    to: analytics.to,
    compareLabel: analytics.compareLabel,
    tipIndex: 0,
    kpis: analytics.kpis,
    revenueSeries: analytics.revenueSeries,
    status: analytics.status.map((s) => ({
      key: s.key === "active" ? "ongoing" : s.key,
      name: s.key === "active" ? "Ongoing" : s.name,
      count: s.count,
      pct: s.pct,
      color: s.color,
    })),
    categoryRevenue: analytics.categoryRevenue,
    topDrops: analytics.topDrops.map((r) => ({
      ...r,
      category: "General",
      startLabel: "",
      participants: 0,
      conversion: 0,
      status: "completed",
    })),
    discounts: analytics.discounts,
    channels: [],
    exportReports: [
      { id: "summary", name: "Flash Drops Summary Report" },
      { id: "sales", name: "Sales Performance Report" },
      { id: "participants", name: "Participant Report" },
    ],
    insights: analytics.insights,
  };
}

module.exports = { getFlashDropReports };
