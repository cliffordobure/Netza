const STATUSES = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const CITIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
];

const DELIVERY_TYPES = [
  { value: "same_day", label: "Same day" },
  { value: "next_day", label: "1 day" },
  { value: "express", label: "1-2 days" },
  { value: "standard", label: "2-3 days" },
  { value: "economy", label: "3-5 days" },
];

const SEED = [
  {
    name: "Nairobi CBD",
    city: "Nairobi",
    area: "CBD & Surroundings",
    coverage: "CBD, Upper Hill, Community",
    fee: 150,
    eta: "Same day",
    etaTone: "same",
    deliveryType: "same_day",
    status: "active",
    orders: 2,
    region: "nairobi",
  },
  {
    name: "Westlands",
    city: "Nairobi",
    area: "Westlands Area",
    coverage: "Westlands, Parklands, Spring Valley",
    fee: 120,
    eta: "1 day",
    etaTone: "next",
    deliveryType: "next_day",
    status: "active",
    orders: 1,
    region: "nairobi",
  },
  {
    name: "Eastlands",
    city: "Nairobi",
    area: "Eastlands Corridor",
    coverage: "Eastlands, Embakasi, Donholm",
    fee: 130,
    eta: "1 day",
    etaTone: "next",
    deliveryType: "next_day",
    status: "inactive",
    orders: 0,
    region: "nairobi",
  },
];

function buildRows() {
  return SEED.map((row, i) => ({
    id: `zone${i + 1}`,
    n: i + 1,
    name: row.name,
    city: row.city,
    area: row.area,
    coverage: row.coverage,
    fee: row.fee,
    eta: row.eta,
    etaTone: row.etaTone,
    deliveryType: row.deliveryType,
    status: row.status,
    statusLabel: row.status === "active" ? "Active" : "Inactive",
    orders: row.orders,
    region: row.region,
  }));
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.coverage.toLowerCase().includes(q) ||
        r.eta.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.city) list = list.filter((r) => r.city === query.city);
  if (query.deliveryType) list = list.filter((r) => r.deliveryType === query.deliveryType);
  return list;
}

function getDeliveryZones(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const zones = filtered.slice(skip, skip + limit);

  const stats = {
    total: 3,
    totalHint: "Active delivery areas",
    active: 2,
    activePct: 66.7,
    activeHint: "of total",
    ordersMonth: 3,
    ordersDelta: 0,
    ordersHint: "vs last month",
    avgTime: "1 day",
    avgTimeHint: "Across all zones",
    avgFee: 133,
    avgFeeHint: "Across all zones",
    onTime: 100,
    onTimeDelta: 0,
    onTimeHint: "vs last month",
  };

  return {
    total,
    page,
    limit,
    stats,
    zones,
    topZones: [
      { name: "Nairobi CBD", orders: 2, pct: 100 },
      { name: "Westlands", orders: 1, pct: 50 },
      { name: "Eastlands", orders: 0, pct: 0 },
    ],
    mapLegend: [
      { key: "nairobi", label: "Nairobi Zones", color: "#16a34a" },
      { key: "rift", label: "Rift Valley", color: "#6c5dd3" },
      { key: "coast", label: "Coast Region", color: "#ea580c" },
      { key: "other", label: "Other Regions", color: "#2563eb" },
      { key: "inactive", label: "Inactive Zones", color: "#94a3b8" },
    ],
    insights: [
      { key: "active", tone: "green", icon: "checkCircle", text: "2 zones are active and delivering" },
      { key: "same", tone: "blue", icon: "clock", text: "Same day delivery available in 1 zone" },
      { key: "inactive", tone: "orange", icon: "warning", text: "1 zone is currently inactive" },
    ],
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      cities: CITIES,
      deliveryTypes: DELIVERY_TYPES,
    },
    footerMessage:
      "Note: Delivery fees and times are calculated based on zone configuration. Update zones regularly for accurate pricing and customer experience.",
  };
}

module.exports = { getDeliveryZones };
