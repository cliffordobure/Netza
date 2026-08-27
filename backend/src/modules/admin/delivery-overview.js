const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const COURIERS = [
  { id: "c1", name: "G4S" },
  { id: "c2", name: "Sendy" },
  { id: "c3", name: "Bolt Express" },
  { id: "c4", name: "Others" },
];

const ZONES = [
  "Nairobi CBD",
  "Westlands",
  "Kilimani",
  "Karen",
  "Eastlands",
  "Thika Road",
  "Ngong Road",
  "Mombasa Road",
];

const CUSTOMERS = [
  { name: "Mercy Wanjiku", phone: "+254 712 345 678" },
  { name: "James Mwangi", phone: "+254 722 111 222" },
  { name: "Anne Mutua", phone: "+254 733 444 555" },
];

const STATUSES = [
  { key: "delivered", label: "Delivered", color: "#16a34a" },
  { key: "in_transit", label: "In Transit", color: "#2563eb" },
  { key: "pending_pickup", label: "Pending Pickup", color: "#ea580c" },
  { key: "failed", label: "Failed", color: "#dc2626" },
  { key: "returned", label: "Returned", color: "#e11d48" },
];

const SEED = [
  { status: "delivered", courier: 0, zone: "Westlands", date: "27 May 2026", time: "01:48 PM", track: "G4S-884521" },
  { status: "in_transit", courier: 1, zone: "Kilimani", date: "27 May 2026", time: "04:30 PM", track: "SND-772190" },
  { status: "pending_pickup", courier: 2, zone: "Karen", date: "28 May 2026", time: "11:00 AM", track: "BLT-551203" },
];

function buildRows() {
  return SEED.map((row, i) => {
    const courier = COURIERS[row.courier];
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const st = STATUSES.find((s) => s.key === row.status);
    return {
      id: `shp${i + 1}`,
      n: i + 1,
      shipmentId: `SHP-2026-${String(3 - i).padStart(6, "0")}`,
      orderId: `ORD-2026-${String(3 - i).padStart(6, "0")}`,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAvatar: avatar(customer.name, i + 80),
      courierId: courier.id,
      courierName: courier.name,
      trackingId: row.track,
      zone: row.zone,
      status: row.status,
      statusLabel: st.label,
      date: row.date,
      time: row.time,
    };
  });
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.shipmentId.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.toLowerCase().includes(q) ||
        r.courierName.toLowerCase().includes(q) ||
        r.trackingId.toLowerCase().includes(q) ||
        r.zone.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.courier) list = list.filter((r) => r.courierId === query.courier);
  if (query.zone) list = list.filter((r) => r.zone === query.zone);
  return list;
}

function getDeliveryOverview(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const shipments = filtered.slice(skip, skip + limit);

  const stats = {
    total: 3,
    totalDelta: 0,
    totalHint: "vs last month",
    delivered: 1,
    deliveredPct: 33.3,
    deliveredHint: "of total",
    inTransit: 1,
    inTransitPct: 33.3,
    inTransitHint: "of total",
    pendingPickup: 1,
    pendingPickupPct: 33.4,
    pendingPickupHint: "of total",
    failedReturned: 0,
    failedReturnedDelta: 0,
    failedReturnedHint: "vs last month",
    successRate: 100,
    successRateDelta: 0,
    successRateHint: "vs last month",
  };

  const statusDonut = [
    { key: "delivered", name: "Delivered", value: 1, color: "#16a34a", pct: 33.3 },
    { key: "in_transit", name: "In Transit", value: 1, color: "#2563eb", pct: 33.3 },
    { key: "pending_pickup", name: "Pending Pickup", value: 1, color: "#ea580c", pct: 33.4 },
  ];

  const topCouriers = [
    { name: "G4S", shipments: 1, pct: 33.3 },
    { name: "Sendy", shipments: 1, pct: 33.3 },
    { name: "Bolt Express", shipments: 1, pct: 33.4 },
  ];

  return {
    total,
    page,
    limit,
    stats,
    shipments,
    statusDonut,
    topCouriers,
    performance: [
      { key: "avgTime", label: "Average Delivery Time", value: "2.4 days", delta: -0.6, deltaLabel: "0.6 day", goodDown: true },
      { key: "onTime", label: "On-Time Delivery Rate", value: "100%", delta: 0, deltaLabel: "0%", goodDown: false },
      { key: "failed", label: "Failed Delivery Rate", value: "0%", delta: 0, deltaLabel: "0%", goodDown: true },
      { key: "returned", label: "Returned Delivery Rate", value: "0%", delta: 0, deltaLabel: "0%", goodDown: true },
    ],
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      couriers: COURIERS.map((c) => ({ value: c.id, label: c.name })),
      zones: ZONES,
    },
    footerMessage: "Tip: Use filters to quickly find shipments by status, courier, or date range.",
  };
}

module.exports = { getDeliveryOverview };
