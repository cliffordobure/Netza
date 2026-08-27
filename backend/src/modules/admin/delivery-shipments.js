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
  {
    status: "failed",
    courier: 0,
    zone: "Eastlands",
    destination: "Eastlands 00500",
    date: "26 May 2026",
    time: "03:40 PM",
    track: "G4S-884100",
  },
  {
    status: "returned",
    courier: 1,
    zone: "Thika Road",
    destination: "Thika Road 00600",
    date: "26 May 2026",
    time: "01:20 PM",
    track: "SND-771988",
  },
  {
    status: "ready",
    courier: 3,
    zone: "Karen",
    destination: "Karen 00502",
    date: "28 May 2026",
    time: "09:00 AM",
    track: "OTH-120044",
  },
  {
    status: "delivered",
    courier: 2,
    zone: "Ngong Road",
    destination: "Ngong Road 00200",
    date: "25 May 2026",
    time: "05:10 PM",
    track: "BLT-551088",
  },
  {
    status: "in_transit",
    courier: 0,
    zone: "Mombasa Road",
    destination: "Mombasa Road 00506",
    date: "28 May 2026",
    time: "12:30 PM",
    track: "G4S-883955",
  },
  {
    status: "out_for_delivery",
    courier: 1,
    zone: "Westlands",
    destination: "Westlands 00800",
    date: "27 May 2026",
    time: "06:45 PM",
    track: "SND-771850",
  },
  {
    status: "delivered",
    courier: 2,
    zone: "Kilimani",
    destination: "Kilimani 00100",
    date: "25 May 2026",
    time: "10:15 AM",
    track: "BLT-550990",
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
      shipmentId: `SHP-2026-${String(2856 - i).padStart(6, "0")}`,
      orderId: `ORD-2026-${String(12845 - i).padStart(6, "0")}`,
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
  const useDemoTotal = !query.q && !query.status && !query.courier && !query.zone;
  const total = useDemoTotal ? 2856 : filtered.length;
  const skip = (page - 1) * limit;
  const shipments =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const stats = {
    draft: 24,
    draftPct: 0.8,
    draftHint: "of total",
    ready: 96,
    readyPct: 3.4,
    readyHint: "of total",
    dispatched: 458,
    dispatchedPct: 16.0,
    dispatchedHint: "of total",
    outForDelivery: 312,
    outForDeliveryPct: 10.9,
    outForDeliveryHint: "of total",
    delivered: 2184,
    deliveredPct: 76.5,
    deliveredHint: "of total",
    returned: 32,
    returnedPct: 1.1,
    returnedHint: "of total",
    total: 2856,
  };

  const statusDonut = [
    { key: "draft", name: "Draft", value: 24, color: "#7c3aed", pct: 0.8 },
    { key: "ready", name: "Ready to Dispatch", value: 96, color: "#2563eb", pct: 3.4 },
    { key: "dispatched", name: "Dispatched", value: 458, color: "#16a34a", pct: 16.0 },
    { key: "out_for_delivery", name: "Out for Delivery", value: 312, color: "#6c5dd3", pct: 10.9 },
    { key: "delivered", name: "Delivered", value: 2184, color: "#22c55e", pct: 76.5 },
    { key: "returned", name: "Returned", value: 32, color: "#ef4444", pct: 1.1 },
  ];

  const topZones = [
    { name: "Nairobi", shipments: 1357, pct: 47.5 },
    { name: "Central", shipments: 563, pct: 19.7 },
    { name: "Rift Valley", shipments: 428, pct: 15.0 },
    { name: "Coast", shipments: 305, pct: 10.7 },
    { name: "Western", shipments: 203, pct: 7.1 },
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
        value: "1.8%",
        delta: 0.5,
        deltaLabel: "0.5%",
        goodDown: true,
        spark: [12, 14, 13, 15, 16, 17, 18, 20],
        sparkColor: "#dc2626",
      },
      {
        key: "returned",
        label: "Returned Delivery Rate",
        value: "1.1%",
        delta: -0.3,
        deltaLabel: "0.3%",
        goodDown: true,
        spark: [22, 20, 19, 18, 16, 15, 13, 11],
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
