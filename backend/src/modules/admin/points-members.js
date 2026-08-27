const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const TIERS = ["Platinum", "Gold", "Silver", "Bronze", "New"];
const CHANNELS = ["App", "Web", "Referral", "In-store", "Import"];
const STATUSES = ["active", "inactive", "suspended"];

const MEMBER_SEED = [
  { memId: "MEM-0001245", name: "Mercy Wanjiku", tier: "Platinum", balance: 2450, earned: 18450, rewardsClaimed: 12, joined: "25 Apr 2026", lastActiveDate: "27 May 2026", lastActiveTime: "10:15 AM", status: "active", statusLabel: "Active", channel: "App" },
  { memId: "MEM-0001246", name: "David Kipchoge", tier: "Platinum", balance: 3120, earned: 22180, rewardsClaimed: 15, joined: "12 Mar 2026", lastActiveDate: "27 May 2026", lastActiveTime: "09:42 AM", status: "active", statusLabel: "Active", channel: "Web" },
  { memId: "MEM-0001247", name: "Anne Mutua", tier: "Gold", balance: 2390, earned: 15620, rewardsClaimed: 9, joined: "03 Feb 2026", lastActiveDate: "26 May 2026", lastActiveTime: "04:20 PM", status: "active", statusLabel: "Active", channel: "Referral" },
  { memId: "MEM-0001248", name: "Peter Otieno", tier: "Gold", balance: 2210, earned: 14300, rewardsClaimed: 8, joined: "18 Jan 2026", lastActiveDate: "26 May 2026", lastActiveTime: "02:05 PM", status: "active", statusLabel: "Active", channel: "App" },
  { memId: "MEM-0001249", name: "James Mwangi", tier: "Silver", balance: 1980, earned: 11240, rewardsClaimed: 6, joined: "09 Dec 2025", lastActiveDate: "25 May 2026", lastActiveTime: "06:33 PM", status: "active", statusLabel: "Active", channel: "Web" },
  { memId: "MEM-0001250", name: "Grace Akinyi", tier: "Silver", balance: 1640, earned: 9870, rewardsClaimed: 5, joined: "22 Nov 2025", lastActiveDate: "25 May 2026", lastActiveTime: "11:18 AM", status: "active", statusLabel: "Active", channel: "In-store" },
  { memId: "MEM-0001251", name: "Faith Achieng", tier: "Gold", balance: 1890, earned: 13450, rewardsClaimed: 7, joined: "14 Oct 2025", lastActiveDate: "24 May 2026", lastActiveTime: "03:55 PM", status: "active", statusLabel: "Active", channel: "App" },
  { memId: "MEM-0001252", name: "Samuel Mutua", tier: "Bronze", balance: 870, earned: 5420, rewardsClaimed: 3, joined: "05 Sep 2025", lastActiveDate: "24 May 2026", lastActiveTime: "10:12 AM", status: "active", statusLabel: "Active", channel: "Referral" },
  { memId: "MEM-0001253", name: "Brian Ochieng", tier: "New", balance: 420, earned: 420, rewardsClaimed: 0, joined: "20 May 2026", lastActiveDate: "23 May 2026", lastActiveTime: "08:05 AM", status: "active", statusLabel: "Active", channel: "App" },
  { memId: "MEM-0001254", name: "Linda Chebet", tier: "Bronze", balance: 640, earned: 3890, rewardsClaimed: 2, joined: "28 Aug 2025", lastActiveDate: "22 May 2026", lastActiveTime: "01:40 PM", status: "active", statusLabel: "Active", channel: "Import" },
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
  const useDemoTotal = !query.q && !query.tier && !query.status && !query.channel;
  const total = useDemoTotal ? 18256 : filtered.length;
  const skip = (page - 1) * limit;
  const members =
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

  const tierDonut = [
    { key: "platinum", name: "Platinum", value: tierCounts.Platinum, color: "#6d28d9", pct: 6.9 },
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
      totalMembers: 18256,
      totalMembersDelta: 16.8,
      newThisMonth: 1534,
      newThisMonthDelta: 12.5,
      activeMembers: 14832,
      activeMembersDelta: 15.3,
      withPoints: 12945,
      withPointsDelta: 14.7,
      rewardsClaimedMonth: 4256,
      rewardsClaimedMonthDelta: 8.9,
    },
    members,
    tierDonut,
    topMembers: [
      { name: "Mercy Wanjiku", points: 2450, tier: "Platinum", avatar: avatar("Mercy Wanjiku", 51) },
      { name: "David Kipchoge", points: 3120, tier: "Platinum", avatar: avatar("David Kipchoge", 52) },
      { name: "Anne Mutua", points: 2390, tier: "Gold", avatar: avatar("Anne Mutua", 53) },
      { name: "Peter Otieno", points: 2210, tier: "Gold", avatar: avatar("Peter Otieno", 54) },
      { name: "James Mwangi", points: 1980, tier: "Silver", avatar: avatar("James Mwangi", 55) },
    ],
    newMembers: [
      { name: "Brian Ochieng", joined: "27 May 2026", points: 320, avatar: avatar("Brian Ochieng", 61) },
      { name: "Natalie Wambui", joined: "26 May 2026", points: 150, avatar: avatar("Natalie Wambui", 62) },
      { name: "Kevin Njoroge", joined: "24 May 2026", points: 80, avatar: avatar("Kevin Njoroge", 63) },
      { name: "Amina Hassan", joined: "22 May 2026", points: 210, avatar: avatar("Amina Hassan", 64) },
      { name: "Eric Kamau", joined: "20 May 2026", points: 95, avatar: avatar("Eric Kamau", 65) },
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
