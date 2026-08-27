const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const TIERS = ["Platinum", "Gold", "Silver", "Bronze", "New"];
const CHANNELS = ["App", "Web", "Referral", "In-store", "Import"];
const STATUSES = ["active", "inactive", "suspended"];

const MEMBER_SEED = [
  { memId: "MEM-0001245", name: "Mercy Wanjiku", tier: "Platinum", balance: 2450, earned: 18450, rewardsClaimed: 12, joined: "25 Apr 2026", lastActiveDate: "27 May 2026", lastActiveTime: "10:15 AM", status: "active", statusLabel: "Active", channel: "App" },
  { memId: "MEM-0001246", name: "David Kipchoge", tier: "Gold", balance: 3120, earned: 22180, rewardsClaimed: 15, joined: "12 Mar 2026", lastActiveDate: "27 May 2026", lastActiveTime: "09:42 AM", status: "active", statusLabel: "Active", channel: "Web" },
  { memId: "MEM-0001247", name: "Anne Mutua", tier: "Silver", balance: 2390, earned: 15620, rewardsClaimed: 9, joined: "03 Feb 2026", lastActiveDate: "26 May 2026", lastActiveTime: "04:20 PM", status: "active", statusLabel: "Active", channel: "Referral" },
];

function buildMembers() {
  return MEMBER_SEED.map((row, i) => ({
    id: `mem${i + 1}`,
    n: i + 1,
    avatar: avatar(row.name, i + 40),
    ...row,
  }));
}

function filterMembers(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.memId.toLowerCase().includes(q) ||
        (r.channel || "").toLowerCase().includes(q)
    );
  }
  if (query.tier) list = list.filter((r) => r.tier === query.tier);
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.channel) list = list.filter((r) => r.channel === query.channel);
  return list;
}

function getPointsMembers(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildMembers();
  const filtered = filterMembers(all, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const members = filtered.slice(skip, skip + limit);

  const tierCounts = {
    Platinum: 1,
    Gold: 1,
    Silver: 1,
    Bronze: 0,
    New: 0,
  };

  const tierDonut = [
    { key: "platinum", name: "Platinum", value: tierCounts.Platinum, color: "#6d28d9", pct: 33.3 },
    { key: "gold", name: "Gold", value: tierCounts.Gold, color: "#f59e0b", pct: 33.3 },
    { key: "silver", name: "Silver", value: tierCounts.Silver, color: "#94a3b8", pct: 33.4 },
  ];

  return {
    total,
    page,
    limit,
    stats: {
      totalMembers: 3,
      totalMembersDelta: 0,
      newThisMonth: 0,
      newThisMonthDelta: 0,
      activeMembers: 3,
      activeMembersDelta: 0,
      withPoints: 3,
      withPointsDelta: 0,
      rewardsClaimedMonth: 3,
      rewardsClaimedMonthDelta: 0,
    },
    members,
    tierDonut,
    topMembers: [
      { name: "David Kipchoge", points: 3120, tier: "Gold", avatar: avatar("David Kipchoge", 52) },
      { name: "Mercy Wanjiku", points: 2450, tier: "Platinum", avatar: avatar("Mercy Wanjiku", 51) },
      { name: "Anne Mutua", points: 2390, tier: "Silver", avatar: avatar("Anne Mutua", 53) },
    ],
    newMembers: [
      { name: "Brian Ochieng", joined: "27 May 2026", points: 320, avatar: avatar("Brian Ochieng", 61) },
      { name: "Natalie Wambui", joined: "26 May 2026", points: 150, avatar: avatar("Natalie Wambui", 62) },
      { name: "Kevin Njoroge", joined: "24 May 2026", points: 80, avatar: avatar("Kevin Njoroge", 63) },
    ],
    filters: {
      tiers: TIERS,
      statuses: STATUSES,
      channels: CHANNELS,
    },
    footerMessage:
      "Members earn points on every purchase and activity. Points can be redeemed for rewards and discounts.",
  };
}

module.exports = { getPointsMembers };
