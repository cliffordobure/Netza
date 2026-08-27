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
    email: "peter.okello@netza.co.ke",
    vehicle: "motorbike",
    plate: "KMEQ 123P",
    zone: "Nairobi Central",
    status: "online",
    rating: 4.8,
    completed: 156,
    verification: "verified",
  },
  {
    name: "Grace Achieng",
    code: "C0018",
    phone: "+254 722 111 222",
    email: "grace.achieng@netza.co.ke",
    vehicle: "bicycle",
    plate: "KMD 445A",
    zone: "Westlands",
    status: "on_delivery",
    rating: 4.9,
    completed: 203,
    verification: "verified",
  },
  {
    name: "James Mwangi",
    code: "C0024",
    phone: "+254 733 444 555",
    email: "james.mwangi@netza.co.ke",
    vehicle: "motorbike",
    plate: "KMF 778B",
    zone: "Kilimani",
    status: "online",
    rating: 4.6,
    completed: 142,
    verification: "verified",
  },
  {
    name: "Faith Chebet",
    code: "C0031",
    phone: "+254 701 888 999",
    email: "faith.chebet@netza.co.ke",
    vehicle: "car",
    plate: "KCA 902C",
    zone: "Karen",
    status: "offline",
    rating: 4.3,
    completed: 98,
    verification: "pending",
  },
  {
    name: "Brian Otieno",
    code: "C0037",
    phone: "+254 715 222 333",
    email: "brian.otieno@netza.co.ke",
    vehicle: "motorbike",
    plate: "KMG 334D",
    zone: "Eastlands",
    status: "on_delivery",
    rating: 4.7,
    completed: 187,
    verification: "verified",
  },
  {
    name: "Anne Mutua",
    code: "C0042",
    phone: "+254 720 555 666",
    email: "anne.mutua@netza.co.ke",
    vehicle: "van",
    plate: "KCB 551E",
    zone: "Thika Road",
    status: "online",
    rating: 4.5,
    completed: 121,
    verification: "verified",
  },
  {
    name: "Samuel Kariuki",
    code: "C0049",
    phone: "+254 711 777 888",
    email: "samuel.kariuki@netza.co.ke",
    vehicle: "motorbike",
    plate: "KMH 667F",
    zone: "Ngong Road",
    status: "offline",
    rating: 4.1,
    completed: 76,
    verification: "rejected",
  },
  {
    name: "Linda Wanjiku",
    code: "C0055",
    phone: "+254 708 333 444",
    email: "linda.wanjiku@netza.co.ke",
    vehicle: "bicycle",
    plate: "KMD 889G",
    zone: "Mombasa Road",
    status: "online",
    rating: 4.8,
    completed: 164,
    verification: "verified",
  },
  {
    name: "David Kipchoge",
    code: "C0061",
    phone: "+254 724 999 000",
    email: "david.kipchoge@netza.co.ke",
    vehicle: "motorbike",
    plate: "KMJ 112H",
    zone: "Nairobi Central",
    status: "on_delivery",
    rating: 4.9,
    completed: 221,
    verification: "verified",
  },
  {
    name: "Mercy Akinyi",
    code: "C0068",
    phone: "+254 716 123 456",
    email: "mercy.akinyi@netza.co.ke",
    vehicle: "car",
    plate: "KCC 445J",
    zone: "Westlands",
    status: "online",
    rating: 4.4,
    completed: 109,
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
  const useDemoTotal = !query.q && !query.status && !query.zone && !query.vehicle && !query.verification;
  const total = useDemoTotal ? 86 : filtered.length;
  const skip = (page - 1) * limit;
  const couriers =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const stats = {
    total: 86,
    totalDelta: 5.3,
    totalHint: "vs last month",
    active: 72,
    activePct: 83.7,
    activeHint: "of total",
    onDelivery: 24,
    onDeliveryPct: 27.9,
    onDeliveryHint: "of total",
    offline: 14,
    offlinePct: 16.3,
    offlineHint: "of total",
    avgRating: 4.7,
    avgRatingDelta: 0.2,
    avgRatingHint: "vs last month",
    completed: 5432,
    completedDelta: 9.8,
    completedHint: "this month",
  };

  const statusDonut = [
    { key: "online", name: "Online", value: 72, color: "#16a34a", pct: 83.7 },
    { key: "on_delivery", name: "On Delivery", value: 24, color: "#ea580c", pct: 27.9 },
    { key: "offline", name: "Offline", value: 14, color: "#dc2626", pct: 16.3 },
  ];

  const topPerformers = [
    { name: "David Kipchoge", code: "C0061", avatar: avatar("David Kipchoge", 301), completed: 221, rating: 4.9 },
    { name: "Grace Achieng", code: "C0018", avatar: avatar("Grace Achieng", 302), completed: 203, rating: 4.9 },
    { name: "Brian Otieno", code: "C0037", avatar: avatar("Brian Otieno", 303), completed: 187, rating: 4.7 },
    { name: "Linda Wanjiku", code: "C0055", avatar: avatar("Linda Wanjiku", 304), completed: 164, rating: 4.8 },
    { name: "Peter Okello", code: "C0012", avatar: avatar("Peter Okello", 305), completed: 156, rating: 4.8 },
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
      { key: "verified", label: "Verified", value: 76, pct: 88.4, tone: "green" },
      { key: "pending", label: "Pending Verification", value: 6, pct: 7.0, tone: "amber" },
      { key: "rejected", label: "Rejected", value: 4, pct: 4.6, tone: "red" },
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
