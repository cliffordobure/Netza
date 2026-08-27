const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80&sig=${sig}`;

const TOTAL = 3;
const COMPLETED = 2;
const EXPIRED = 1;
const CANCELLED = 0;
const SOLD = 398;
const REVENUE = 776400;

const PHOTOS = {
  router: "photo-1606904825846-647eb07f5be2",
  cctv: "photo-1557597774-9d273bd59043",
  dahua: "photo-1558002038-1055907df827",
  voucher: "photo-1556742049-0cfed4f6a45d",
  net: "photo-1544197150-b99a5804f08d",
  switch: "photo-1518770660439-4636190af475",
  hdd: "photo-1531492746076-161ca2bcad58",
  lock: "photo-1563013544-824ae1b704d3",
  cable: "photo-1544197150-b99a5804f08d",
  gadget: "photo-1523275335684-37898b6baf30",
  cap: "photo-1521369909029-2afed882baee",
  power: "photo-1473341304170-971dccb5ac1e",
};

const CORE = [
  { name: "TP-Link Archer C6 Router", category: "Networking", discount: 40, status: "completed", stock: 200, sold: 200, revenue: 234000, participants: 1248, channel: "app", startsAt: "2026-05-20T07:00:00.000Z", endsAt: "2026-05-20T20:59:00.000Z", photo: PHOTOS.router, sig: 1 },
  { name: "Hikvision DS-2CD2143G2-I 4MP Dome", category: "CCTV", discount: 35, status: "completed", stock: 150, sold: 150, revenue: 386400, participants: 980, channel: "website", startsAt: "2026-05-18T05:00:00.000Z", endsAt: "2026-05-18T19:00:00.000Z", photo: PHOTOS.cctv, sig: 2 },
  { name: "Dahua 2MP CCTV Camera", category: "CCTV", discount: 32, status: "expired", stock: 80, sold: 48, revenue: 156000, participants: 412, channel: "app", startsAt: "2026-05-16T06:00:00.000Z", endsAt: "2026-05-16T18:00:00.000Z", photo: PHOTOS.dahua, sig: 17 },
  { name: "KSh 1,000 Shopping Voucher", category: "Vouchers", type: "voucher", discount: 0, status: "completed", stock: 500, sold: 500, revenue: 500000, participants: 1860, channel: "email", startsAt: "2026-05-14T05:00:00.000Z", endsAt: "2026-05-14T20:59:00.000Z", photo: PHOTOS.voucher, sig: 23 },
  { name: "TP-Link Archer AX55 Wi-Fi 6 Router", category: "Wi-Fi", discount: 45, status: "completed", stock: 120, sold: 120, revenue: 1890000, participants: 1540, channel: "app", startsAt: "2026-05-12T07:00:00.000Z", endsAt: "2026-05-12T19:00:00.000Z", photo: PHOTOS.router, sig: 9 },
  { name: "NETZA Branded Cap", category: "Gadgets", discount: 50, status: "cancelled", stock: 200, sold: 12, revenue: 2400, participants: 86, channel: "social", startsAt: "2026-05-10T07:00:00.000Z", endsAt: "2026-05-10T15:00:00.000Z", photo: PHOTOS.cap, sig: 24 },
  { name: "Ubiquiti UniFi 6 Lite Access Point", category: "Networking", discount: 28, status: "completed", stock: 90, sold: 86, revenue: 1426000, participants: 720, channel: "website", startsAt: "2026-05-08T06:00:00.000Z", endsAt: "2026-05-08T18:00:00.000Z", photo: PHOTOS.net, sig: 10 },
  { name: "TP-Link Deco X20 Mesh 2-Pack", category: "Wi-Fi", discount: 32, status: "expired", stock: 60, sold: 22, revenue: 198000, participants: 310, channel: "app", startsAt: "2026-05-06T07:00:00.000Z", endsAt: "2026-05-06T19:00:00.000Z", photo: PHOTOS.router, sig: 15 },
  { name: "Hikvision DS-7608NI-K2 8-Channel NVR", category: "CCTV", discount: 22, status: "completed", stock: 40, sold: 40, revenue: 1124000, participants: 640, channel: "website", startsAt: "2026-05-04T07:00:00.000Z", endsAt: "2026-05-04T19:00:00.000Z", photo: PHOTOS.cctv, sig: 12 },
  { name: "280kg Magnetic Lock Kit", category: "Access Control", discount: 35, status: "completed", stock: 80, sold: 74, revenue: 738000, participants: 510, channel: "app", startsAt: "2026-05-02T07:00:00.000Z", endsAt: "2026-05-02T17:00:00.000Z", photo: PHOTOS.lock, sig: 14 },
];

const POOL = [
  ["MikroTik hEX S Gigabit Router", "Networking", 25, PHOTOS.switch, 11],
  ["Seagate SkyHawk 4TB Surveillance HDD", "CCTV", 15, PHOTOS.hdd, 13],
  ["Cisco SG350-10P PoE Switch", "Networking", 18, PHOTOS.switch, 16],
  ["Dahua 4MP PTZ Speed Dome", "CCTV", 25, PHOTOS.dahua, 17],
  ["KSh 2,000 Shopping Voucher", "Vouchers", 0, PHOTOS.voucher, 18],
  ["RFID Proximity Cards — Pack of 50", "Access Control", 40, PHOTOS.lock, 19],
  ["Cat6A SFTP Cable 305m Box", "Accessories", 20, PHOTOS.cable, 20],
  ["TP-Link TL-SG108 8-Port Switch", "Networking", 30, PHOTOS.switch, 21],
  ["LC-LC Single-mode Fiber Patch 3m", "Accessories", 22, PHOTOS.cable, 22],
  ["ZKTeco F18 Fingerprint Terminal", "Access Control", 25, PHOTOS.lock, 5],
  ["APC Back-UPS 650VA", "Others", 20, PHOTOS.power, 7],
  ["NETZA Smart Watch", "Gadgets", 18, PHOTOS.gadget, 6],
  ["Cat6 UTP Cable 305m Box", "Accessories", 18, PHOTOS.cable, 8],
  ["KSh 5,000 Shopping Voucher", "Vouchers", 0, PHOTOS.voucher, 3],
];

const EXPIRED_I = new Set([10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70]);
const CANCELLED_I = new Set([15, 31, 47, 63, 79]);

function fmtWhen(iso) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
  return `${date}, ${time}`;
}

function discountLabel(row) {
  if (row.type === "voucher" || row.category === "Vouchers") return "Voucher";
  return `${row.discount}% OFF`;
}

function channelOf(i) {
  const keys = ["app", "website", "email", "social", "other"];
  return keys[i % keys.length];
}

function statusOf(i) {
  if (i < CORE.length) return CORE[i].status;
  if (CANCELLED_I.has(i)) return "cancelled";
  if (EXPIRED_I.has(i)) return "expired";
  return "completed";
}

function rowAt(i) {
  const sku = `FD-2026-${String(TOTAL - i).padStart(4, "0")}`;
  if (i < CORE.length) {
    const row = CORE[i];
    const soldPct = row.stock ? Math.round((row.sold / row.stock) * 100) : 0;
    return {
      id: `fdh-${i + 1}`,
      n: i + 1,
      sku,
      name: row.name,
      category: row.category,
      type: row.type || "percentage",
      discount: row.discount,
      discountLabel: discountLabel(row),
      status: row.status,
      stock: row.stock,
      sold: row.sold,
      soldPct,
      revenue: row.revenue,
      participants: row.participants,
      channel: row.channel,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      startLabel: fmtWhen(row.startsAt),
      endLabel: fmtWhen(row.endsAt),
      image: img(row.photo, row.sig),
    };
  }
  const spec = POOL[(i - CORE.length) % POOL.length];
  const status = statusOf(i);
  const stock = 40 + (i % 9) * 20;
  const sold = status === "cancelled"
    ? Math.round(stock * 0.08)
    : status === "expired"
      ? Math.round(stock * (0.28 + (i % 5) * 0.06))
      : Math.min(stock, Math.round(stock * (0.72 + (i % 6) * 0.05)));
  const startsAt = new Date(Date.parse("2026-05-20T07:00:00.000Z") - i * 1.62 * 86400000).toISOString();
  const endsAt = new Date(Date.parse(startsAt) + 12 * 3600000).toISOString();
  const discount = spec[2];
  const type = spec[1] === "Vouchers" ? "voucher" : "percentage";
  return {
    id: `fdh-${i + 1}`,
    n: i + 1,
    sku,
    name: spec[0],
    category: spec[1],
    type,
    discount,
    discountLabel: type === "voucher" ? "Voucher" : `${discount}% OFF`,
    status,
    stock,
    sold,
    soldPct: stock ? Math.round((sold / stock) * 100) : 0,
    revenue: sold * (1800 + (i % 40) * 90),
    participants: 80 + (i % 50) * 24,
    channel: channelOf(i),
    startsAt,
    endsAt,
    startLabel: fmtWhen(startsAt),
    endLabel: fmtWhen(endsAt),
    image: img(spec[3], spec[4] + i),
  };
}

function widgets() {
  return {
    stats: {
      total: TOTAL,
      completed: COMPLETED,
      completedPct: 66.7,
      cancelled: CANCELLED,
      cancelledPct: 0,
      expired: EXPIRED,
      expiredPct: 33.3,
      sold: SOLD,
      revenue: REVENUE,
      avgDiscount: 34.2,
    },
    overview: [
      { key: "completed", name: "Completed", count: COMPLETED, pct: 66.7, color: "#16a34a" },
      { key: "expired", name: "Expired", count: EXPIRED, pct: 33.3, color: "#ea580c" },
      { key: "cancelled", name: "Cancelled", count: CANCELLED, pct: 0, color: "#dc2626" },
    ],
    months: [
      { d: "2026-03", label: "Mar", dateLabel: "March 2026", revenue: 156000 },
      { d: "2026-04", label: "Apr", dateLabel: "April 2026", revenue: 234000 },
      { d: "2026-05", label: "May", dateLabel: "May 2026", revenue: 386400 },
    ],
    tipIndex: 4,
    categories: [
      { key: "net", name: "Networking", revenue: 234000, money: "KSh 234K", pct: 30.1, color: "#6D28D9" },
      { key: "cctv", name: "CCTV", revenue: 542400, money: "KSh 542K", pct: 69.9, color: "#2563eb" },
      { key: "vouchers", name: "Vouchers", revenue: 0, money: "KSh 0", pct: 0, color: "#ea580c" },
    ],
    performance: [
      { metric: "Total Revenue", completed: 620400, expired: 156000, cancelled: 0, overall: REVENUE, money: true },
      { metric: "Items Sold", completed: 350, expired: 48, cancelled: 0, overall: SOLD },
      { metric: "Avg. Discount", completed: 37.5, expired: 32.0, cancelled: 0, overall: 34.2, pct: true },
      { metric: "Avg. Conversion Rate", completed: 48.2, expired: 22.1, cancelled: 0, overall: 41.6, pct: true },
      { metric: "Participants", completed: 2, expired: 1, cancelled: 0, overall: 3 },
    ],
    recent: CORE.filter((r) => r.status === "completed").slice(0, 3).map((r, i) => ({
      name: r.name,
      at: fmtWhen(r.endsAt),
      revenue: r.revenue,
      sold: r.sold,
      stock: r.stock,
      image: img(r.photo, r.sig),
      sku: `FD-2026-${String(TOTAL - i).padStart(4, "0")}`,
    })),
    categoriesList: ["Networking", "CCTV", "Vouchers", "Wi-Fi", "Accessories", "Access Control", "Gadgets", "Others"],
  };
}

function listFlashDropHistory(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const category = String(query.category || "").trim();
  const channel = String(query.channel || "").trim().toLowerCase();
  const skip = (page - 1) * limit;

  let rows = Array.from({ length: TOTAL }, (_, i) => rowAt(i));
  if (q) rows = rows.filter((r) => `${r.name} ${r.sku}`.toLowerCase().includes(q));
  if (status) rows = rows.filter((r) => r.status === status);
  if (category) rows = rows.filter((r) => r.category === category);
  if (channel) rows = rows.filter((r) => r.channel === channel);

  const slice = rows.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 }));
  return { drops: slice, total: rows.length, page, limit, ...widgets() };
}

module.exports = { listFlashDropHistory };
