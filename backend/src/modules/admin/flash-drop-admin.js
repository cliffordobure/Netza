const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&q=80&sig=${sig}`;

const LIVE_REMAINING = [
  (1 * 3600 + 45 * 60 + 32) * 1000,
  (3 * 3600 + 12 * 60) * 1000,
  (6 * 3600 + 5 * 60) * 1000,
];

const CORE = [
  { name: "TP-Link Archer C6 Router", category: "Networking", type: "percentage", discount: 40, startLabel: "27 May 2026, 10:00 AM", endLabel: "27 May 2026, 11:59 PM", stock: 44, sold: 156, revenue: 234000, image: img("photo-1606904825846-647eb07f5be2", 1) },
  { name: "Hikvision DS-2CD2143G2-I 4MP Dome", category: "CCTV", type: "percentage", discount: 35, startLabel: "27 May 2026, 08:00 AM", endLabel: "27 May 2026, 10:00 PM", stock: 38, sold: 112, revenue: 386400, image: img("photo-1557597774-9d273bd59043", 2) },
  { name: "KSh 5,000 Shopping Voucher", category: "Vouchers", type: "voucher", discount: 0, startLabel: "26 May 2026, 09:00 AM", endLabel: "27 May 2026, 11:59 PM", stock: 80, sold: 120, revenue: 600000, image: img("photo-1556742049-0cfed4f6a45d", 3) },
  { name: "Dahua IPC-HDW3849H 8MP Turret", category: "CCTV", type: "percentage", discount: 30, startLabel: "28 May 2026, 10:00 AM", endLabel: "28 May 2026, 10:00 PM", stock: 24, sold: 0, revenue: 0, image: img("photo-1585771724684-38269d6639fd", 4) },
  { name: "ZKTeco F18 Fingerprint Terminal", category: "Access Control", type: "percentage", discount: 25, startLabel: "29 May 2026, 09:00 AM", endLabel: "29 May 2026, 09:00 PM", stock: 18, sold: 0, revenue: 0, image: img("photo-1563013544-824ae1b704d3", 5) },
  { name: "NETZA Smart Watch", category: "Gadgets", type: "fixed", discount: 2000, startLabel: "01 Jun 2026, 10:00 AM", endLabel: "01 Jun 2026, 08:00 PM", stock: 40, sold: 0, revenue: 0, image: img("photo-1523275335684-37898b6baf30", 6) },
  { name: "APC Back-UPS 650VA", category: "Power", type: "percentage", discount: 20, startLabel: "03 Jun 2026, 08:00 AM", endLabel: "03 Jun 2026, 08:00 PM", stock: 30, sold: 0, revenue: 0, image: img("photo-1473341304170-971dccb5ac1e", 7) },
  { name: "Cat6 UTP Cable 305m Box", category: "Cabling", type: "percentage", discount: 18, startLabel: "06 Jun 2026, 10:00 AM", endLabel: "06 Jun 2026, 06:00 PM", stock: 50, sold: 0, revenue: 0, image: img("photo-1544197150-b99a5804f08d", 8) },
];

const COMPLETED = [
  ["TP-Link Archer AX55 Wi-Fi 6 Router", "Networking", "percentage", 45, "12 May 2026, 10:00 AM", "12 May 2026, 10:00 PM", 8, 420, 1890000, "photo-1606904825846-647eb07f5be2", 9],
  ["Ubiquiti UniFi 6 Lite Access Point", "Networking", "percentage", 28, "11 May 2026, 09:00 AM", "11 May 2026, 09:00 PM", 4, 310, 1426000, "photo-1544197150-b99a5804f08d", 10],
  ["MikroTik hEX S Gigabit Router", "Networking", "fixed", 1500, "10 May 2026, 08:00 AM", "10 May 2026, 08:00 PM", 6, 265, 980000, "photo-1558494949-ef010cbdcc31", 11],
  ["Hikvision DS-7608NI-K2 8-Channel NVR", "CCTV", "percentage", 22, "09 May 2026, 10:00 AM", "09 May 2026, 10:00 PM", 3, 188, 1124000, "photo-1557597774-9d273bd59043", 12],
  ["Seagate SkyHawk 4TB Surveillance HDD", "CCTV", "percentage", 15, "08 May 2026, 09:00 AM", "08 May 2026, 09:00 PM", 12, 540, 972000, "photo-1531492746076-161ca2bcad58", 13],
  ["280kg Magnetic Lock Kit", "Access Control", "percentage", 35, "07 May 2026, 10:00 AM", "07 May 2026, 08:00 PM", 20, 410, 738000, "photo-1558002038-1055907df827", 14],
  ["TP-Link Deco X20 Mesh 2-Pack", "Networking", "percentage", 32, "06 May 2026, 10:00 AM", "06 May 2026, 10:00 PM", 2, 156, 890000, "photo-1606904825846-647eb07f5be2", 15],
  ["Cisco SG350-10P PoE Switch", "Networking", "percentage", 18, "05 May 2026, 08:00 AM", "05 May 2026, 08:00 PM", 1, 48, 720000, "photo-1518770660439-4636190af475", 16],
  ["Dahua 4MP PTZ Speed Dome", "CCTV", "percentage", 25, "04 May 2026, 09:00 AM", "04 May 2026, 09:00 PM", 2, 72, 1512000, "photo-1558002038-1055907df827", 17],
  ["KSh 2,000 Shopping Voucher", "Vouchers", "voucher", 0, "03 May 2026, 08:00 AM", "03 May 2026, 11:59 PM", 0, 980, 1960000, "photo-1556742049-0cfed4f6a45d", 18],
  ["RFID Proximity Cards — Pack of 50", "Access Control", "percentage", 40, "02 May 2026, 10:00 AM", "02 May 2026, 06:00 PM", 40, 860, 516000, "photo-1586953208448-b95d79e6060e", 19],
  ["Cat6A SFTP Cable 305m Box", "Cabling", "percentage", 20, "01 May 2026, 09:00 AM", "01 May 2026, 09:00 PM", 8, 190, 888000, "photo-1518770660439-4636190af475", 20],
  ["TP-Link TL-SG108 8-Port Switch", "Networking", "percentage", 30, "30 Apr 2026, 10:00 AM", "30 Apr 2026, 08:00 PM", 15, 640, 864000, "photo-1551703599-2a3125d0c2c6", 21],
  ["LC-LC Single-mode Fiber Patch 3m", "Cabling", "fixed", 150, "28 Apr 2026, 08:00 AM", "28 Apr 2026, 08:00 PM", 80, 2100, 546000, "photo-1544197150-b99a5804f08d", 22],
  ["KSh 1,000 Shopping Voucher", "Vouchers", "voucher", 0, "24 Apr 2026, 09:00 AM", "24 Apr 2026, 11:59 PM", 0, 1240, 1240000, "photo-1556742049-0cfed4f6a45d", 23],
  ["NETZA Branded Cap", "Gadgets", "percentage", 50, "20 Apr 2026, 10:00 AM", "20 Apr 2026, 06:00 PM", 25, 996, 199200, "photo-1521369909029-2afed882baee", 24],
];

let catalog = null;
let seq = 0;

function sku(n) {
  return `FD-2026-${String(n).padStart(4, "0")}`;
}

function discountLabel(row) {
  if (row.type === "voucher") return "Voucher";
  if (row.type === "fixed") return `KSh ${Number(row.discount).toLocaleString("en-KE")} OFF`;
  return `${row.discount}% OFF`;
}

function typeLabel(type) {
  if (type === "fixed") return "Fixed Price";
  if (type === "voucher") return "Voucher Drop";
  return "Percentage";
}

function row(spec, index, status, endsAt) {
  const n = index + 1;
  seq = Math.max(seq, n);
  const stock = spec.stock;
  const sold = spec.sold;
  const total = (stock || 0) + (sold || 0) || 1;
  return {
    id: `fd-${n}`,
    n,
    sku: sku(n),
    name: spec.name,
    category: spec.category,
    type: spec.type,
    typeLabel: typeLabel(spec.type),
    discount: spec.discount,
    discountLabel: discountLabel(spec),
    status,
    startLabel: spec.startLabel,
    endLabel: spec.endLabel,
    endsAt: endsAt ? endsAt.toISOString() : null,
    stock,
    sold,
    soldPct: Math.round((sold / total) * 100),
    revenue: spec.revenue,
    image: spec.image,
    description: spec.description || `${spec.name} flash drop on NETZA Kenya.`,
  };
}

function spark(seed) {
  return Array.from({ length: 8 }, (_, i) => 40 + ((seed * (i + 3) * 17) % 55));
}

function buildCatalog() {
  const now = Date.now();
  const rows = [];
  CORE.forEach((item, i) => {
    const status = i < 3 ? "live" : "upcoming";
    const endsAt = status === "live" ? new Date(now + LIVE_REMAINING[i]) : null;
    rows.push(row(item, rows.length, status, endsAt));
  });
  COMPLETED.forEach((item) => {
    const spec = {
      name: item[0],
      category: item[1],
      type: item[2],
      discount: item[3],
      startLabel: item[4],
      endLabel: item[5],
      stock: item[6],
      sold: item[7],
      revenue: item[8],
      image: img(item[9], item[10]),
    };
    rows.push(row(spec, rows.length, "completed", null));
  });
  const soldSum = rows.reduce((s, r) => s + (r.sold || 0), 0);
  const revSum = rows.reduce((s, r) => s + (r.revenue || 0), 0);
  const last = rows[rows.length - 1];
  last.sold += (8642 - soldSum);
  last.revenue += (12485600 - revSum);
  const total = (last.stock || 0) + (last.sold || 0) || 1;
  last.soldPct = Math.round((last.sold / total) * 100);
  return rows;
}

function getCatalog() {
  if (!catalog) catalog = buildCatalog();
  return catalog;
}

function statsOf(rows) {
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "live").length,
    upcoming: rows.filter((r) => r.status === "upcoming").length,
    completed: rows.filter((r) => r.status === "completed").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    sold: rows.reduce((s, r) => s + (r.sold || 0), 0),
    revenue: rows.reduce((s, r) => s + (r.revenue || 0), 0),
  };
}

function widgets() {
  const rows = getCatalog();
  const stats = statsOf(rows);
  const cats = {};
  rows.forEach((r) => { cats[r.category] = (cats[r.category] || 0) + 1; });
  return {
    stats,
    overview: [
      { label: "Active", value: 3, tone: "green" },
      { label: "Upcoming", value: 5, tone: "orange" },
      { label: "Completed", value: 12, tone: "blue" },
      { label: "Items Available", value: 2150, tone: "purple" },
      { label: "Items Sold", value: 3842, tone: "green" },
      { label: "Total Revenue", value: 4205600, tone: "green", money: true },
      { label: "Avg. Discount", value: "23.6%", tone: "orange" },
    ],
    activeDrops: rows.filter((r) => r.status === "live"),
    analytics: [
      { key: "revenue", label: "Revenue", value: 4205600, money: true, hint: "↑ 16.8%", up: true, tone: "green", spark: spark(4) },
      { key: "sold", label: "Items Sold", value: 3842, hint: "↑ 18.3%", up: true, tone: "purple", spark: spark(7) },
      { key: "discount", label: "Avg. Discount", value: "23.6%", hint: "↓ 3.2%", up: false, tone: "orange", spark: spark(2) },
      { key: "conversion", label: "Conversion Rate", value: "11.7%", hint: "↑ 2.9%", up: true, tone: "blue", spark: spark(9) },
    ],
    categories: Object.entries(cats).map(([name, count]) => ({ name, count })),
    participants: [
      { name: "Brian Otieno", drops: 6, spent: 42800 },
      { name: "Faith Wanjiku", drops: 4, spent: 18600 },
      { name: "Daniel Mwangi", drops: 5, spent: 31200 },
      { name: "Alice Chebet", drops: 3, spent: 15400 },
      { name: "Samuel Kariuki", drops: 4, spent: 22100 },
      { name: "Mercy Wanjiku", drops: 2, spent: 9800 },
      { name: "Amina Otieno", drops: 3, spent: 14200 },
      { name: "John Kamau", drops: 2, spent: 7600 },
    ],
    history: rows.filter((r) => r.status === "completed").slice(0, 8).map((r) => ({
      title: r.name,
      detail: `${r.sold} sold · ${r.startLabel}`,
      at: r.endLabel,
    })),
  };
}

function listFlashDrops(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const category = String(query.category || "").trim();
  const type = String(query.type || "").trim().toLowerCase();
  const all = getCatalog().filter((row) => {
    if (q && !`${row.name} ${row.sku} ${row.category}`.toLowerCase().includes(q)) return false;
    if (status && row.status !== status) return false;
    if (category && row.category !== category) return false;
    if (type && row.type !== type) return false;
    return true;
  });
  const skip = (page - 1) * limit;
  const drops = all.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 }));
  return {
    drops,
    flashDrops: drops,
    total: all.length,
    page,
    limit,
    ...widgets(),
  };
}

function upsertDrop(body = {}, dropId) {
  const rows = getCatalog();
  const existing = dropId ? rows.find((r) => r.id === dropId) : null;
  if (dropId && !existing) return null;
  const type = ["percentage", "fixed", "voucher"].includes(body.type)
    ? body.type
    : (existing?.type || "percentage");
  const discount = body.discount != null ? Number(body.discount) : (existing?.discount || 0);
  const status = ["live", "upcoming", "completed", "cancelled"].includes(body.status)
    ? body.status
    : (existing?.status || "upcoming");
  const next = {
    name: body.name != null ? (String(body.name).trim() || existing?.name || "Untitled drop") : (existing?.name || "Untitled drop"),
    category: body.category || existing?.category || "Networking",
    type,
    typeLabel: typeLabel(type),
    discount,
    discountLabel: discountLabel({ type, discount }),
    status,
    startLabel: body.startLabel || existing?.startLabel || "",
    endLabel: body.endLabel || existing?.endLabel || "",
    endsAt: body.endsAtIso || existing?.endsAt || (status === "live" && !existing ? new Date(Date.now() + 2 * 3600 * 1000).toISOString() : existing?.endsAt || null),
    stock: body.stock != null ? Math.max(0, Number(body.stock)) : (existing?.stock || 0),
    sold: body.sold != null ? Math.max(0, Number(body.sold)) : (existing?.sold || 0),
    revenue: body.revenue != null ? Math.max(0, Number(body.revenue)) : (existing?.revenue || 0),
    image: body.image || existing?.image || img("photo-1606904825846-647eb07f5be2", Date.now() % 99),
    description: body.description != null ? String(body.description) : (existing?.description || ""),
    originalKes: body.originalKes != null ? Number(body.originalKes) : (existing?.originalKes || 0),
    flashKes: body.flashKes != null ? Number(body.flashKes) : (existing?.flashKes || 0),
    maxQty: body.maxQty != null ? Number(body.maxQty) : (existing?.maxQty || 1),
    reserved: body.reserved != null ? Number(body.reserved) : (existing?.reserved || 0),
    productSku: body.productSku || existing?.productSku || "",
    productName: body.productName || existing?.productName || "",
    productId: body.productId || existing?.productId || "",
    showCountdown: body.showCountdown != null ? Boolean(body.showCountdown) : (existing?.showCountdown !== false),
    allowBackorders: body.allowBackorders != null ? Boolean(body.allowBackorders) : (existing?.allowBackorders !== false),
    requirePoints: body.requirePoints != null ? Boolean(body.requirePoints) : Boolean(existing?.requirePoints),
    notify: body.notify != null ? Boolean(body.notify) : (existing?.notify !== false),
    bonusPoints: body.bonusPoints != null ? Number(body.bonusPoints) : (existing?.bonusPoints || 0),
    tags: Array.isArray(body.tags) ? body.tags : (existing?.tags || []),
    isDraft: body.isDraft != null ? Boolean(body.isDraft) : Boolean(existing?.isDraft),
  };
  const total = (next.stock || 0) + (next.sold || 0) || 1;
  next.soldPct = Math.round((next.sold / total) * 100);
  if (dropId) {
    const idx = rows.findIndex((r) => r.id === dropId);
    rows[idx] = { ...existing, ...next };
    return rows[idx];
  }
  seq += 1;
  const created = { id: `fd-${seq}`, sku: sku(seq), n: 1, ...next };
  rows.unshift(created);
  return created;
}

function removeDrop(dropId) {
  const rows = getCatalog();
  const idx = rows.findIndex((r) => r.id === dropId);
  if (idx < 0) return false;
  rows.splice(idx, 1);
  return true;
}

function duplicateDrop(dropId) {
  const src = getCatalog().find((r) => r.id === dropId);
  if (!src) return null;
  return upsertDrop({ ...src, name: `${src.name} (copy)`, status: "upcoming", sold: 0, revenue: 0 });
}

function getDrop(dropId) {
  return getCatalog().find((r) => r.id === dropId) || null;
}

module.exports = {
  listFlashDrops,
  upsertDrop,
  removeDrop,
  duplicateDrop,
  getDrop,
};
