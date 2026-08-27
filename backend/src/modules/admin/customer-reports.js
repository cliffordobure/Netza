const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const SEGMENTS = [
  { key: "regular", label: "Regular", color: "#2563eb" },
  { key: "premium", label: "Premium", color: "#16a34a" },
  { key: "vip", label: "VIP", color: "#7c3aed" },
  { key: "new", label: "New", color: "#eab308" },
];

const STATUSES = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "new", label: "New" },
];

const CHANNELS = [
  { key: "mobile", label: "Mobile App" },
  { key: "web", label: "Web" },
  { key: "pos", label: "POS" },
  { key: "phone", label: "Phone" },
];

const LOCATIONS = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri"];

const SEED = [
  {
    name: "Mercy Wanjiku",
    email: "mercy.wanjiku@email.com",
    phone: "+254 712 345 678",
    segment: "premium",
    status: "active",
    orders: 42,
    spend: 78450,
    avgOrder: 1868,
    lastOrder: "26 May 2026",
    location: "Nairobi",
    channel: "mobile",
  },
  {
    name: "Brian Kircho",
    email: "brian.kircho@email.com",
    phone: "+254 722 111 222",
    segment: "vip",
    status: "active",
    orders: 68,
    spend: 142800,
    avgOrder: 2100,
    lastOrder: "27 May 2026",
    location: "Nairobi",
    channel: "web",
  },
  {
    name: "Faith Achieng",
    email: "faith.achieng@email.com",
    phone: "+254 715 123 456",
    segment: "regular",
    status: "active",
    orders: 18,
    spend: 32400,
    avgOrder: 1800,
    lastOrder: "25 May 2026",
    location: "Kisumu",
    channel: "mobile",
  },
  {
    name: "Peter Okello",
    email: "peter.okello@email.com",
    phone: "+254 701 222 333",
    segment: "regular",
    status: "active",
    orders: 24,
    spend: 45600,
    avgOrder: 1900,
    lastOrder: "24 May 2026",
    location: "Mombasa",
    channel: "pos",
  },
  {
    name: "Helen Mwangi",
    email: "helen.mwangi@email.com",
    phone: "+254 710 555 666",
    segment: "premium",
    status: "active",
    orders: 35,
    spend: 67200,
    avgOrder: 1920,
    lastOrder: "26 May 2026",
    location: "Nairobi",
    channel: "web",
  },
  {
    name: "James Otieno",
    email: "james.otieno@email.com",
    phone: "+254 723 444 555",
    segment: "new",
    status: "new",
    orders: 2,
    spend: 8500,
    avgOrder: 4250,
    lastOrder: "27 May 2026",
    location: "Nakuru",
    channel: "mobile",
  },
  {
    name: "Grace Njeri",
    email: "grace.njeri@email.com",
    phone: "+254 711 888 999",
    segment: "vip",
    status: "active",
    orders: 91,
    spend: 198500,
    avgOrder: 2181,
    lastOrder: "27 May 2026",
    location: "Nairobi",
    channel: "web",
  },
  {
    name: "Daniel Kamau",
    email: "daniel.kamau@email.com",
    phone: "+254 700 111 000",
    segment: "regular",
    status: "inactive",
    orders: 7,
    spend: 12400,
    avgOrder: 1771,
    lastOrder: "12 Mar 2026",
    location: "Eldoret",
    channel: "phone",
  },
  {
    name: "Amina Hassan",
    email: "amina.hassan@email.com",
    phone: "+254 714 333 777",
    segment: "premium",
    status: "active",
    orders: 29,
    spend: 58900,
    avgOrder: 2031,
    lastOrder: "23 May 2026",
    location: "Mombasa",
    channel: "mobile",
  },
  {
    name: "Samuel Kiprop",
    email: "samuel.kiprop@email.com",
    phone: "+254 721 999 111",
    segment: "new",
    status: "new",
    orders: 1,
    spend: 6200,
    avgOrder: 6200,
    lastOrder: "26 May 2026",
    location: "Eldoret",
    channel: "web",
  },
];

