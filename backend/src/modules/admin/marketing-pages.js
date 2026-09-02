const thumb = (label, bg = "6d28d9", n = 1) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=${bg}&color=fff&size=64&bold=true&sig=${n}`;

const bannerImg = (n) =>
  `https://ui-avatars.com/api/?name=BN${n}&background=1e1b4b&color=fff&size=128&bold=true&sig=${n}`;

const CAMPAIGNS = [
  { name: "Flash Drop Weekend Blast", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "completed", statusLabel: "Completed", audience: "All Customers", sent: "24 May 2026 · 09:00 AM", openRate: 42.6, ctr: 12.4, conversions: 186, revenue: 124500, subject: "This weekend only — Flash Drop live!", thumb: thumb("FD", "6d28d9", 1) },
  { name: "Loyalty Points Reminder", type: "sms", typeLabel: "SMS", channel: "SMS", channelIcon: "phone", status: "active", statusLabel: "Active", audience: "Points Members", sent: "Ongoing", openRate: 58.2, ctr: 18.1, conversions: 94, revenue: 48200, subject: "Your points expire soon — redeem today", thumb: thumb("LP", "16a34a", 2) },
  { name: "New Arrivals Push", type: "push", typeLabel: "Push", channel: "Push", channelIcon: "bell", status: "scheduled", statusLabel: "Scheduled", audience: "App Users", sent: "28 May 2026 · 10:00 AM", openRate: 0, ctr: 0, conversions: 0, revenue: 0, subject: "Fresh drops just landed ✨", thumb: thumb("NA", "2563eb", 3) },
  { name: "Welcome Series #1", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "active", statusLabel: "Active", audience: "New Customers", sent: "Ongoing", openRate: 61.4, ctr: 14.8, conversions: 210, revenue: 89600, subject: "Karibu to Tajira Kenya!", thumb: thumb("WS", "7c3aed", 4) },
  { name: "Cart Abandonment SMS", type: "sms", typeLabel: "SMS", channel: "SMS", channelIcon: "phone", status: "completed", statusLabel: "Completed", audience: "Cart Abandoners", sent: "22 May 2026 · 03:00 PM", openRate: 71.2, ctr: 22.5, conversions: 67, revenue: 31800, subject: "Still thinking it over? Complete your order", thumb: thumb("CA", "0d9488", 5) },
  { name: "Flash Drop Push Alert", type: "push", typeLabel: "Push", channel: "Push", channelIcon: "bell", status: "draft", statusLabel: "Draft", audience: "VIP App Users", sent: "—", openRate: 0, ctr: 0, conversions: 0, revenue: 0, subject: "VIP early access starts in 1 hour", thumb: thumb("FP", "ea580c", 6) },
  { name: "Mother's Day Promo", type: "email", typeLabel: "Email", channel: "Email", channelIcon: "mail", status: "completed", statusLabel: "Completed", audience: "All Customers", sent: "10 May 2026 · 08:00 AM", openRate: 38.9, ctr: 9.6, conversions: 142, revenue: 97600, subject: "Gifts she'll love — up to 30% off", thumb: thumb("MD", "db2777", 7) },
  { name: "Delivery Update Push", type: "push", typeLabel: "Push", channel: "Push", channelIcon: "bell", status: "completed", statusLabel: "Completed", audience: "Active Orders", sent: "26 May 2026 · 02:15 PM", openRate: 82.1, ctr: 31.4, conversions: 0, revenue: 0, subject: "Your order is out for delivery", thumb: thumb("DU", "0891b2", 8) },
];

const EMAIL_TEMPLATES = [
  { name: "Welcome Email", category: "Onboarding", status: "active", statusLabel: "Active", uses: 1240, openRate: 61.4, updated: "20 May 2026" },
  { name: "Flash Drop Announcement", category: "Promotional", status: "active", statusLabel: "Active", uses: 86, openRate: 42.6, updated: "24 May 2026" },
  { name: "Order Confirmation", category: "Transactional", status: "active", statusLabel: "Active", uses: 4820, openRate: 88.2, updated: "12 May 2026" },
  { name: "Points Expiry Reminder", category: "Loyalty", status: "draft", statusLabel: "Draft", uses: 0, openRate: 0, updated: "25 May 2026" },
  { name: "Win-back Offer", category: "Retention", status: "scheduled", statusLabel: "Scheduled", uses: 12, openRate: 0, updated: "27 May 2026" },
];

