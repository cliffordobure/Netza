const thumb = (n, bg = "6d28d9") =>
  `https://ui-avatars.com/api/?name=C${n}&background=${bg}&color=fff&size=64&bold=true`;

const CAMPAIGNS = [
  { name: "Flash Drop Weekend Blast", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "completed", statusLabel: "Completed", audience: "All Customers", sent: "24 May 2026 · 09:00 AM", openRate: 42.6, ctr: 12.4, thumb: thumb(1, "6d28d9") },
  { name: "Loyalty Points Reminder", type: "sms", typeLabel: "SMS", channel: "SMS", channelIcon: "phone", status: "active", statusLabel: "Active", audience: "Points Members", sent: "Ongoing", openRate: 58.2, ctr: 18.1, thumb: thumb(2, "16a34a") },
  { name: "New Arrivals Push", type: "push", typeLabel: "Push", channel: "Push", channelIcon: "bell", status: "scheduled", statusLabel: "Scheduled", audience: "App Users", sent: "28 May 2026 · 10:00 AM", openRate: 0, ctr: 0, thumb: thumb(3, "2563eb") },
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
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const campaigns = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      emailSent: 120,
      emailDelta: 0,
      smsSent: 80,
      smsDelta: 0,
      pushSent: 45,
      pushDelta: 0,
      couponsUsed: 3,
      couponsDelta: 0,
      revenue: 24600,
      revenueDelta: 0,
      engagement: 18.6,
      engagementDelta: 0,
    },
    performance: {
      engagement: 18.6,
      openRate: 50.4,
      openDelta: 0,
      ctr: 15.3,
      ctrDelta: 0,
      conversion: 4.8,
      conversionDelta: 0,
    },
    campaigns,
    topCampaigns: [
      { name: "Loyalty Points Reminder", rate: 58.2, tone: "green" },
      { name: "Flash Drop Weekend Blast", rate: 42.6, tone: "purple" },
      { name: "New Arrivals Push", rate: 0, tone: "blue" },
    ],
    coupons: [
      { code: "TAJIRA500", usage: 2, revenue: 1000 },
      { code: "FLASH15", usage: 1, revenue: 450 },
      { code: "LOYAL10", usage: 1, revenue: 300 },
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
