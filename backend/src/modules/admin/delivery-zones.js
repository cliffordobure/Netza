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
    orders: 1256,
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
    orders: 784,
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
    status: "active",
    orders: 645,
    region: "nairobi",
  },
  {
    name: "South B",
    city: "Nairobi",
    area: "South B / South C",
    coverage: "South B, South C, Nairobi West",
    fee: 120,
    eta: "1 day",
    etaTone: "next",
    deliveryType: "next_day",
    status: "active",
    orders: 532,
    region: "nairobi",
  },
  {
    name: "Rift Valley",
    city: "Nakuru",
    area: "Nakuru & Environs",
    coverage: "Nakuru CBD, Lanet, Pipeline",
    fee: 200,
    eta: "2-3 days",
    etaTone: "standard",
    deliveryType: "standard",
    status: "active",
    orders: 456,
    region: "rift",
  },
  {
    name: "Kilimani",
    city: "Nairobi",
    area: "Kilimani / Kileleshwa",
    coverage: "Kilimani, Kileleshwa, Lavington",
    fee: 120,
    eta: "1 day",
    etaTone: "next",
    deliveryType: "next_day",
    status: "active",
    orders: 412,
    region: "nairobi",
  },
  {
    name: "Coast Region",
    city: "Mombasa",
    area: "Mombasa Island",
    coverage: "Mombasa CBD, Nyali, Likoni",
    fee: 250,
    eta: "2-3 days",
    etaTone: "standard",
    deliveryType: "standard",
    status: "active",
    orders: 368,
    region: "coast",
  },
  {
    name: "Karen",
    city: "Nairobi",
    area: "Karen / Langata",
    coverage: "Karen, Langata, Hardy",
    fee: 180,
    eta: "1-2 days",
    etaTone: "express",
    deliveryType: "express",
    status: "active",
    orders: 298,
    region: "nairobi",
  },
  {
    name: "Thika Road",
    city: "Thika",
    area: "Thika Corridor",
    coverage: "Roysambu, Kasarani, Thika Town",
    fee: 140,
    eta: "1-2 days",
    etaTone: "express",
    deliveryType: "express",
    status: "active",
    orders: 265,
    region: "other",
  },
  {
    name: "Kisumu Metro",
    city: "Kisumu",
    area: "Kisumu Central",
    coverage: "Kisumu CBD, Milimani, Kondele",
    fee: 220,
    eta: "2-3 days",
    etaTone: "standard",
    deliveryType: "standard",
    status: "active",
    orders: 198,
    region: "other",
  },
  {
    name: "Western Region",
    city: "Kisumu",
    area: "Western Kenya",
    coverage: "Kakamega, Bungoma, Busia",
    fee: 150,
    eta: "2-3 days",
    etaTone: "standard",
    deliveryType: "standard",
    status: "inactive",
    orders: 0,
    region: "inactive",
  },
  {
    name: "Eldoret Hub",
    city: "Eldoret",
    area: "Eldoret Town",
    coverage: "Eldoret CBD, Langas, Kapsoya",
    fee: 200,
    eta: "3-5 days",
    etaTone: "economy",
    deliveryType: "economy",
    status: "inactive",
    orders: 42,
    region: "inactive",
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
  const useDemoTotal = !query.q && !query.status && !query.city && !query.deliveryType;
  const total = useDemoTotal ? 12 : filtered.length;
  const skip = (page - 1) * limit;
  const zones = filtered.slice(skip, skip + limit);

  const stats = {
    total: 12,
    totalHint: "Active delivery areas",
    active: 10,
    activePct: 83.3,
    activeHint: "of total",
    ordersMonth: 4852,
    ordersDelta: 10.3,
    ordersHint: "vs last month",
    avgTime: "2.4 days",
    avgTimeHint: "Across all zones",
    avgFee: 120,
    avgFeeHint: "Across all zones",
    onTime: 93.8,
    onTimeDelta: 4.2,
    onTimeHint: "vs last month",
  };

  return {
    total,
    page,
    limit,
    stats,
    zones,
    topZones: [
      { name: "Nairobi CBD", orders: 1256, pct: 100 },
      { name: "Westlands", orders: 784, pct: 62.4 },
      { name: "Eastlands", orders: 645, pct: 51.4 },
      { name: "South B", orders: 532, pct: 42.4 },
      { name: "Rift Valley", orders: 456, pct: 36.3 },
    ],
    mapLegend: [
      { key: "nairobi", label: "Nairobi Zones", color: "#16a34a" },
      { key: "rift", label: "Rift Valley", color: "#6c5dd3" },
      { key: "coast", label: "Coast Region", color: "#ea580c" },
      { key: "other", label: "Other Regions", color: "#2563eb" },
      { key: "inactive", label: "Inactive Zones", color: "#94a3b8" },
    ],
    insights: [
      { key: "active", tone: "green", icon: "checkCircle", text: "10 zones are active and delivering" },
      { key: "same", tone: "blue", icon: "clock", text: "Same day delivery available in 1 zone" },
      { key: "inactive", tone: "orange", icon: "warning", text: "2 zones are currently inactive" },
      { key: "expand", tone: "purple", icon: "truck", text: "Consider adding more zones in high demand areas" },
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
