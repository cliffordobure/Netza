const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const ZONES = [
  "Nairobi Central",
  "Westlands",
  "Kilimani",
  "Karen",
  "Eastlands",
  "Thika Road",
  "Ngong Road",
  "Mombasa Road",
];

const VEHICLES = [
  { value: "motorbike", label: "Motorbike" },
  { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
];

const STATUSES = [
  { key: "online", label: "Online", color: "#16a34a" },
  { key: "on_delivery", label: "On Delivery", color: "#ea580c" },
  { key: "offline", label: "Offline", color: "#dc2626" },
];

const VERIFICATIONS = [
  { key: "verified", label: "Verified" },
  { key: "pending", label: "Pending Verification" },
  { key: "rejected", label: "Rejected" },
];

const SEED = [
  {
    name: "Peter Okello",
    code: "C0012",
    phone: "+254 712 345 678",
    email: "peter.okello@tajira.co.ke",
    vehicle: "motorbike",
    plate: "KMEQ 123P",
    zone: "Nairobi Central",
    status: "online",
    rating: 4.8,
    completed: 12,
    verification: "verified",
  },
  {
    name: "Grace Achieng",
    code: "C0018",
    phone: "+254 722 111 222",
    email: "grace.achieng@tajira.co.ke",
    vehicle: "bicycle",
    plate: "KMD 445A",
    zone: "Westlands",
    status: "on_delivery",
    rating: 4.9,
    completed: 15,
    verification: "verified",
  },
  {
    name: "James Mwangi",
    code: "C0024",
    phone: "+254 733 444 555",
    email: "james.mwangi@tajira.co.ke",
    vehicle: "motorbike",
    plate: "KMF 778B",
    zone: "Kilimani",
    status: "offline",
    rating: 4.6,
    completed: 8,
    verification: "pending",
  },
];

function buildRows() {
  return SEED.map((row, i) => {
    const vehicle = VEHICLES.find((v) => v.value === row.vehicle);
    const st = STATUSES.find((s) => s.key === row.status);
    return {
      id: `cou${i + 1}`,
      n: i + 1,
      name: row.name,
      code: row.code,
      avatar: avatar(row.name, i + 240),
      phone: row.phone,
      email: row.email,
      vehicleType: row.vehicle,
      vehicleLabel: vehicle?.label || row.vehicle,
      plate: row.plate,
      zone: row.zone,
      status: row.status,
      statusLabel: st.label,
      rating: row.rating,
      completed: row.completed,
      verification: row.verification,
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
        r.code.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.plate.toLowerCase().includes(q) ||
        r.zone.toLowerCase().includes(q) ||
        r.vehicleLabel.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.zone) list = list.filter((r) => r.zone === query.zone);
  if (query.vehicle) list = list.filter((r) => r.vehicleType === query.vehicle);
  if (query.verification) list = list.filter((r) => r.verification === query.verification);
  return list;
}

function getDeliveryCouriers(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const couriers = filtered.slice(skip, skip + limit);

  const stats = {
    total: 3,
    totalDelta: 0,
    totalHint: "vs last month",
    active: 2,
    activePct: 66.7,
    activeHint: "of total",
    onDelivery: 1,
    onDeliveryPct: 33.3,
    onDeliveryHint: "of total",
    offline: 1,
    offlinePct: 33.3,
    offlineHint: "of total",
    avgRating: 4.8,
    avgRatingDelta: 0.1,
    avgRatingHint: "vs last month",
    completed: 35,
    completedDelta: 0,
    completedHint: "this month",
  };

  const statusDonut = [
    { key: "online", name: "Online", value: 1, color: "#16a34a", pct: 33.3 },
    { key: "on_delivery", name: "On Delivery", value: 1, color: "#ea580c", pct: 33.3 },
    { key: "offline", name: "Offline", value: 1, color: "#dc2626", pct: 33.4 },
  ];

  const topPerformers = [
    { name: "Grace Achieng", code: "C0018", avatar: avatar("Grace Achieng", 302), completed: 15, rating: 4.9 },
    { name: "Peter Okello", code: "C0012", avatar: avatar("Peter Okello", 305), completed: 12, rating: 4.8 },
    { name: "James Mwangi", code: "C0024", avatar: avatar("James Mwangi", 303), completed: 8, rating: 4.6 },
  ];

  return {
    total,
    page,
    limit,
    stats,
    couriers,
    statusDonut,
    topPerformers,
    verification: [
      { key: "verified", label: "Verified", value: 2, pct: 66.7, tone: "green" },
      { key: "pending", label: "Pending Verification", value: 1, pct: 33.3, tone: "amber" },
      { key: "rejected", label: "Rejected", value: 0, pct: 0, tone: "red" },
    ],
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      zones: ZONES,
      vehicles: VEHICLES,
      verifications: VERIFICATIONS.map((v) => ({ value: v.key, label: v.label })),
    },
    footerMessage: "Manage your courier team, track their performance and ensure timely deliveries to customers.",
  };
}

module.exports = { getDeliveryCouriers };
