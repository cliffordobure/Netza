const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const TIERS = ["Platinum", "Gold", "Silver", "Bronze", "New"];

const MEMBERS = [
  { id: "m1", memId: "MEM-0001245", name: "Mercy Wanjiku", avatar: avatar("Mercy Wanjiku", 1), tier: "Platinum" },
  { id: "m2", memId: "MEM-0001243", name: "Faith Achieng", avatar: avatar("Faith Achieng", 2), tier: "Gold" },
  { id: "m3", memId: "MEM-0001247", name: "Peter Otieno", avatar: avatar("Peter Otieno", 3), tier: "Silver" },
];

const ACTIVITY_SEED = [
  { activity: "earned", activityLabel: "Earned", description: "Order Completed", detail: "ORD-2026-012845", points: 450, balance: 2840, status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "10:15 AM" },
  { activity: "redeemed", activityLabel: "Redeemed", description: "KES 200 Voucher", detail: "Reward claim", points: -200, balance: 1640, status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "09:42 AM" },
  { activity: "earned", activityLabel: "Earned", description: "Product Review", detail: "SKU-CAM-4421", points: 50, balance: 1890, status: "completed", statusLabel: "Completed", date: "26 May 2026", time: "04:20 PM" },
];

function buildRows() {
  return ACTIVITY_SEED.map((row, i) => {
    const m = MEMBERS[i % MEMBERS.length];
    return {
      id: `act${i + 1}`,
      n: i + 1,
      memberId: m.id,
      memberName: m.name,
      memberMemId: m.memId,
      memberAvatar: m.avatar,
      tier: m.tier,
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
        r.memberName.toLowerCase().includes(q) ||
        r.memberMemId.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.detail || "").toLowerCase().includes(q)
    );
  }
  if (query.activity) list = list.filter((r) => r.activity === query.activity);
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.tier) list = list.filter((r) => r.tier === query.tier);
  return list;
}

function getPointsOverview(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const activities = filtered.slice(skip, skip + limit);

  const tierCounts = {
    Platinum: 1,
    Gold: 1,
    Silver: 1,
    Bronze: 0,
    New: 0,
  };
  const tierTotal = Object.values(tierCounts).reduce((s, n) => s + n, 0);
  const tierDonut = [
    { key: "platinum", name: "Platinum", value: tierCounts.Platinum, color: "#4f46e5", pct: 33.3 },
    { key: "gold", name: "Gold", value: tierCounts.Gold, color: "#f59e0b", pct: 33.3 },
    { key: "silver", name: "Silver", value: tierCounts.Silver, color: "#94a3b8", pct: 33.4 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      issued: 500,
      issuedDelta: 0,
      redeemed: 200,
      redeemedDelta: 0,
      activeMembers: 3,
      activeMembersDelta: 0,
      rewardsClaimed: 3,
      rewardsClaimedDelta: 0,
      expiringSoon: 95,
      expiringSoonDelta: 0,
      liabilityKes: 300,
      liabilityDelta: 0,
    },
    activities,
    members: MEMBERS.map((m, i) => ({
      ...m,
      points: [2450, 1890, 2210][i] || 500,
    })),
    tierDonut,
    tierTotal,
    topMembers: [
      { name: "Mercy Wanjiku", points: 2450, tier: "Platinum", avatar: avatar("Mercy Wanjiku", 31) },
      { name: "Peter Otieno", points: 2210, tier: "Silver", avatar: avatar("Peter Otieno", 34) },
      { name: "Faith Achieng", points: 1890, tier: "Gold", avatar: avatar("Faith Achieng", 32) },
    ],
    expiring: [
      { memberName: "Samuel Mutua", points: 270, expiresOn: "12 Jun 2026" },
      { memberName: "Grace Akinyi", points: 180, expiresOn: "15 Jun 2026" },
      { memberName: "Brian Ochieng", points: 95, expiresOn: "18 Jun 2026" },
    ],
    filters: {
      tiers: TIERS,
      statuses: ["completed", "pending", "expired"],
      activities: [
        { value: "earned", label: "Earned" },
        { value: "redeemed", label: "Redeemed" },
      ],
    },
    footerMessage:
      "Reward loyal customers and increase engagement. Points are automatically awarded based on configured rules.",
  };
}

module.exports = { getPointsOverview };
