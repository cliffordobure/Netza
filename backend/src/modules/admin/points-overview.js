const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const TIERS = ["Platinum", "Gold", "Silver", "Bronze", "New"];

const MEMBERS = [
  { id: "m1", memId: "MEM-0001245", name: "Mercy Wanjiku", avatar: avatar("Mercy Wanjiku", 1), tier: "Platinum" },
  { id: "m2", memId: "MEM-0001243", name: "Faith Achieng", avatar: avatar("Faith Achieng", 2), tier: "Gold" },
  { id: "m3", memId: "MEM-0001247", name: "Peter Otieno", avatar: avatar("Peter Otieno", 3), tier: "Gold" },
  { id: "m4", memId: "MEM-0001248", name: "Grace Akinyi", avatar: avatar("Grace Akinyi", 4), tier: "Silver" },
  { id: "m5", memId: "MEM-0001249", name: "David Kipchoge", avatar: avatar("David Kipchoge", 5), tier: "Platinum" },
  { id: "m6", memId: "MEM-0001250", name: "James Mwangi", avatar: avatar("James Mwangi", 6), tier: "Silver" },
  { id: "m7", memId: "MEM-0001251", name: "Samuel Mutua", avatar: avatar("Samuel Mutua", 7), tier: "Bronze" },
  { id: "m8", memId: "MEM-0001252", name: "Anne Mutua", avatar: avatar("Anne Mutua", 8), tier: "Gold" },
  { id: "m9", memId: "MEM-0001253", name: "Brian Ochieng", avatar: avatar("Brian Ochieng", 9), tier: "New" },
  { id: "m10", memId: "MEM-0001254", name: "Linda Chebet", avatar: avatar("Linda Chebet", 10), tier: "Bronze" },
];

const ACTIVITY_SEED = [
  { activity: "earned", activityLabel: "Earned", description: "Order Completed", detail: "ORD-2026-012845", points: 450, balance: 2840, status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "10:15 AM" },
  { activity: "redeemed", activityLabel: "Redeemed", description: "KES 200 Voucher", detail: "Reward claim", points: -200, balance: 1640, status: "completed", statusLabel: "Completed", date: "27 May 2026", time: "09:42 AM" },
  { activity: "earned", activityLabel: "Earned", description: "Product Review", detail: "SKU-CAM-4421", points: 50, balance: 1890, status: "completed", statusLabel: "Completed", date: "26 May 2026", time: "04:20 PM" },
  { activity: "earned", activityLabel: "Earned", description: "Referral Bonus", detail: "Faith Njeri joined", points: 200, balance: 3120, status: "completed", statusLabel: "Completed", date: "26 May 2026", time: "02:05 PM" },
  { activity: "redeemed", activityLabel: "Redeemed", description: "Free Delivery", detail: "Reward claim", points: -300, balance: 1540, status: "completed", statusLabel: "Completed", date: "25 May 2026", time: "06:33 PM" },
  { activity: "earned", activityLabel: "Earned", description: "Flash Drop Purchase", detail: "ORD-2026-012840", points: 120, balance: 2210, status: "completed", statusLabel: "Completed", date: "25 May 2026", time: "11:18 AM" },
  { activity: "earned", activityLabel: "Earned", description: "Order Completed", detail: "ORD-2026-012838", points: 95, balance: 980, status: "completed", statusLabel: "Completed", date: "24 May 2026", time: "03:55 PM" },
  { activity: "redeemed", activityLabel: "Redeemed", description: "KES 1,000 Voucher", detail: "Reward claim", points: -1000, balance: 1420, status: "completed", statusLabel: "Completed", date: "24 May 2026", time: "10:12 AM" },
  { activity: "earned", activityLabel: "Earned", description: "Daily Login Streak", detail: "Day 7 bonus", points: 25, balance: 640, status: "completed", statusLabel: "Completed", date: "23 May 2026", time: "08:05 AM" },
  { activity: "earned", activityLabel: "Earned", description: "Order Completed", detail: "ORD-2026-012830", points: 180, balance: 2560, status: "completed", statusLabel: "Completed", date: "22 May 2026", time: "01:40 PM" },
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
  const useDemoTotal = !query.q && !query.activity && !query.status && !query.tier;
  const total = useDemoTotal ? 2845 : filtered.length;
  const skip = (page - 1) * limit;
  const activities =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const tierCounts = {
    Platinum: 1256,
    Gold: 3245,
    Silver: 6789,
    Bronze: 5432,
    New: 1534,
  };
  const tierTotal = Object.values(tierCounts).reduce((s, n) => s + n, 0);
  const tierDonut = [
    { key: "platinum", name: "Platinum", value: tierCounts.Platinum, color: "#4f46e5", pct: 6.9 },
    { key: "gold", name: "Gold", value: tierCounts.Gold, color: "#f59e0b", pct: 17.8 },
    { key: "silver", name: "Silver", value: tierCounts.Silver, color: "#94a3b8", pct: 37.1 },
    { key: "bronze", name: "Bronze", value: tierCounts.Bronze, color: "#b45309", pct: 29.7 },
    { key: "new", name: "New", value: tierCounts.New, color: "#14b8a6", pct: 8.5 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      issued: 2845600,
      issuedDelta: 24.3,
      redeemed: 1256780,
      redeemedDelta: 19.6,
      activeMembers: 18256,
      activeMembersDelta: 16.8,
      rewardsClaimed: 8945,
      rewardsClaimedDelta: 14.2,
      expiringSoon: 125430,
      expiringSoonDelta: -8.7,
      liabilityKes: 713500,
      liabilityDelta: 11.3,
    },
    activities,
    members: MEMBERS.map((m, i) => ({
      ...m,
      points: [2450, 1890, 2210, 1640, 3120, 1980, 870, 2390, 420, 640][i] || 500,
    })),
    tierDonut,
    tierTotal,
    topMembers: [
      { name: "Mercy Wanjiku", points: 2450, tier: "Platinum", avatar: avatar("Mercy Wanjiku", 31) },
      { name: "David Kipchoge", points: 3120, tier: "Platinum", avatar: avatar("David Kipchoge", 32) },
      { name: "Anne Mutua", points: 2390, tier: "Gold", avatar: avatar("Anne Mutua", 33) },
      { name: "Peter Otieno", points: 2210, tier: "Gold", avatar: avatar("Peter Otieno", 34) },
      { name: "James Mwangi", points: 1980, tier: "Silver", avatar: avatar("James Mwangi", 35) },
    ],
    expiring: [
      { memberName: "Samuel Mutua", points: 270, expiresOn: "12 Jun 2026" },
      { memberName: "Grace Akinyi", points: 180, expiresOn: "15 Jun 2026" },
      { memberName: "Brian Ochieng", points: 95, expiresOn: "18 Jun 2026" },
      { memberName: "Linda Chebet", points: 340, expiresOn: "22 Jun 2026" },
      { memberName: "Faith Achieng", points: 150, expiresOn: "28 Jun 2026" },
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
