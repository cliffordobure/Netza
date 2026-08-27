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
  { memId: "MEM-0001248", name: "Peter Otieno" },
  { memId: "MEM-0001249", name: "James Mwangi" },
  { memId: "MEM-0001250", name: "Grace Akinyi" },
  { memId: "MEM-0001251", name: "Faith Achieng" },
  { memId: "MEM-0001252", name: "Samuel Mutua" },
  { memId: "MEM-0001253", name: "Brian Ochieng" },
  { memId: "MEM-0001254", name: "Linda Chebet" },
];

const TX_SEED = [
  { type: "earned", typeLabel: "Earned", description: "Order Completed", detail: "ORD-2026-012845", points: 450, balance: 2450, source: "Order", status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "10:15 AM" },
  { type: "redeemed", typeLabel: "Redeemed", description: "KES 200 Voucher", detail: "RWD-88421", points: -200, balance: 2250, source: "Reward", status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "09:42 AM" },
  { type: "earned", typeLabel: "Earned", description: "Product Review", detail: "SKU-CAM-4421", points: 50, balance: 1890, source: "Review", status: "completed", statusLabel: "Completed", date: "26 May 2026", time: "04:20 PM" },
  { type: "adjusted", typeLabel: "Adjusted", description: "Promo Correction", detail: "ADJ-1022", points: -100, balance: 2210, source: "Admin", status: "completed", statusLabel: "Completed", date: "26 May 2026", time: "02:05 PM" },
  { type: "earned", typeLabel: "Earned", description: "Referral Bonus", detail: "REF-Faith", points: 200, balance: 3120, source: "Referral", status: "completed", statusLabel: "Completed", date: "25 May 2026", time: "06:33 PM" },
  { type: "expired", typeLabel: "Expired", description: "Points Expiry", detail: "EXP-2026-05", points: -85, balance: 1555, source: "System", status: "completed", statusLabel: "Completed", date: "25 May 2026", time: "11:18 AM" },
  { type: "redeemed", typeLabel: "Redeemed", description: "Free Delivery", detail: "RWD-88390", points: -300, balance: 1640, source: "Reward", status: "completed", statusLabel: "Completed", date: "24 May 2026", time: "03:55 PM" },
  { type: "earned", typeLabel: "Earned", description: "Flash Drop Purchase", detail: "ORD-2026-012840", points: 120, balance: 1980, source: "Order", status: "completed", statusLabel: "Completed", date: "24 May 2026", time: "10:12 AM" },
  { type: "adjusted", typeLabel: "Adjusted", description: "Goodwill Credit", detail: "ADJ-1018", points: 150, balance: 870, source: "Admin", status: "completed", statusLabel: "Completed", date: "23 May 2026", time: "08:05 AM" },
  { type: "earned", typeLabel: "Earned", description: "Daily Login Streak", detail: "ACT-DAY7", points: 25, balance: 640, source: "Activity", status: "completed", statusLabel: "Completed", date: "22 May 2026", time: "01:40 PM" },
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
  const useDemoTotal = !query.q && !query.type && !query.status && !query.source && !query.member;
  const total = useDemoTotal ? 32856 : filtered.length;
  const skip = (page - 1) * limit;
  const transactions =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const summaryParts = [
    { key: "earned", name: "Earned", value: 2845600, color: "#22c55e", pct: 50.2 },
    { key: "redeemed", name: "Redeemed", value: 1256780, color: "#ef4444", pct: 22.2 },
    { key: "adjusted", name: "Adjusted", value: 125430, color: "#f59e0b", pct: 2.2 },
    { key: "expired", name: "Expired", value: 98765, color: "#ec4899", pct: 1.7 },
    { key: "transferIn", name: "Transfer In", value: 842100, color: "#6366f1", pct: 14.9 },
    { key: "transferOut", name: "Transfer Out", value: 498200, color: "#94a3b8", pct: 8.8 },
  ];

  const bySource = [
    { key: "orders", name: "Orders", value: 14820, pct: 100 },
    { key: "rewards", name: "Rewards", value: 9240, pct: 62 },
    { key: "activities", name: "Activities", value: 6120, pct: 41 },
    { key: "referrals", name: "Referrals", value: 3840, pct: 26 },
    { key: "admin", name: "Admin Adjustments", value: 1836, pct: 12 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      earned: 2845600,
      earnedDelta: 24.3,
      redeemed: 1256780,
      redeemedDelta: 19.6,
      adjusted: 125430,
      adjustedDelta: -8.7,
      expired: 98765,
      expiredDelta: 6.2,
      balance: 713500,
      balanceDelta: 11.3,
    },
    transactions,
    members: MEMBERS,
    summaryDonut: summaryParts,
    summaryCenterLabel: "2.85M",
    bySource,
    recentAdjustments: [
      { reason: "Promo Correction", date: "26 May 2026", time: "02:05 PM", points: -100, admin: "Francis Admin" },
      { reason: "Goodwill Credit", date: "23 May 2026", time: "08:05 AM", points: 150, admin: "Francis Admin" },
      { reason: "Duplicate Order Fix", date: "20 May 2026", time: "11:22 AM", points: -75, admin: "Support Desk" },
      { reason: "VIP Bonus", date: "18 May 2026", time: "04:40 PM", points: 500, admin: "Francis Admin" },
      { reason: "Fraud Reversal", date: "15 May 2026", time: "09:10 AM", points: -320, admin: "Risk Team" },
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