const SMS_MESSAGES = [
  { name: "Loyalty Points Reminder", status: "active", statusLabel: "Active", audience: "Points Members", chars: 118, sent: 12480, delivery: 97.4, ctr: 18.1, scheduled: "Ongoing" },
  { name: "Cart Abandonment SMS", status: "completed", statusLabel: "Completed", audience: "Cart Abandoners", chars: 96, sent: 3420, delivery: 98.1, ctr: 22.5, scheduled: "22 May 2026" },
  { name: "Flash Drop Alert", status: "scheduled", statusLabel: "Scheduled", audience: "All Opt-in", chars: 102, sent: 0, delivery: 0, ctr: 0, scheduled: "28 May 2026 · 09:00" },
  { name: "OTP Verification", status: "active", statusLabel: "Active", audience: "All Users", chars: 72, sent: 28940, delivery: 99.2, ctr: 0, scheduled: "Ongoing" },
  { name: "Weekend Promo Blast", status: "draft", statusLabel: "Draft", audience: "Nairobi Customers", chars: 140, sent: 0, delivery: 0, ctr: 0, scheduled: "—" },
];

const PUSH_NOTES = [
  { name: "New Arrivals Push", status: "scheduled", statusLabel: "Scheduled", audience: "App Users", platform: "iOS + Android", sent: 0, openRate: 0, ctr: 0, scheduled: "28 May 2026 · 10:00" },
  { name: "Flash Drop Push Alert", status: "draft", statusLabel: "Draft", audience: "VIP App Users", platform: "iOS + Android", sent: 0, openRate: 0, ctr: 0, scheduled: "—" },
  { name: "Delivery Update Push", status: "completed", statusLabel: "Completed", audience: "Active Orders", platform: "iOS + Android", sent: 1860, openRate: 82.1, ctr: 31.4, scheduled: "26 May 2026" },
  { name: "Points Milestone", status: "active", statusLabel: "Active", audience: "Gold Members", platform: "Android", sent: 420, openRate: 64.8, ctr: 19.2, scheduled: "Ongoing" },
  { name: "Re-engage Inactive", status: "completed", statusLabel: "Completed", audience: "30-day inactive", platform: "iOS + Android", sent: 5120, openRate: 28.4, ctr: 6.8, scheduled: "18 May 2026" },
];

const DISCOUNTS = [
  { code: "TAJIRA500", type: "fixed", typeLabel: "Fixed (KES)", value: 500, status: "active", statusLabel: "Active", usage: 248, limit: 1000, revenue: 124000, starts: "01 May 2026", ends: "31 May 2026" },
  { code: "FLASH15", type: "percent", typeLabel: "Percent", value: 15, status: "active", statusLabel: "Active", usage: 186, limit: 500, revenue: 89200, starts: "20 May 2026", ends: "27 May 2026" },
  { code: "LOYAL10", type: "percent", typeLabel: "Percent", value: 10, status: "active", statusLabel: "Active", usage: 94, limit: null, revenue: 41200, starts: "01 Jan 2026", ends: "31 Dec 2026" },
  { code: "WELCOME20", type: "percent", typeLabel: "Percent", value: 20, status: "scheduled", statusLabel: "Scheduled", usage: 0, limit: 1, revenue: 0, starts: "01 Jun 2026", ends: "30 Jun 2026" },
  { code: "FREESHIP", type: "shipping", typeLabel: "Free Shipping", value: 0, status: "expired", statusLabel: "Expired", usage: 640, limit: null, revenue: 0, starts: "01 Apr 2026", ends: "30 Apr 2026" },
  { code: "VIP25", type: "percent", typeLabel: "Percent", value: 25, status: "draft", statusLabel: "Draft", usage: 0, limit: 200, revenue: 0, starts: "—", ends: "—" },
];

const BANNERS = [
  { name: "Homepage Hero — Flash Drop", placement: "Home Hero", status: "active", statusLabel: "Active", clicks: 4820, impressions: 62400, ctr: 7.7, starts: "20 May 2026", ends: "27 May 2026", image: bannerImg(1) },
  { name: "App Splash — New Arrivals", placement: "App Splash", status: "scheduled", statusLabel: "Scheduled", clicks: 0, impressions: 0, ctr: 0, starts: "28 May 2026", ends: "04 Jun 2026", image: bannerImg(2) },
  { name: "Category Strip — Electronics", placement: "Category Strip", status: "active", statusLabel: "Active", clicks: 1260, impressions: 28100, ctr: 4.5, starts: "01 May 2026", ends: "31 May 2026", image: bannerImg(3) },
  { name: "Checkout Upsell — Points", placement: "Checkout", status: "paused", statusLabel: "Paused", clicks: 340, impressions: 8900, ctr: 3.8, starts: "10 May 2026", ends: "10 Jun 2026", image: bannerImg(4) },
  { name: "Email Header — Mother's Day", placement: "Email Header", status: "expired", statusLabel: "Expired", clicks: 2100, impressions: 18600, ctr: 11.3, starts: "01 May 2026", ends: "12 May 2026", image: bannerImg(5) },
];

