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
    shipments: 186,
    successRate: 94.5,
    avgTime: "2.3 days",
    generated: "27 May 2026",
    generatedTime: "11:59 PM",
    zone: "Nairobi CBD",
  },
  {
    name: "Weekly Performance Report",
    type: "performance",
    range: "21–27 May 2026",
    shipments: 1240,
    successRate: 93.8,
    avgTime: "2.4 days",
    generated: "27 May 2026",
    generatedTime: "10:15 PM",
    zone: "Westlands",
  },
  {
    name: "Nairobi CBD Zone Report",
    type: "zone",
    range: "01–27 May 2026",
    shipments: 1256,
    successRate: 95.2,
    avgTime: "1.8 days",
    generated: "27 May 2026",
    generatedTime: "08:40 PM",
    zone: "Nairobi CBD",
  },
  {
    name: "Courier Productivity Report",
    type: "courier",
    range: "01–27 May 2026",
    shipments: 2856,
    successRate: 92.1,
    avgTime: "2.5 days",
    generated: "26 May 2026",
    generatedTime: "06:20 PM",
    zone: "Kilimani",
  },
  {
    name: "Returns & Refunds Summary",
    type: "returns",
    range: "01–27 May 2026",
    shipments: 32,
    successRate: 56.3,
    avgTime: "3.1 days",
    generated: "26 May 2026",
    generatedTime: "04:05 PM",
    zone: "Karen",
  },
  {
    name: "Failed Delivery Exceptions",
    type: "exceptions",
    range: "20–27 May 2026",
    shipments: 82,
    successRate: 0,
    avgTime: "—",
    generated: "26 May 2026",
    generatedTime: "02:30 PM",
    zone: "Eastlands",
  },
  {
    name: "Delivery Analytics Snapshot",
    type: "analytics",
    range: "01–27 May 2026",
    shipments: 2856,
    successRate: 96.3,
    avgTime: "2.4 days",
    generated: "25 May 2026",
    generatedTime: "09:10 PM",
    zone: "Thika Road",
  },
  {
    name: "Coast Region Summary",
    type: "zone",
    range: "01–27 May 2026",
    shipments: 368,
    successRate: 91.4,
    avgTime: "3.2 days",
    generated: "25 May 2026",
    generatedTime: "07:45 PM",
    zone: "Coast Region",
  },
  {
    name: "Rift Valley Performance",
    type: "performance",
    range: "01–27 May 2026",
    shipments: 456,
    successRate: 90.8,
    avgTime: "2.9 days",
    generated: "24 May 2026",
    generatedTime: "11:20 AM",
    zone: "Rift Valley",
  },
  {
    name: "Monthly Delivery Overview",
    type: "summary",
    range: "01–27 May 2026",
    shipments: 2856,
    successRate: 96.3,
    avgTime: "2.4 days",
    generated: "24 May 2026",
    generatedTime: "08:00 AM",
    zone: "Westlands",
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
  const useDemoTotal = !query.q && !query.type && !query.zone;
  const total = useDemoTotal ? 18 : filtered.length;
  const skip = (page - 1) * limit;
  const reports =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const stats = {
    totalShipments: 2856,
    totalShipmentsDelta: 12.6,
    totalShipmentsHint: "vs last month",
    successful: 2184,
    successfulDelta: 16.2,
    successfulHint: "vs last month",
    avgTime: "2.4 days",
    avgTimeDelta: -0.6,
    avgTimeHint: "vs last month",
    failed: 82,
    failedDelta: -8.1,
    failedHint: "vs last month",
    returnRate: 1.1,
    returnRateDelta: -0.3,
    returnRateHint: "vs last month",
    refunds: 128450,
    refundsDelta: 21.6,
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
      shipments: [420, 610, 540, 880, 760, 980],
      successful: [360, 520, 470, 760, 680, 890],
    },
    statusDonut: [
      { key: "delivered", name: "Delivered", value: 2184, color: "#16a34a", pct: 76.5 },
      { key: "in_transit", name: "In Transit", value: 462, color: "#ea580c", pct: 16.2 },
      { key: "pending_pickup", name: "Pending Pickup", value: 128, color: "#2563eb", pct: 4.5 },
      { key: "failed", name: "Failed", value: 50, color: "#dc2626", pct: 1.8 },
      { key: "returned", name: "Returned", value: 32, color: "#7c3aed", pct: 1.1 },
    ],
    insights: [
      { key: "success", tone: "green", icon: "trend", text: "Delivery success rate improved by 3.7% this month" },
      { key: "time", tone: "blue", icon: "clock", text: "Average delivery time improved by 0.6 day" },
      { key: "returns", tone: "amber", icon: "warning", text: "Returns decreased by 0.3% compared to last month" },
      { key: "zone", tone: "purple", icon: "truck", text: "Nairobi CBD has the highest number of deliveries" },
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
