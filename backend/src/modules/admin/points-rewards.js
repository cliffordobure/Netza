const CATEGORIES = ["Discount", "Delivery", "Merchandise", "Service", "Other"];
const TYPES = ["Voucher", "Benefit", "Physical"];
const TIERS = ["All Tiers", "Gold & Above", "Platinum", "Silver & Above"];
const STATUSES = ["active", "upcoming", "inactive"];

const REWARD_SEED = [
  { name: "KSh 500 Discount Voucher", category: "Discount", pointsCost: 5000, rewardType: "Voucher", availableFor: "All Tiers", limit: "1 per member", redeemed: 2, status: "active", statusLabel: "Active", icon: "tag", color: "green" },
  { name: "Free Delivery Pass", category: "Delivery", pointsCost: 1500, rewardType: "Benefit", availableFor: "All Tiers", limit: "2 per month", redeemed: 1, status: "active", statusLabel: "Active", icon: "truck", color: "blue" },
  { name: "NETZA Branded Cap", category: "Merchandise", pointsCost: 3500, rewardType: "Physical", availableFor: "Gold & Above", limit: "1 per member", redeemed: 1, status: "upcoming", statusLabel: "Upcoming", icon: "bag", color: "purple" },
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
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const rewards = filtered.slice(skip, skip + limit);

  const categoryDonut = [
    { key: "discount", name: "Discount", value: 1, color: "#22c55e", pct: 33.3 },
    { key: "merchandise", name: "Merchandise", value: 1, color: "#8b5cf6", pct: 33.3 },
    { key: "delivery", name: "Delivery", value: 1, color: "#3b82f6", pct: 33.4 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      totalRewards: 3,
      totalHint: "Active rewards",
      active: 2,
      activeHint: "67% of total",
      upcoming: 1,
      upcomingHint: "Scheduled",
      inactive: 0,
      inactiveHint: "Not visible",
      totalRedeemed: 4,
      redeemedHint: "This month",
      pointsSpent: 15000,
      spentHint: "This month",
    },
    rewards,
    categoryDonut,
    topRedeemed: [
      { name: "KSh 500 Discount Voucher", redeemed: 2, icon: "tag", color: "green" },
      { name: "Free Delivery Pass", redeemed: 1, icon: "truck", color: "blue" },
      { name: "NETZA Branded Cap", redeemed: 1, icon: "bag", color: "purple" },
    ],
    statusBreakdown: [
      { key: "active", name: "Active Rewards", value: 2, pct: 66.7, color: "#22c55e" },
      { key: "upcoming", name: "Upcoming Rewards", value: 1, pct: 33.3, color: "#3b82f6" },
      { key: "inactive", name: "Inactive Rewards", value: 0, pct: 0, color: "#94a3b8" },
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