function paginate(list, query = {}, defaultLimit = 10) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || defaultLimit));
  const total = list.length;
  const skip = (page - 1) * limit;
  return { page, limit, total, rows: list.slice(skip, skip + limit) };
}

function campaignRows(query = {}) {
  let list = CAMPAIGNS.map((c, i) => ({
    id: `cmp${i + 1}`,
    n: i + 1,
    ...c,
    performance:
      c.status === "draft" || c.status === "scheduled"
        ? "—"
        : `${c.openRate}% open · ${c.ctr}% CTR`,
  }));
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.audience.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)
    );
  }
  if (query.type) list = list.filter((r) => r.type === query.type);
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.channel) list = list.filter((r) => r.channel.toLowerCase() === String(query.channel).toLowerCase());
  if (query.tab && query.tab !== "recent" && query.tab !== "all") {
    const map = { active: "active", scheduled: "scheduled", completed: "completed", drafts: "draft" };
    const st = map[query.tab];
    if (st) list = list.filter((r) => r.status === st);
  }
  return list.map((r, i) => ({ ...r, n: i + 1 }));
}

function getMarketingCampaigns(query = {}) {
  const filtered = campaignRows(query);
  const { page, limit, total, rows } = paginate(filtered, query);
  return {
    total,
    page,
    limit,
    stats: {
      total: CAMPAIGNS.length,
      active: CAMPAIGNS.filter((c) => c.status === "active").length,
      scheduled: CAMPAIGNS.filter((c) => c.status === "scheduled").length,
      completed: CAMPAIGNS.filter((c) => c.status === "completed").length,
      drafts: CAMPAIGNS.filter((c) => c.status === "draft").length,
      revenue: CAMPAIGNS.reduce((s, c) => s + c.revenue, 0),
    },
    campaigns: rows,
    filters: {
      types: [
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
        { value: "push", label: "Push" },
      ],
      statuses: [
        { value: "active", label: "Active" },
        { value: "scheduled", label: "Scheduled" },
        { value: "completed", label: "Completed" },
        { value: "draft", label: "Draft" },
      ],
    },
  };
}

function getMarketingEmail(query = {}) {
  let list = EMAIL_TEMPLATES.map((t, i) => ({ id: `em${i + 1}`, n: i + 1, ...t }));
  const q = (query.q || "").trim().toLowerCase();
  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.category) list = list.filter((r) => r.category === query.category);
  list = list.map((r, i) => ({ ...r, n: i + 1 }));
  const { page, limit, total, rows } = paginate(list, query);
  const emailCamps = CAMPAIGNS.filter((c) => c.type === "email");
  return {
    total,
    page,
    limit,
    stats: {
      sent: 48260,
      sentDelta: 12.4,
      openRate: 48.6,
      openDelta: 2.1,
      ctr: 11.8,
      ctrDelta: 0.8,
      templates: EMAIL_TEMPLATES.length,
      templatesDelta: 0,
      revenue: emailCamps.reduce((s, c) => s + c.revenue, 0),
      revenueDelta: 9.6,
    },
    templates: rows,
    recent: emailCamps.slice(0, 4).map((c, i) => ({
      id: `ec${i + 1}`,
      name: c.name,
      status: c.status,
      statusLabel: c.statusLabel,
      openRate: c.openRate,
      ctr: c.ctr,
      sent: c.sent,
    })),
    filters: {
      statuses: [
        { value: "active", label: "Active" },
        { value: "scheduled", label: "Scheduled" },
        { value: "draft", label: "Draft" },
      ],
      categories: ["Onboarding", "Promotional", "Transactional", "Loyalty", "Retention"],
    },
  };
}

function getMarketingSms(query = {}) {
  let list = SMS_MESSAGES.map((t, i) => ({ id: `sm${i + 1}`, n: i + 1, ...t }));
  const q = (query.q || "").trim().toLowerCase();
  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.audience.toLowerCase().includes(q));
  if (query.status) list = list.filter((r) => r.status === query.status);
  list = list.map((r, i) => ({ ...r, n: i + 1 }));
  const { page, limit, total, rows } = paginate(list, query);
  return {
    total,
    page,
    limit,
    stats: {
      sent: 44840,
      sentDelta: 8.7,
      delivery: 98.2,
      deliveryDelta: 0.4,
      ctr: 16.4,
      ctrDelta: 1.2,
      credits: 125000,
      creditsDelta: -6.3,
      active: SMS_MESSAGES.filter((s) => s.status === "active").length,
      activeDelta: 0,
    },
    messages: rows,
    filters: {
      statuses: [
        { value: "active", label: "Active" },
        { value: "scheduled", label: "Scheduled" },
        { value: "completed", label: "Completed" },
        { value: "draft", label: "Draft" },
      ],
    },
  };
}

