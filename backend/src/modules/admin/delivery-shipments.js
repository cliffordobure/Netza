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
  { key: "draft", label: "Draft", color: "#7c3aed" },
  { key: "ready", label: "Ready to Dispatch", color: "#ca8a04" },
  { key: "dispatched", label: "Dispatched", color: "#16a34a" },
  { key: "out_for_delivery", label: "Out for Delivery", color: "#6c5dd3" },
  { key: "in_transit", label: "In Transit", color: "#2563eb" },
  { key: "delivered", label: "Delivered", color: "#16a34a" },
  { key: "failed", label: "Failed", color: "#dc2626" },
  { key: "returned", label: "Returned", color: "#ea580c" },
];

const SEED = [
  {
    status: "delivered",
    courier: 0,
    zone: "Nairobi CBD",
    destination: "Nairobi, CBD 00100",
    date: "27 May 2026",
    time: "11:45 AM",
    track: "G4S-884521",
  },
  {
    status: "in_transit",
    courier: 1,
    zone: "Westlands",
    destination: "Westlands 00800",
    date: "27 May 2026",
    time: "04:30 PM",
    track: "SND-772190",
  },
  {
    status: "out_for_delivery",
    courier: 2,
    zone: "Kilimani",
    destination: "Kilimani 00100",
    date: "27 May 2026",
    time: "02:15 PM",
    track: "BLT-551203",
  },
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
      customerAvatar: avatar(customer.name, i + 180),
      courierId: courier.id,
      courierName: courier.name,
      trackingId: row.track,
      zone: row.zone,
      destination: row.destination,
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
        r.zone.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.courier) list = list.filter((r) => r.courierId === query.courier);
  if (query.zone) list = list.filter((r) => r.zone === query.zone);
  return list;
}

function getDeliveryShipments(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const shipments = filtered.slice(skip, skip + limit);

  const stats = {
    draft: 0,
    draftPct: 0,
    draftHint: "of total",
    ready: 0,
    readyPct: 0,
    readyHint: "of total",
    dispatched: 0,
    dispatchedPct: 0,
    dispatchedHint: "of total",
    outForDelivery: 1,
    outForDeliveryPct: 33.3,
    outForDeliveryHint: "of total",
    delivered: 1,
    deliveredPct: 33.3,
    deliveredHint: "of total",
    returned: 0,
    returnedPct: 0,
    returnedHint: "of total",
    total: 3,
  };

  const statusDonut = [
    { key: "delivered", name: "Delivered", value: 1, color: "#22c55e", pct: 33.3 },
    { key: "in_transit", name: "In Transit", value: 1, color: "#2563eb", pct: 33.3 },
    { key: "out_for_delivery", name: "Out for Delivery", value: 1, color: "#6c5dd3", pct: 33.4 },
  ];

  const topZones = [
    { name: "Nairobi CBD", shipments: 1, pct: 33.3 },
    { name: "Westlands", shipments: 1, pct: 33.3 },
    { name: "Kilimani", shipments: 1, pct: 33.4 },
  ];

  return {
    total,
    page,
    limit,
    stats,
    shipments,
    statusDonut,
    topZones,
    performance: [
      {
        key: "avgTime",
        label: "Average Delivery Time",
        value: "2.4 days",
        delta: -0.6,
        deltaLabel: "0.6 day",
        goodDown: true,
        spark: [42, 38, 40, 34, 30, 28, 26, 24],
        sparkColor: "#16a34a",
      },
      {
        key: "onTime",
        label: "On-Time Delivery Rate",
        value: "93.8%",
        delta: 4.2,
        deltaLabel: "4.2%",
        goodDown: false,
        spark: [78, 80, 82, 84, 86, 88, 90, 94],
        sparkColor: "#16a34a",
      },
      {
        key: "failed",
        label: "Failed Delivery Rate",
        value: "0%",
        delta: 0,
        deltaLabel: "0%",
        goodDown: true,
        spark: [2, 2, 1, 1, 0, 0, 0, 0],
        sparkColor: "#dc2626",
      },
      {
        key: "returned",
        label: "Returned Delivery Rate",
        value: "0%",
        delta: 0,
        deltaLabel: "0%",
        goodDown: true,
        spark: [1, 1, 0, 0, 0, 0, 0, 0],
        sparkColor: "#16a34a",
      },
    ],
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      couriers: COURIERS.map((c) => ({ value: c.id, label: c.name })),
      zones: ZONES,
    },
    footerMessage: "Track shipments in real time and ensure timely delivery to improve customer satisfaction.",
  };
}

module.exports = { getDeliveryShipments };