function buildRows() {
  return SEED.map((row, i) => {
    const seg = SEGMENTS.find((s) => s.key === row.segment);
    const st = STATUSES.find((s) => s.key === row.status);
    const ch = CHANNELS.find((c) => c.key === row.channel);
    return {
      id: `custr${i + 1}`,
      n: i + 1,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatar: avatar(row.name, i + 900),
      segment: row.segment,
      segmentLabel: seg.label,
      status: row.status,
      statusLabel: st.label,
      orders: row.orders,
      spend: row.spend,
      avgOrder: row.avgOrder,
      lastOrder: row.lastOrder,
      location: row.location,
      channel: row.channel,
      channelLabel: ch.label,
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
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
    );
  }
  if (query.segment) list = list.filter((r) => r.segment === query.segment);
  if (query.location) list = list.filter((r) => r.location === query.location);
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.channel) list = list.filter((r) => r.channel === query.channel);
  return list;
}

function getCustomerReports(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = 5824;
  const skip = (page - 1) * limit;
  const customers = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      totalCustomers: 5824,
      totalCustomersDelta: 12.7,
      totalCustomersHint: "vs last month",
      newCustomers: 842,
      newCustomersDelta: 15.3,
      newCustomersHint: "vs last month",
      activeCustomers: 3960,
      activeCustomersDelta: 11.8,
      activeCustomersHint: "vs last month",
      repeatCustomers: 2736,
      repeatCustomersDelta: 13.6,
      repeatCustomersHint: "vs last month",
      inactiveCustomers: 428,
      inactiveCustomersDelta: -4.1,
      inactiveCustomersHint: "vs last month",
      avgSpend: 6845,
      avgSpendDelta: 10.2,
      avgSpendHint: "vs last month",
    },
    customers,
    growth: {
      labels: ["01 May", "07 May", "14 May", "21 May", "27 May"],
      total: [5200, 5380, 5520, 5680, 5824],
      newCustomers: [120, 180, 210, 250, 842],
      active: [3400, 3550, 3700, 3850, 3960],
    },
    segmentDonut: [
      { key: "regular", name: "Regular", value: 3011, color: "#6c5dd3", pct: 51.7 },
      { key: "premium", name: "Premium", value: 1281, color: "#16a34a", pct: 22.0 },
      { key: "vip", name: "VIP", value: 844, color: "#eab308", pct: 14.5 },
      { key: "new", name: "New", value: 688, color: "#38bdf8", pct: 11.8 },
    ],
    locations: [
      { key: "nairobi", name: "Nairobi", value: 2854, pct: 49.0 },
      { key: "mombasa", name: "Mombasa", value: 786, pct: 13.5 },
      { key: "kisumu", name: "Kisumu", value: 542, pct: 9.3 },
      { key: "nakuru", name: "Nakuru", value: 478, pct: 8.2 },
      { key: "eldoret", name: "Eldoret", value: 402, pct: 6.9 },
    ],
    summary: [
      { key: "total", label: "Total Customers", value: 5824, kind: "number" },
      { key: "new", label: "New Customers", value: 842, kind: "number" },
      { key: "repeat", label: "Repeat Customers", value: 2736, kind: "number" },
      { key: "active", label: "Active Customers", value: 3960, kind: "number" },
      { key: "inactive", label: "Inactive Customers", value: 428, kind: "number" },
      { key: "churn", label: "Churn Rate", value: 2.8, kind: "pct" },
      { key: "lifespan", label: "Avg. Customer Lifespan", value: 6.4, kind: "months" },
    ],
    insights: [
      { key: "i1", icon: "trend", text: "New customers increased by 15.3%." },
      { key: "i2", icon: "users", text: "Repeat customers contribute 58.7% of total revenue." },
      { key: "i3", icon: "pin", text: "Nairobi has the highest number of customers (49.0%)." },
      { key: "i4", icon: "coin", text: "Average customer spend is KES 6,845." },
      { key: "i5", icon: "trend", text: "Churn rate decreased by 0.6% compared to last month.", tone: "down" },
    ],
    filters: {
      segments: SEGMENTS.map((s) => ({ value: s.key, label: s.label })),
      locations: LOCATIONS,
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      channels: CHANNELS.map((c) => ({ value: c.key, label: c.label })),
    },
  };
}

module.exports = { getCustomerReports };
