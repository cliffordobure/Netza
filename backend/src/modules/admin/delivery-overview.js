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
  { name: "Peter Otieno", phone: "+254 701 888 999" },
  { name: "Grace Akinyi", phone: "+254 715 222 333" },
  { name: "David Kipchoge", phone: "+254 720 555 666" },
  { name: "Faith Achieng", phone: "+254 711 777 888" },
  { name: "Samuel Mutua", phone: "+254 708 333 444" },
  { name: "Brian Ochieng", phone: "+254 724 999 000" },
  { name: "Linda Chebet", phone: "+254 716 123 456" },
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
  { status: "failed", courier: 0, zone: "Eastlands", date: "26 May 2026", time: "03:40 PM", track: "G4S-884100" },
  { status: "delivered", courier: 1, zone: "Thika Road", date: "26 May 2026", time: "04:52 PM", track: "SND-771988" },
  { status: "returned", courier: 3, zone: "Ngong Road", date: "25 May 2026", time: "02:15 PM", track: "OTH-120044" },
  { status: "in_transit", courier: 2, zone: "Mombasa Road", date: "28 May 2026", time: "01:00 PM", track: "BLT-551088" },
  { status: "delivered", courier: 0, zone: "Nairobi CBD", date: "25 May 2026", time: "11:45 AM", track: "G4S-883955" },
  { status: "pending_pickup", courier: 1, zone: "Westlands", date: "28 May 2026", time: "03:30 PM", track: "SND-771850" },
  { status: "in_transit", courier: 2, zone: "Kilimani", date: "27 May 2026", time: "07:00 PM", track: "BLT-550990" },
];

function buildRows() {
  return SEED.map((row, i) => {
    const courier = COURIERS[row.courier];
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const st = STATUSES.find((s) => s.key === row.status);
    return {
      id: `shp${i + 1}`,
      n: i + 1,
      shipmentId: `SHP-2026-${String(2856 - i).padStart(6, "0")}`,
      orderId: `ORD-2026-${String(12845 - i).padStart(6, "0")}`,
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
  const useDemoTotal = !query.q && !query.status && !query.courier && !query.zone;
  const total = useDemoTotal ? 2856 : filtered.length;
  const skip = (page - 1) * limit;
  const shipments =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const stats = {
    total: 2856,
    totalDelta: 12.6,
    totalHint: "vs last month",
    delivered: 2184,
    deliveredPct: 76.5,
    deliveredHint: "of total",
    inTransit: 462,
    inTransitPct: 16.2,
    inTransitHint: "of total",
    pendingPickup: 128,
    pendingPickupPct: 4.5,
    pendingPickupHint: "of total",
    failedReturned: 82,
    failedReturnedDelta: -8.1,
    failedReturnedHint: "vs last month",
    successRate: 96.3,
    successRateDelta: 3.7,
    successRateHint: "vs last month",
  };

  const statusDonut = [
    { key: "delivered", name: "Delivered", value: 2184, color: "#16a34a", pct: 76.5 },
    { key: "in_transit", name: "In Transit", value: 462, color: "#2563eb", pct: 16.2 },
    { key: "pending_pickup", name: "Pending Pickup", value: 128, color: "#ea580c", pct: 4.5 },
    { key: "failed", name: "Failed", value: 51, color: "#dc2626", pct: 1.8 },
    { key: "returned", name: "Returned", value: 31, color: "#e11d48", pct: 1.1 },
  ];

  const topCouriers = [
    { name: "G4S", shipments: 1125, pct: 39.4 },
    { name: "Sendy", shipments: 876, pct: 30.7 },
    { name: "Bolt Express", shipments: 691, pct: 24.2 },
    { name: "Others", shipments: 164, pct: 5.7 },
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
      { key: "onTime", label: "On-Time Delivery Rate", value: "93.8%", delta: 4.2, deltaLabel: "4.2%", goodDown: false },
      { key: "failed", label: "Failed Delivery Rate", value: "1.8%", delta: 0.5, deltaLabel: "0.5%", goodDown: true },
      { key: "returned", label: "Returned Delivery Rate", value: "1.1%", delta: -0.3, deltaLabel: "0.3%", goodDown: true },
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
