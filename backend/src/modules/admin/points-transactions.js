const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const TYPES = [
  { value: "earned", label: "Earned" },
  { value: "redeemed", label: "Redeemed" },
  { value: "adjusted", label: "Adjusted" },
  { value: "expired", label: "Expired" },
];

const SOURCES = ["Order", "Review", "Reward", "Activity", "Referral", "Admin", "System"];
const STATUSES = ["completed", "pending", "failed"];

const MEMBERS = [
  { memId: "MEM-0001245", name: "Mercy Wanjiku" },
  { memId: "MEM-0001246", name: "David Kipchoge" },
  { memId: "MEM-0001247", name: "Anne Mutua" },
];

const TX_SEED = [
  { type: "earned", typeLabel: "Earned", description: "Order Completed", detail: "ORD-2026-012845", points: 450, balance: 2450, source: "Order", status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "10:15 AM" },
  { type: "redeemed", typeLabel: "Redeemed", description: "KES 200 Voucher", detail: "RWD-88421", points: -200, balance: 2250, source: "Reward", status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "09:42 AM" },
  { type: "earned", typeLabel: "Earned", description: "Product Review", detail: "SKU-CAM-4421", points: 50, balance: 1890, source: "Review", status: "completed", statusLabel: "Completed", date: "26 May 2026", time: "04:20 PM" },
];

function buildRows() {
  return TX_SEED.map((row, i) => {
    const m = MEMBERS[i % MEMBERS.length];
    return {
      id: `trx${i + 1}`,
      n: i + 1,
      trxId: `TRX-PTS-${String(2456 + i).padStart(7, "0")}`,
      memberName: m.name,
      memberMemId: m.memId,
      memberAvatar: avatar(m.name, i + 70),
      ...row,
    };
  });
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.trxId.toLowerCase().includes(q) ||
        r.memberName.toLowerCase().includes(q) ||
        r.memberMemId.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.detail || "").toLowerCase().includes(q)
    );
  }
  if (query.type) list = list.filter((r) => r.type === query.type);
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.source) list = list.filter((r) => r.source === query.source);
  if (query.member) {
    const m = String(query.member).toLowerCase();
    list = list.filter(
      (r) => r.memberName.toLowerCase().includes(m) || r.memberMemId.toLowerCase().includes(m)
    );
  }
  return list;
}

function getPointsTransactions(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const transactions = filtered.slice(skip, skip + limit);

  const summaryParts = [
    { key: "earned", name: "Earned", value: 500, color: "#22c55e", pct: 71.4 },
    { key: "redeemed", name: "Redeemed", value: 200, color: "#ef4444", pct: 28.6 },
  ];

  const bySource = [
    { key: "orders", name: "Orders", value: 1, pct: 100 },
    { key: "rewards", name: "Rewards", value: 1, pct: 100 },
    { key: "reviews", name: "Reviews", value: 1, pct: 100 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      earned: 500,
      earnedDelta: 0,
      redeemed: 200,
      redeemedDelta: 0,
      adjusted: 0,
      adjustedDelta: 0,
      expired: 0,
      expiredDelta: 0,
      balance: 300,
      balanceDelta: 0,
    },
    transactions,
    members: MEMBERS,
    summaryDonut: summaryParts,
    summaryCenterLabel: "500",
    bySource,
    recentAdjustments: [
      { reason: "Promo Correction", date: "26 May 2026", time: "02:05 PM", points: -100, admin: "Francis Admin" },
      { reason: "Goodwill Credit", date: "23 May 2026", time: "08:05 AM", points: 150, admin: "Francis Admin" },
      { reason: "Duplicate Order Fix", date: "20 May 2026", time: "11:22 AM", points: -75, admin: "Support Desk" },
    ],
    filters: {
      types: TYPES,
      sources: SOURCES,
      statuses: STATUSES,
      members: MEMBERS.map((m) => ({ value: m.memId, label: m.name })),
    },
    footerMessage:
      "Points are awarded based on completed activities. Expired points are removed automatically as per the configured expiry policy.",
  };
}

module.exports = { getPointsTransactions };
