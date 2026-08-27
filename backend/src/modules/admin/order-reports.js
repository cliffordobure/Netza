const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const STATUSES = [
  { key: "delivered", label: "Delivered", color: "#16a34a" },
  { key: "shipped", label: "Shipped", color: "#2563eb" },
  { key: "processing", label: "Processing", color: "#0ea5e9" },
  { key: "pending", label: "Pending", color: "#ea580c" },
  { key: "cancelled", label: "Cancelled", color: "#dc2626" },
];

const PAYMENTS = [
  { key: "mpesa", label: "M-PESA" },
  { key: "card", label: "Card" },
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank Transfer" },
];

const CHANNELS = [
  { key: "mobile", label: "Mobile App" },
  { key: "web", label: "Web" },
  { key: "pos", label: "POS" },
  { key: "phone", label: "Phone" },
];

const ZONES = [
  "Nairobi CBD",
  "Westlands",
  "Kilimani",
  "Karen",
  "Eastlands",
  "Coast Region",
  "Rift Valley",
];

const SEED = [
  {
    orderId: "ORD-2026-012845",
    customer: "Mercy Wanjiku",
    phone: "+254 712 345 678",
    date: "27 May 2026",
    time: "11:45 AM",
    status: "delivered",
    amount: 6500,
    payment: "mpesa",
    channel: "mobile",
    zone: "Nairobi CBD",
  },
  {
    orderId: "ORD-2026-012843",
    customer: "Brian Kircho",
    phone: "+254 722 111 222",
    date: "27 May 2026",
    time: "10:20 AM",
    status: "shipped",
    amount: 12800,
    payment: "card",
    channel: "web",
    zone: "Westlands",
  },
  {
    orderId: "ORD-2026-012842",
    customer: "Faith Achieng",
    phone: "+254 715 123 456",
    date: "27 May 2026",
    time: "09:15 AM",
    status: "processing",
    amount: 4200,
    payment: "mpesa",
    channel: "mobile",
    zone: "Kilimani",
  },
  {
    orderId: "ORD-2026-012841",
    customer: "Peter Okello",
    phone: "+254 701 222 333",
    date: "26 May 2026",
    time: "08:40 AM",
    status: "pending",
    amount: 9750,
    payment: "cash",
    channel: "pos",
    zone: "Eastlands",
  },
  {
    orderId: "ORD-2026-012840",
    customer: "Helen Mwangi",
    phone: "+254 710 555 666",
    date: "26 May 2026",
    time: "06:30 PM",
    status: "delivered",
    amount: 7800,
    payment: "card",
    channel: "web",
    zone: "Karen",
  },
];

function buildRows() {
  return SEED.map((row, i) => {
    const st = STATUSES.find((s) => s.key === row.status);
    const pay = PAYMENTS.find((p) => p.key === row.payment);
    const ch = CHANNELS.find((c) => c.key === row.channel);
    return {
      id: `ordr${i + 1}`,
      n: i + 1,
      orderId: row.orderId,
      customerName: row.customer,
      customerPhone: row.phone,
      customerAvatar: avatar(row.customer, i + 700),
      date: row.date,
      time: row.time,
      status: row.status,
      statusLabel: st.label,
      amount: row.amount,
      payment: row.payment,
      paymentLabel: pay.label,
      channel: row.channel,
      channelLabel: ch.label,
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
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.payment) list = list.filter((r) => r.payment === query.payment);
  if (query.channel) list = list.filter((r) => r.channel === query.channel);
  if (query.zone) list = list.filter((r) => r.zone === query.zone);
  return list;
}

function getOrderReports(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 5));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = 4852;
  const skip = (page - 1) * limit;
  const orders = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      totalOrders: 4852,
      totalOrdersDelta: 14.3,
      totalOrdersHint: "vs last month",
      completed: 2356,
      completedDelta: 16.2,
      completedHint: "vs last month",
      pending: 1248,
      pendingDelta: 8.7,
      pendingHint: "vs last month",
      cancelled: 107,
      cancelledDelta: -3.2,
      cancelledHint: "vs last month",
      revenue: 1245600,
      revenueDelta: 14.7,
      revenueHint: "vs last month",
    },
    orders,
    ordersOverview: {
      labels: ["01 May", "07 May", "14 May", "21 May", "27 May"],
      total: [420, 510, 640, 780, 920],
      completed: [210, 280, 340, 410, 480],
      pending: [140, 150, 180, 220, 260],
      cancelled: [18, 22, 20, 24, 16],
    },
    statusDonut: [
      { key: "completed", name: "Completed", value: 2356, color: "#16a34a", pct: 48.8 },
      { key: "pending", name: "Pending", value: 1248, color: "#ea580c", pct: 25.7 },
      { key: "processing", name: "Processing", value: 1141, color: "#0ea5e9", pct: 23.5 },
      { key: "cancelled", name: "Cancelled", value: 107, color: "#dc2626", pct: 2.2 },
    ],
    channelDonut: [
      { key: "mobile", name: "Mobile App", value: 2012, color: "#6c5dd3", pct: 41.4 },
      { key: "web", name: "Web", value: 1245, color: "#2563eb", pct: 25.6 },
      { key: "pos", name: "POS", value: 986, color: "#0d9488", pct: 20.3 },
      { key: "phone", name: "Phone", value: 609, color: "#ea580c", pct: 12.7 },
    ],
    salesSummary: [
      { key: "revenue", label: "Total Revenue (KES)", value: 1245600 },
      { key: "aov", label: "Average Order Value (KES)", value: 6563 },
      { key: "discounts", label: "Total Discounts (KES)", value: 32450 },
      { key: "tax", label: "Total Tax (KES)", value: 85620 },
      { key: "net", label: "Net Revenue (KES)", value: 1127530 },
    ],
    insights: [
      { key: "i1", icon: "trend", text: "Orders increased by 14.3% compared to last month." },
      { key: "i2", icon: "phone", text: "Mobile App generated the most orders (41.4%)." },
      { key: "i3", icon: "wallet", text: "Average order value is KES 6,563." },
      { key: "i4", icon: "card", text: "M-PESA is the most used payment method (67.7%)." },
    ],
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      payments: PAYMENTS.map((p) => ({ value: p.key, label: p.label })),
      channels: CHANNELS.map((c) => ({ value: c.key, label: c.label })),
      zones: ZONES,
    },
  };
}

module.exports = { getOrderReports };
