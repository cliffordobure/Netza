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
    orders: 2,
    revenue: 24050,
    discounts: 500,
    netRevenue: 23550,
    profit: 9800,
    margin: 40.7,
    growth: 0,
  },
  {
    channel: "Mobile App",
    orders: 1,
    revenue: 15600,
    discounts: 200,
    netRevenue: 15400,
    profit: 6200,
    margin: 39.7,
    growth: 0,
  },
  {
    channel: "Walk-in Store",
    orders: 0,
    revenue: 0,
    discounts: 0,
    netRevenue: 0,
    profit: 0,
    margin: 0,
    growth: 0,
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
      revenue: 39650,
      revenueDelta: 0,
      revenueHint: "vs last month",
      orders: 3,
      ordersDelta: 0,
      ordersHint: "vs last month",
      aov: 13217,
      aovDelta: 0,
      aovHint: "vs last month",
      discounts: 700,
      discountsDelta: 0,
      discountsHint: "vs last month",
      grossProfit: 16000,
      grossProfitDelta: 0,
      grossProfitHint: "vs last month",
      margin: 40.4,
      marginDelta: 0,
      marginHint: "vs last month",
    },
    channels,
    totals,
    salesTrend: {
      labels: ["01 May", "06 May", "11 May", "16 May", "21 May", "27 May"],
      revenue: [5000, 8000, 6200, 9100, 7500, 8450],
      orders: [1, 1, 0, 1, 1, 1],
    },
    topCategories: [
      { name: "Electronics", revenue: 24050, pct: 60.7 },
      { name: "Computing", revenue: 15600, pct: 39.3 },
      { name: "Accessories", revenue: 0, pct: 0 },
    ],
    paymentDonut: [
      { key: "mpesa", name: "MPESA", value: 24050, color: "#16a34a", pct: 60.7 },
      { key: "card", name: "Card Payments", value: 15600, color: "#2563eb", pct: 39.3 },
    ],
    filters: {
      channels: CHANNELS,
      paymentMethods: PAYMENT_METHODS,
      zones: ZONES,
    },
  };
}

module.exports = { getSalesReports };
