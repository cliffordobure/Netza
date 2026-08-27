const ZONES = [
  "Nairobi CBD",
  "Westlands",
  "Kilimani",
  "Karen",
  "Eastlands",
  "Thika Road",
  "Coast Region",
  "Rift Valley",
];

const REPORT_TYPES = [
  { key: "summary", label: "Summary" },
  { key: "performance", label: "Performance" },
  { key: "zone", label: "Zone" },
  { key: "courier", label: "Courier" },
  { key: "returns", label: "Returns" },
  { key: "exceptions", label: "Exceptions" },
  { key: "analytics", label: "Analytics" },
];

const SEED = [
  {
    name: "Daily Delivery Summary",
    type: "summary",
    range: "27 May 2026",
    shipments: 3,
    successRate: 100,
    avgTime: "2.3 days",
    generated: "27 May 2026",
    generatedTime: "11:59 PM",
    zone: "Nairobi CBD",
  },
  {
    name: "Weekly Performance Report",
    type: "performance",
    range: "21–27 May 2026",
    shipments: 3,
    successRate: 100,
    avgTime: "2.4 days",
    generated: "27 May 2026",
    generatedTime: "10:15 PM",
    zone: "Westlands",
  },
  {
    name: "Nairobi CBD Zone Report",
    type: "zone",
    range: "01–27 May 2026",
    shipments: 1,
    successRate: 100,
    avgTime: "1.8 days",
    generated: "27 May 2026",
    generatedTime: "08:40 PM",
    zone: "Nairobi CBD",
  },
];

function buildRows() {
  return SEED.map((row, i) => {
    const type = REPORT_TYPES.find((t) => t.key === row.type);
    return {
      id: `rpt${i + 1}`,
      n: i + 1,
      name: row.name,
      type: row.type,
      typeLabel: type.label,
      range: row.range,
      shipments: row.shipments,
      successRate: row.successRate,
      avgTime: row.avgTime,
      generated: row.generated,
      generatedTime: row.generatedTime,
      zone: row.zone,
    };
  });
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q) ||
        r.range.toLowerCase().includes(q) ||
        r.zone.toLowerCase().includes(q)
    );
  }
  if (query.type) list = list.filter((r) => r.type === query.type);
  if (query.zone) list = list.filter((r) => r.zone === query.zone);
  return list;
}

function getDeliveryReports(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const reports = filtered.slice(skip, skip + limit);

  const stats = {
    totalShipments: 3,
    totalShipmentsDelta: 0,
    totalShipmentsHint: "vs last month",
    successful: 3,
    successfulDelta: 0,
    successfulHint: "vs last month",
    avgTime: "2.4 days",
    avgTimeDelta: -0.6,
    avgTimeHint: "vs last month",
    failed: 0,
    failedDelta: 0,
    failedHint: "vs last month",
    returnRate: 0,
    returnRateDelta: 0,
    returnRateHint: "vs last month",
    refunds: 8450,
    refundsDelta: 0,
    refundsHint: "vs last month",
  };

  return {
    total,
    page,
    limit,
    stats,
    reports,
    deliveriesOverTime: {
      labels: ["01 May", "06 May", "11 May", "16 May", "21 May", "26 May"],
      shipments: [1, 1, 0, 1, 1, 1],
      successful: [1, 1, 0, 1, 1, 1],
    },
    statusDonut: [
      { key: "delivered", name: "Delivered", value: 1, color: "#16a34a", pct: 33.3 },
      { key: "in_transit", name: "In Transit", value: 1, color: "#ea580c", pct: 33.3 },
      { key: "pending_pickup", name: "Pending Pickup", value: 1, color: "#2563eb", pct: 33.4 },
    ],
    insights: [
      { key: "success", tone: "green", icon: "trend", text: "All sample deliveries completed successfully" },
      { key: "time", tone: "blue", icon: "clock", text: "Average delivery time improved by 0.6 day" },
      { key: "returns", tone: "amber", icon: "warning", text: "No returns in the current sample set" },
    ],
    cta: {
      text: "Need detailed analysis? Create a custom report for deeper insights.",
      button: "Create Report",
    },
    filters: {
      types: REPORT_TYPES.map((t) => ({ value: t.key, label: t.label })),
      zones: ZONES,
    },
    footerMessage: "Tip: Use custom reports to drill down into specific date ranges, zones or couriers for deeper insights.",
  };
}

module.exports = { getDeliveryReports };
