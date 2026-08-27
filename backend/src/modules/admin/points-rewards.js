const CATEGORIES = ["Discount", "Delivery", "Merchandise", "Service", "Other"];
const TYPES = ["Voucher", "Benefit", "Physical"];
const TIERS = ["All Tiers", "Gold & Above", "Platinum", "Silver & Above"];
const STATUSES = ["active", "upcoming", "inactive"];

const REWARD_SEED = [
  { name: "KSh 500 Discount Voucher", category: "Discount", pointsCost: 5000, rewardType: "Voucher", availableFor: "All Tiers", limit: "1 per member", redeemed: 2450, status: "active", statusLabel: "Active", icon: "tag", color: "green" },
  { name: "Free Delivery Pass", category: "Delivery", pointsCost: 1500, rewardType: "Benefit", availableFor: "All Tiers", limit: "2 per month", redeemed: 1890, status: "active", statusLabel: "Active", icon: "truck", color: "blue" },
  { name: "NETZA Branded Cap", category: "Merchandise", pointsCost: 3500, rewardType: "Physical", availableFor: "Gold & Above", limit: "1 per member", redeemed: 642, status: "active", statusLabel: "Active", icon: "bag", color: "purple" },
  { name: "Priority Support Access", category: "Service", pointsCost: 8000, rewardType: "Benefit", availableFor: "Platinum", limit: "Unlimited", redeemed: 318, status: "active", statusLabel: "Active", icon: "shield", color: "pink" },
  { name: "KSh 1,000 Discount Voucher", category: "Discount", pointsCost: 9000, rewardType: "Voucher", availableFor: "Gold & Above", limit: "1 per month", redeemed: 1120, status: "active", statusLabel: "Active", icon: "tag", color: "green" },
  { name: "Flash Drop Early Access", category: "Other", pointsCost: 2500, rewardType: "Benefit", availableFor: "All Tiers", limit: "1 per drop", redeemed: 980, status: "upcoming", statusLabel: "Upcoming", icon: "bolt", color: "orange" },
  { name: "NETZA Tote Bag", category: "Merchandise", pointsCost: 4200, rewardType: "Physical", availableFor: "Silver & Above", limit: "1 per member", redeemed: 410, status: "active", statusLabel: "Active", icon: "bag", color: "purple" },
  { name: "Extended Warranty (30 days)", category: "Service", pointsCost: 6000, rewardType: "Benefit", availableFor: "Gold & Above", limit: "1 per order", redeemed: 275, status: "inactive", statusLabel: "Inactive", icon: "shield", color: "pink" },
  { name: "KSh 250 Discount Voucher", category: "Discount", pointsCost: 2500, rewardType: "Voucher", availableFor: "All Tiers", limit: "3 per month", redeemed: 3210, status: "active", statusLabel: "Active", icon: "tag", color: "green" },
  { name: "Same-Day Delivery Credit", category: "Delivery", pointsCost: 2800, rewardType: "Benefit", availableFor: "Platinum", limit: "1 per week", redeemed: 540, status: "upcoming", statusLabel: "Upcoming", icon: "truck", color: "blue" },
];

function buildRows() {
  return REWARD_SEED.map((row, i) => ({
    id: `rwd${i + 1}`,
    n: i + 1,
    ...row,
  }));
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.rewardType.toLowerCase().includes(q) ||
        String(r.pointsCost).includes(q)
    );
  }
  if (query.category) list = list.filter((r) => r.category === query.category);
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.tier) list = list.filter((r) => r.availableFor === query.tier);
  if (query.type) list = list.filter((r) => r.rewardType === query.type);

  const sort = query.sort || "newest";
  if (sort === "oldest") list = [...list].reverse();
  else if (sort === "cost-asc") list = [...list].sort((a, b) => a.pointsCost - b.pointsCost);
  else if (sort === "cost-desc") list = [...list].sort((a, b) => b.pointsCost - a.pointsCost);
  else if (sort === "redeemed") list = [...list].sort((a, b) => b.redeemed - a.redeemed);

  return list;
}

function getPointsRewards(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const useDemoTotal = !query.q && !query.category && !query.status && !query.tier && !query.type;
  const total = useDemoTotal ? 48 : filtered.length;
  const skip = (page - 1) * limit;
  const rewards =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const categoryDonut = [
    { key: "discount", name: "Discount", value: 18, color: "#22c55e", pct: 37.5 },
    { key: "merchandise", name: "Merchandise", value: 12, color: "#8b5cf6", pct: 25.0 },
    { key: "delivery", name: "Delivery", value: 6, color: "#3b82f6", pct: 12.5 },
    { key: "service", name: "Service", value: 6, color: "#ec4899", pct: 12.5 },
    { key: "other", name: "Other Benefits", value: 6, color: "#f59e0b", pct: 12.5 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      totalRewards: 48,
      totalHint: "Active rewards",
      active: 36,
      activeHint: "75% of total",
      upcoming: 6,
      upcomingHint: "Scheduled",
      inactive: 6,
      inactiveHint: "Not visible",
      totalRedeemed: 12845,
      redeemedHint: "This month",
      pointsSpent: 8654230,
      spentHint: "This month",
    },
    rewards,
    categoryDonut,
    topRedeemed: [
      { name: "KSh 500 Discount Voucher", redeemed: 2450, icon: "tag", color: "green" },
      { name: "Free Delivery Pass", redeemed: 1890, icon: "truck", color: "blue" },
      { name: "KSh 1,000 Discount Voucher", redeemed: 1120, icon: "tag", color: "green" },
      { name: "Flash Drop Early Access", redeemed: 980, icon: "bolt", color: "orange" },
      { name: "NETZA Branded Cap", redeemed: 642, icon: "bag", color: "purple" },
    ],
    statusBreakdown: [
      { key: "active", name: "Active Rewards", value: 36, pct: 75, color: "#22c55e" },
      { key: "upcoming", name: "Upcoming Rewards", value: 6, pct: 12.5, color: "#3b82f6" },
      { key: "inactive", name: "Inactive Rewards", value: 6, pct: 12.5, color: "#94a3b8" },
    ],
    filters: {
      categories: CATEGORIES,
      types: TYPES,
      tiers: TIERS,
      statuses: STATUSES,
    },
    footerMessage:
      "Reward Tip: Create attractive and valuable rewards to keep members engaged and encourage more purchases.",
  };
}

module.exports = { getPointsRewards };
