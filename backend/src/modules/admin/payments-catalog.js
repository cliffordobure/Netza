const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const STATUSES = [
  { key: "success", label: "Success", color: "#16a34a" },
  { key: "pending", label: "Pending", color: "#ea580c" },
  { key: "refunded", label: "Refunded", color: "#2563eb" },
  { key: "failed", label: "Failed", color: "#dc2626" },
];

const METHODS = [
  { key: "mpesa", label: "M-PESA", color: "#0d9488" },
  { key: "card", label: "Card", color: "#7c3aed" },
  { key: "cash", label: "Cash", color: "#ca8a04" },
  { key: "bank", label: "Bank Transfer", color: "#2563eb" },
];

const CHANNELS = [
  { key: "mobile", label: "Mobile" },
  { key: "web", label: "Web" },
  { key: "pos", label: "POS" },
];

const CUSTOMERS = [
  { name: "Mercy Wanjiku", phone: "+254 712 345 678" },
  { name: "James Mwangi", phone: "+254 722 111 222" },
  { name: "Anne Mutua", phone: "+254 733 444 555" },
  { name: "Peter Otieno", phone: "+254 701 222 333" },
  { name: "Grace Njeri", phone: "+254 710 555 666" },
  { name: "Brian Kamau", phone: "+254 720 888 999" },
  { name: "Faith Achieng", phone: "+254 715 123 456" },
  { name: "Daniel Kiptoo", phone: "+254 725 987 654" },
  { name: "Lucy Wambui", phone: "+254 735 456 789" },
  { name: "Samuel Ochieng", phone: "+254 745 321 098" },
];

const SEED = [
  { status: "success", method: "mpesa", channel: "mobile", amount: 8450, date: "27 May 2026", time: "11:45 AM" },
  { status: "pending", method: "card", channel: "web", amount: 12600, date: "27 May 2026", time: "11:20 AM" },
  { status: "success", method: "mpesa", channel: "mobile", amount: 3200, date: "27 May 2026", time: "10:55 AM" },
  { status: "refunded", method: "mpesa", channel: "web", amount: 5600, date: "27 May 2026", time: "10:12 AM" },
  { status: "failed", method: "card", channel: "web", amount: 9800, date: "27 May 2026", time: "09:40 AM" },
  { status: "success", method: "cash", channel: "pos", amount: 4500, date: "26 May 2026", time: "04:18 PM" },
  { status: "success", method: "mpesa", channel: "mobile", amount: 15750, date: "26 May 2026", time: "02:05 PM" },
  { status: "pending", method: "bank", channel: "web", amount: 22000, date: "26 May 2026", time: "11:30 AM" },
  { status: "success", method: "card", channel: "web", amount: 6750, date: "26 May 2026", time: "09:15 AM" },
  { status: "success", method: "mpesa", channel: "mobile", amount: 2100, date: "25 May 2026", time: "06:42 PM" },
];

function buildRows() {
  return SEED.map((row, i) => {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const st = STATUSES.find((s) => s.key === row.status);
    const method = METHODS.find((m) => m.key === row.method);
    const channel = CHANNELS.find((c) => c.key === row.channel);
    const n = i + 1;
    return {
      id: `pay${n}`,
      n,
      paymentId: `PAY-2026-${String(1256 - i).padStart(5, "0")}`,
      orderId: `ORD-2026-${String(8840 - i).padStart(6, "0")}`,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAvatar: avatar(customer.name, i + 520),
      amount: row.amount,
      method: row.method,
      methodLabel: method.label,
      channel: row.channel,
      channelLabel: channel.label,
      status: row.status,
      statusLabel: st.label,
      date: row.date,
      time: row.time,
      reference: `REF${900000 + i}`,
    };
  });
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.paymentId.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.method) list = list.filter((r) => r.method === query.method);
  if (query.channel) list = list.filter((r) => r.channel === query.channel);
  return list;
}

function getPaymentsCatalog(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = 1256;
  const skip = (page - 1) * limit;
  const payments = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      total: 1245600,
      totalDelta: 14.7,
      totalHint: "vs last month",
      successful: 1164250,
      successfulDelta: 15.3,
      successfulHint: "vs last month",
      pending: 62300,
      pendingDelta: 8.6,
      pendingHint: "vs last month",
      refunds: 19850,
      refundsDelta: 6.2,
      refundsHint: "vs last month",
      failed: 7200,
      failedDelta: -3.4,
      failedHint: "vs last month",
      avgValue: 6563,
      avgDelta: 12.1,
      avgHint: "vs last month",
    },
    payments,
    statusDonut: [
      { key: "success", name: "Successful", value: 1164250, color: "#16a34a", pct: 93.5 },
      { key: "pending", name: "Pending", value: 62300, color: "#ea580c", pct: 5.0 },
      { key: "refunded", name: "Refunded", value: 19850, color: "#2563eb", pct: 1.6 },
      { key: "failed", name: "Failed", value: 7200, color: "#dc2626", pct: 0.6 },
    ],
    methods: [
      { key: "mpesa", name: "M-PESA", pct: 67.7, color: "#0d9488" },
      { key: "card", name: "Card", pct: 25.1, color: "#7c3aed" },
      { key: "cash", name: "Cash", pct: 5.8, color: "#ca8a04" },
      { key: "bank", name: "Bank Transfer", pct: 1.4, color: "#2563eb" },
    ],
    activities: [
      { id: "a1", tone: "success", text: "Payment received from Mercy Wanjiku", amount: 8450, when: "11:45 AM" },
      { id: "a2", tone: "pending", text: "Card payment pending for James Mwangi", amount: 12600, when: "11:20 AM" },
      { id: "a3", tone: "refund", text: "Refund issued to Anne Mutua", amount: 5600, when: "10:12 AM" },
      { id: "a4", tone: "failed", text: "Card payment failed for Peter Otieno", amount: 9800, when: "09:40 AM" },
      { id: "a5", tone: "success", text: "Cash payment recorded at POS", amount: 4500, when: "Yesterday" },
    ],
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      methods: METHODS.map((m) => ({ value: m.key, label: m.label })),
      channels: CHANNELS.map((c) => ({ value: c.key, label: c.label })),
    },
    footerMessage: "Tip: Reconcile pending and failed payments daily to keep settlement reports accurate.",
  };
}

module.exports = { getPaymentsCatalog };
