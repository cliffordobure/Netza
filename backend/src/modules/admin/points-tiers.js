const TIERS = [
  {
    id: "platinum",
    name: "Platinum",
    subtitle: "Highest tier",
    badge: "crown",
    badgeColor: "plat",
    pointsRange: "50,000+ pts",
    benefits: ["20% Discount", "Free Delivery", "Priority Support", "Exclusive Offers"],
    members: 1,
    pct: 33.3,
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
    members: 1,
    pct: 33.3,
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
    members: 1,
    pct: 33.4,
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
    members: 0,
    pct: 0,
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
    members: 0,
    pct: 0,
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
    { key: "platinum", name: "Platinum", value: 1, color: "#6d28d9", pct: 33.3 },
    { key: "gold", name: "Gold", value: 1, color: "#f59e0b", pct: 33.3 },
    { key: "silver", name: "Silver", value: 1, color: "#94a3b8", pct: 33.4 },
    { key: "bronze", name: "Bronze", value: 0, color: "#b45309", pct: 0 },
    { key: "new", name: "New Member", value: 0, color: "#14b8a6", pct: 0 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      totalTiers: 5,
      totalTiersHint: "Active tiers",
      totalMembers: 3,
      totalMembersHint: "Across all tiers",
      platinumMembers: 1,
      platinumHint: "33% of total",
      upgrades: 1,
      upgradesDelta: 0,
      downgrades: 0,
      downgradesDelta: 0,
      benefitsRedeemed: 3,
      benefitsDelta: 0,
    },
    tiers,
    tierDonut,
    progression: [
      { label: "Upgraded to Platinum", value: 1, tone: "plat" },
      { label: "Upgraded to Gold", value: 1, tone: "gold" },
      { label: "Upgraded to Silver", value: 1, tone: "silver" },
      { label: "Upgraded to Bronze", value: 0, tone: "bronze" },
      { label: "New Members Joined", value: 0, tone: "new" },
    ],
    insights: {
      upgradedThisMonth: 1,
      upgradedDelta: 0,
      avgTimeToGold: "2.4 months",
      avgPointsToNext: 500,
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
