const thumb = (n, bg = "6d28d9") =>
  `https://ui-avatars.com/api/?name=C${n}&background=${bg}&color=fff&size=64&bold=true`;

const CAMPAIGNS = [
  { name: "Flash Drop Weekend Blast", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "completed", statusLabel: "Completed", audience: "All Customers", sent: "24 May 2026 · 09:00 AM", openRate: 42.6, ctr: 12.4, thumb: thumb(1, "6d28d9") },
  { name: "Loyalty Points Reminder", type: "sms", typeLabel: "SMS", channel: "SMS", channelIcon: "phone", status: "active", statusLabel: "Active", audience: "Points Members", sent: "Ongoing", openRate: 58.2, ctr: 18.1, thumb: thumb(2, "16a34a") },
  { name: "New Arrivals Push", type: "push", typeLabel: "Push", channel: "Push", channelIcon: "bell", status: "scheduled", statusLabel: "Scheduled", audience: "App Users", sent: "28 May 2026 · 10:00 AM", openRate: 0, ctr: 0, thumb: thumb(3, "2563eb") },
  { name: "KES 500 Coupon Drop", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "completed", statusLabel: "Completed", audience: "VIP Segment", sent: "20 May 2026 · 02:00 PM", openRate: 51.3, ctr: 16.8, thumb: thumb(4, "ea580c") },
  { name: "Abandoned Cart Recovery", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "active", statusLabel: "Active", audience: "Cart Abandoners", sent: "Ongoing", openRate: 36.9, ctr: 9.4, thumb: thumb(5, "db2777") },
  { name: "Mother's Day Promo SMS", type: "sms", typeLabel: "SMS", channel: "SMS", channelIcon: "phone", status: "completed", statusLabel: "Completed", audience: "Nairobi Zone", sent: "12 May 2026 · 08:30 AM", openRate: 64.1, ctr: 22.5, thumb: thumb(6, "0d9488") },
  { name: "Flash Drop Countdown", type: "push", typeLabel: "Push", channel: "Push", channelIcon: "bell", status: "draft", statusLabel: "Draft", audience: "All App Users", sent: "Not scheduled", openRate: 0, ctr: 0, thumb: thumb(7, "64748b") },
  { name: "Referral Bonus Campaign", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "scheduled", statusLabel: "Scheduled", audience: "Referrers", sent: "01 Jun 2026 · 11:00 AM", openRate: 0, ctr: 0, thumb: thumb(8, "7c3aed") },
  { name: "Security Camera Bundle", type: "sms", typeLabel: "SMS", channel: "SMS", channelIcon: "phone", status: "active", statusLabel: "Active", audience: "CCTV Interest", sent: "Ongoing", openRate: 47.8, ctr: 14.2, thumb: thumb(9, "ca8a04") },
  { name: "Welcome Series — Day 3", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "completed", statusLabel: "Completed", audience: "New Customers", sent: "18 May 2026 · 07:00 AM", openRate: 55.0, ctr: 19.6, thumb: thumb(10, "6c5dd3") },
];

function buildRows() {
  return CAMPAIGNS.map((c, i) => ({
    id: `cmp${i + 1}`,
    n: i + 1,
    ...c,
    performance:
      c.status === "draft" || c.status === "scheduled"
        ? "—"
        : `${c.openRate}% open · ${c.ctr}% CTR`,
  }));
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.audience.toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q) ||
        r.channel.toLowerCase().includes(q)
    );
  }
  if (query.type) list = list.filter((r) => r.type === query.type);
  if (query.channel) list = list.filter((r) => r.channel.toLowerCase() === String(query.channel).toLowerCase());
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.tab && query.tab !== "recent" && query.tab !== "all") {
    const map = { active: "active", scheduled: "scheduled", completed: "completed", drafts: "draft" };
    const st = map[query.tab];
    if (st) list = list.filter((r) => r.status === st);
  }
  return list;
}

function getMarketingOverview(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const useDemoTotal = !query.q && !query.type && !query.channel && !query.status && (!query.tab || query.tab === "recent" || query.tab === "all");
  const total = useDemoTotal && (!query.tab || query.tab === "recent" || query.tab === "all") ? 32 : filtered.length;
  const skip = (page - 1) * limit;
  const campaigns =
    page === 1 && useDemoTotal && limit >= 10 && (!query.tab || query.tab === "recent" || query.tab === "all")
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      emailSent: 124580,
      emailDelta: 21.4,
      smsSent: 86420,
      smsDelta: 18.2,
      pushSent: 52310,
      pushDelta: 15.6,
      couponsUsed: 8642,
      couponsDelta: 12.8,
      revenue: 2456780,
      revenueDelta: 24.5,
      engagement: 18.6,
      engagementDelta: 3.2,
    },
    performance: {
      engagement: 18.6,
      openRate: 46.8,
      openDelta: 5.2,
      ctr: 14.3,
      ctrDelta: 2.1,
      conversion: 4.8,
      conversionDelta: 0.9,
    },
    campaigns,
    topCampaigns: [
      { name: "Mother's Day Promo SMS", rate: 64.1, tone: "green" },
      { name: "Welcome Series — Day 3", rate: 55.0, tone: "purple" },
      { name: "KES 500 Coupon Drop", rate: 51.3, tone: "orange" },
      { name: "Security Camera Bundle", rate: 47.8, tone: "blue" },
      { name: "Flash Drop Weekend Blast", rate: 42.6, tone: "pink" },
    ],
    coupons: [
      { code: "NETZA500", usage: 1248, revenue: 624000 },
      { code: "FLASH15", usage: 986, revenue: 412500 },
      { code: "LOYAL10", usage: 742, revenue: 298400 },
      { code: "WELCOME", usage: 631, revenue: 189300 },
      { code: "CCTV20", usage: 418, revenue: 334400 },
    ],
    filters: {
      types: [
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
        { value: "push", label: "Push" },
      ],
      channels: ["Email", "SMS", "Push"],
    },
    footerMessage:
      "Create targeted campaigns across email, SMS and push. Track performance and redeem rates from one place.",
  };
}

module.exports = { getMarketingOverview };
