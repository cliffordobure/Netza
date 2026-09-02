const { loadZones, saveZones, decorateZone } = require("../../lib/delivery");

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

async function getDeliveryZones(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = await loadZones();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const zones = filtered.slice(skip, skip + limit);
  const active = all.filter((z) => z.status === "active");
  const avgFee = all.length
    ? Math.round(all.reduce((s, z) => s + (Number(z.fee) || 0), 0) / all.length)
    : 0;
  const ranked = [...all].sort((a, b) => (b.orders || 0) - (a.orders || 0)).slice(0, 3);
  const maxOrders = ranked[0]?.orders || 1;

  return {
    total,
    page,
    limit,
    stats: {
      total: all.length,
      totalHint: "Configured delivery areas",
      active: active.length,
      activePct: all.length ? Math.round((active.length / all.length) * 1000) / 10 : 0,
      activeHint: "of total",
      ordersMonth: all.reduce((s, z) => s + (z.orders || 0), 0),
      ordersDelta: 0,
      ordersHint: "vs last month",
      avgTime: "1-3 days",
      avgTimeHint: "Across all zones",
      avgFee,
      avgFeeHint: "Across all zones",
      onTime: 100,
      onTimeDelta: 0,
      onTimeHint: "vs last month",
    },
    zones,
    topZones: ranked.map((z) => ({
      name: z.name,
      orders: z.orders || 0,
      pct: Math.round(((z.orders || 0) / maxOrders) * 100),
    })),
    mapLegend: [
      { key: "nairobi", label: "Nairobi Zones", color: "#16a34a" },
      { key: "rift", label: "Rift Valley", color: "#6c5dd3" },
      { key: "coast", label: "Coast Region", color: "#ea580c" },
      { key: "other", label: "Other Regions", color: "#2563eb" },
      { key: "inactive", label: "Inactive Zones", color: "#94a3b8" },
    ],
    insights: [
      { key: "active", tone: "green", icon: "checkCircle", text: `${active.length} zone${active.length === 1 ? "" : "s"} are active and delivering` },
      { key: "same", tone: "blue", icon: "clock", text: `Same day delivery available in ${all.filter((z) => z.deliveryType === "same_day" && z.status === "active").length} zone(s)` },
      { key: "inactive", tone: "orange", icon: "warning", text: `${all.length - active.length} zone(s) currently inactive` },
    ],
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      cities: CITIES,
      deliveryTypes: DELIVERY_TYPES,
    },
    footerMessage:
      "Delivery fees on the app use these zone prices. Inactive zones are not charged. Unmatched addresses use the default zone fee from Delivery Settings.",
  };
}

async function upsertDeliveryZone(body = {}, id) {
  const zones = await loadZones();
  const rawId = id || body.id;
  const safeId = rawId && !String(rawId).startsWith("new-") ? rawId : `zone_${Date.now().toString(36)}`;
  const incoming = decorateZone({
    ...body,
    id: safeId,
  }, zones.length);
  const idx = zones.findIndex((z) => z.id === incoming.id);
  if (idx >= 0) zones[idx] = { ...zones[idx], ...incoming, n: idx + 1 };
  else zones.push(incoming);
  const saved = await saveZones(zones);
  return saved.find((z) => z.id === incoming.id);
}

async function deleteDeliveryZone(id) {
  const zones = await loadZones();
  const next = zones.filter((z) => z.id !== id);
  if (next.length === zones.length) return null;
  await saveZones(next);
  return true;
}

module.exports = { getDeliveryZones, upsertDeliveryZone, deleteDeliveryZone };