function getMarketingPush(query = {}) {
  let list = PUSH_NOTES.map((t, i) => ({ id: `pn${i + 1}`, n: i + 1, ...t }));
  const q = (query.q || "").trim().toLowerCase();
  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.audience.toLowerCase().includes(q));
  if (query.status) list = list.filter((r) => r.status === query.status);
  list = list.map((r, i) => ({ ...r, n: i + 1 }));
  const { page, limit, total, rows } = paginate(list, query);
  return {
    total,
    page,
    limit,
    stats: {
      sent: 7400,
      sentDelta: 14.2,
      openRate: 54.8,
      openDelta: 3.6,
      ctr: 18.9,
      ctrDelta: 2.1,
      devices: 38240,
      devicesDelta: 5.4,
      scheduled: PUSH_NOTES.filter((p) => p.status === "scheduled").length,
      scheduledDelta: 0,
    },
    notifications: rows,
    filters: {
      statuses: [
        { value: "active", label: "Active" },
        { value: "scheduled", label: "Scheduled" },
        { value: "completed", label: "Completed" },
        { value: "draft", label: "Draft" },
      ],
    },
  };
}

function getMarketingDiscounts(query = {}) {
  let list = DISCOUNTS.map((t, i) => ({ id: `dc${i + 1}`, n: i + 1, ...t }));
  const q = (query.q || "").trim().toLowerCase();
  if (q) list = list.filter((r) => r.code.toLowerCase().includes(q) || r.typeLabel.toLowerCase().includes(q));
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.type) list = list.filter((r) => r.type === query.type);
  list = list.map((r, i) => ({ ...r, n: i + 1 }));
  const { page, limit, total, rows } = paginate(list, query);
  return {
    total,
    page,
    limit,
    stats: {
      active: DISCOUNTS.filter((d) => d.status === "active").length,
      activeDelta: 0,
      usage: DISCOUNTS.reduce((s, d) => s + d.usage, 0),
      usageDelta: 11.2,
      revenue: DISCOUNTS.reduce((s, d) => s + d.revenue, 0),
      revenueDelta: 8.4,
      scheduled: DISCOUNTS.filter((d) => d.status === "scheduled").length,
      scheduledDelta: 0,
      expired: DISCOUNTS.filter((d) => d.status === "expired").length,
      expiredDelta: 0,
    },
    discounts: rows,
    filters: {
      statuses: [
        { value: "active", label: "Active" },
        { value: "scheduled", label: "Scheduled" },
        { value: "expired", label: "Expired" },
        { value: "draft", label: "Draft" },
      ],
      types: [
        { value: "percent", label: "Percent" },
        { value: "fixed", label: "Fixed (KES)" },
        { value: "shipping", label: "Free Shipping" },
      ],
    },
  };
}

function getMarketingBanners(query = {}) {
  let list = BANNERS.map((t, i) => ({ id: `bn${i + 1}`, n: i + 1, ...t }));
  const q = (query.q || "").trim().toLowerCase();
  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.placement.toLowerCase().includes(q));
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.placement) list = list.filter((r) => r.placement === query.placement);
  list = list.map((r, i) => ({ ...r, n: i + 1 }));
  const { page, limit, total, rows } = paginate(list, query);
  return {
    total,
    page,
    limit,
    stats: {
      active: BANNERS.filter((b) => b.status === "active").length,
      activeDelta: 0,
      impressions: BANNERS.reduce((s, b) => s + b.impressions, 0),
      impressionsDelta: 9.8,
      clicks: BANNERS.reduce((s, b) => s + b.clicks, 0),
      clicksDelta: 7.2,
      avgCtr: 6.1,
      avgCtrDelta: 0.5,
      scheduled: BANNERS.filter((b) => b.status === "scheduled").length,
      scheduledDelta: 0,
    },
    banners: rows,
    filters: {
      statuses: [
        { value: "active", label: "Active" },
        { value: "scheduled", label: "Scheduled" },
        { value: "paused", label: "Paused" },
        { value: "expired", label: "Expired" },
      ],
      placements: ["Home Hero", "App Splash", "Category Strip", "Checkout", "Email Header"],
    },
  };
}

module.exports = {
  getMarketingCampaigns,
  getMarketingEmail,
  getMarketingSms,
  getMarketingPush,
  getMarketingDiscounts,
  getMarketingBanners,
  campaignRows,
};
