const CHANNELS = [
  "Online Store",
  "Mobile App",
  "Walk-in Store",
  "Phone Orders",
  "WhatsApp Orders",
  "Marketplace",
];

const PAYMENT_METHODS = [
  { value: "mpesa", label: "MPESA" },
  { value: "card", label: "Card Payments" },
  { value: "cod", label: "Cash on Delivery" },
  { value: "bank", label: "Bank Transfer" },
];

const ZONES = [
  "Nairobi CBD",
  "Westlands",
  "Kilimani",
  "Karen",
  "Eastlands",
  "Coast Region",
  "Rift Valley",
];

const SEED = [
  {
    channel: "Online Store",
    orders: 1856,
    revenue: 1125800,
    discounts: 85200,
    netRevenue: 1040600,
    profit: 460450,
    margin: 40.9,
    growth: 21.3,
  },
  {
    channel: "Mobile App",
    orders: 1342,
    revenue: 892300,
    discounts: 68400,
    netRevenue: 823900,
    profit: 331940,
    margin: 37.2,
    growth: 16.4,
  },
  {
    channel: "Walk-in Store",
    orders: 876,
    revenue: 512700,
    discounts: 32100,
    netRevenue: 480600,
    profit: 212770,
    margin: 41.5,
    growth: 9.8,
  },
  {
    channel: "Phone Orders",
    orders: 412,
    revenue: 214500,
    discounts: 15800,
    netRevenue: 198700,
    profit: 79790,
    margin: 37.2,
    growth: 8.2,
  },
  {
    channel: "WhatsApp Orders",
    orders: 254,
    revenue: 99600,
    discounts: 9200,
    netRevenue: 90400,
    profit: 43330,
    margin: 43.5,
    growth: -2.4,
  },
  {
    channel: "Marketplace",
    orders: 112,
    revenue: 45300,
    discounts: 4700,
    netRevenue: 40600,
    profit: 21920,
    margin: 48.4,
    growth: 5.6,
  },
];

function buildRows() {
  return SEED.map((row, i) => ({
    id: `ch${i + 1}`,
    n: i + 1,
    channel: row.channel,
    orders: row.orders,
    revenue: row.revenue,
    discounts: row.discounts,
    netRevenue: row.netRevenue,
    profit: row.profit,
    margin: row.margin,
    growth: row.growth,
  }));
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter((r) => r.channel.toLowerCase().includes(q));
  }
  if (query.channel) list = list.filter((r) => r.channel === query.channel);
  return list;
}

function getSalesReports(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const channels = filtered.slice(skip, skip + limit);

  const totals = filtered.reduce(
    (acc, r) => {
      acc.orders += r.orders;
      acc.revenue += r.revenue;
      acc.discounts += r.discounts;
      acc.netRevenue += r.netRevenue;
      acc.profit += r.profit;
      return acc;
    },
    { orders: 0, revenue: 0, discounts: 0, netRevenue: 0, profit: 0 }
  );
  totals.margin = totals.revenue ? (totals.profit / totals.revenue) * 100 : 0;

  return {
    total,
    page,
    limit,
    stats: {
      revenue: 2845700,
      revenueDelta: 18.7,
      revenueHint: "vs last month",
      orders: 4852,
      ordersDelta: 14.3,
      ordersHint: "vs last month",
      aov: 586,
      aovDelta: 3.8,
      aovHint: "vs last month",
      discounts: 215400,
      discountsDelta: 12.5,
      discountsHint: "vs last month",
      grossProfit: 1128900,
      grossProfitDelta: 19.2,
      grossProfitHint: "vs last month",
      margin: 39.6,
      marginDelta: 0.9,
      marginHint: "vs last month",
    },
    channels,
    totals,
    salesTrend: {
      labels: ["01 May", "06 May", "11 May", "16 May", "21 May", "27 May"],
      revenue: [320000, 410000, 380000, 520000, 470000, 580000],
      orders: [420, 610, 540, 780, 690, 860],
    },
    topCategories: [
      { name: "Groceries", revenue: 1245600, pct: 43.8 },
      { name: "Beverages", revenue: 526800, pct: 18.5 },
      { name: "Personal Care", revenue: 328400, pct: 11.5 },
      { name: "Household", revenue: 286200, pct: 10.1 },
      { name: "Snacks", revenue: 221500, pct: 7.8 },
    ],
    paymentDonut: [
      { key: "mpesa", name: "MPESA", value: 1642100, color: "#16a34a", pct: 57.7 },
      { key: "card", name: "Card Payments", value: 876500, color: "#2563eb", pct: 30.8 },
      { key: "cod", name: "Cash on Delivery", value: 247600, color: "#ea580c", pct: 8.7 },
      { key: "bank", name: "Bank Transfer", value: 79500, color: "#dc2626", pct: 2.8 },
    ],
    insight:
      "Key Insight: Revenue increased by 18.7% compared to last month, driven by growth in Online Store and Mobile App sales. Tip: Promote top selling categories to maintain growth momentum.",
    filters: {
      channels: CHANNELS,
      payments: PAYMENT_METHODS,
      zones: ZONES,
    },
  };
}

module.exports = { getSalesReports };
