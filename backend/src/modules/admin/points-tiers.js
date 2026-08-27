const TIERS = [
  {
    id: "platinum",
    name: "Platinum",
    subtitle: "Highest tier",
    badge: "crown",
    badgeColor: "plat",
    pointsRange: "50,000+ pts",
    benefits: ["20% Discount", "Free Delivery", "Priority Support", "Exclusive Offers"],
    members: 1256,
    pct: 6.9,
    status: "active",
    statusLabel: "Active",
    memberType: "premium",
  },
  {
    id: "gold",
    name: "Gold",
    subtitle: "High tier",
    badge: "crown",
    badgeColor: "gold",
    pointsRange: "20,000 – 49,999 pts",
    benefits: ["15% Discount", "Free Delivery", "Early Access", "Birthday Bonus"],
    members: 3245,
    pct: 17.8,
    status: "active",
    statusLabel: "Active",
    memberType: "premium",
  },
  {
    id: "silver",
    name: "Silver",
    subtitle: "Mid tier",
    badge: "crown",
    badgeColor: "silver",
    pointsRange: "7,000 – 19,999 pts",
    benefits: ["10% Discount", "Free Delivery (Over KSh 3,000)", "Special Promotions"],
    members: 6789,
    pct: 37.1,
    status: "active",
    statusLabel: "Active",
    memberType: "standard",
  },
  {
    id: "bronze",
    name: "Bronze",
    subtitle: "Entry tier",
    badge: "crown",
    badgeColor: "bronze",
    pointsRange: "1,000 – 6,999 pts",
    benefits: ["5% Discount", "Points Multiplier (1.1x)", "Newsletter Access"],
    members: 5432,
    pct: 29.7,
    status: "active",
    statusLabel: "Active",
    memberType: "standard",
  },
  {
    id: "new",
    name: "New Member",
    subtitle: "Starter tier",
    badge: "users",
    badgeColor: "new",
    pointsRange: "0 – 999 pts",
    benefits: ["Welcome Bonus (100 pts)", "Basic Support", "Standard Promotions"],
    members: 1534,
    pct: 8.5,
    status: "active",
    statusLabel: "Active",
    memberType: "starter",
  },
];

function filterTiers(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.pointsRange.toLowerCase().includes(q) ||
        r.benefits.some((b) => b.toLowerCase().includes(q))
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.memberType) list = list.filter((r) => r.memberType === query.memberType);
  return list;
}

function getPointsTiers(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = TIERS.map((t, i) => ({ ...t, n: i + 1 }));
  const filtered = filterTiers(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const tiers = filtered.slice(skip, skip + limit);

  const tierDonut = [
    { key: "platinum", name: "Platinum", value: 1256, color: "#6d28d9", pct: 6.9 },
    { key: "gold", name: "Gold", value: 3245, color: "#f59e0b", pct: 17.8 },
    { key: "silver", name: "Silver", value: 6789, color: "#94a3b8", pct: 37.1 },
    { key: "bronze", name: "Bronze", value: 5432, color: "#b45309", pct: 29.7 },
    { key: "new", name: "New Member", value: 1534, color: "#14b8a6", pct: 8.5 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      totalTiers: 5,
      totalTiersHint: "Active tiers",
      totalMembers: 18256,
      totalMembersHint: "Across all tiers",
      platinumMembers: 1256,
      platinumHint: "6.9% of total",
      upgrades: 642,
      upgradesDelta: 18.7,
      downgrades: 128,
      downgradesDelta: -6.2,
      benefitsRedeemed: 4256,
      benefitsDelta: 12.4,
    },
    tiers,
    tierDonut,
    progression: [
      { label: "Upgraded to Platinum", value: 96, tone: "plat" },
      { label: "Upgraded to Gold", value: 218, tone: "gold" },
      { label: "Upgraded to Silver", value: 328, tone: "silver" },
      { label: "Upgraded to Bronze", value: 346, tone: "bronze" },
      { label: "New Members Joined", value: 1534, tone: "new" },
    ],
    insights: {
      upgradedThisMonth: 642,
      upgradedDelta: 18.7,
      avgTimeToGold: "2.4 months",
      avgPointsToNext: 12850,
    },
    filters: {
      statuses: ["active", "inactive"],
      memberTypes: [
        { value: "premium", label: "Premium" },
        { value: "standard", label: "Standard" },
        { value: "starter", label: "Starter" },
      ],
    },
    footerTitle: "About Loyalty Tiers",
    footerMessage:
      "Members automatically move up tiers when they reach the required points. Benefits are applied instantly upon tier upgrade.",
  };
}

module.exports = { getPointsTiers };
