const TYPE_META = {
  voucher: { label: "Voucher", category: "Vouchers" },
  product: { label: "Product", category: "Networking" },
  points: { label: "Points", category: "NETZA Points" },
  cash: { label: "Cash", category: "Cash Rewards" },
};

const CORE = [
  { name: "KSh 10,000 Voucher", type: "voucher", category: "Vouchers", value: 10000, qty: 50, available: 42, status: "active", description: "KSh 10,000 discount voucher for any NETZA order." },
  { name: "TP-Link Archer C6 Router", type: "product", category: "Networking", value: 13000, qty: 20, available: 15, status: "active", description: "AC1200 dual-band Wi-Fi router for home and office." },
  { name: "10,000 NETZA Points", type: "points", category: "NETZA Points", value: 10000, qty: null, available: null, status: "active", description: "10,000 NETZA Points credited to the winner's account." },
  { name: "Dahua IPC-HFW1431S Camera", type: "product", category: "CCTV", value: 8500, qty: 12, available: 9, status: "active", description: "4MP bullet IP camera with IR night vision." },
  { name: "NETZA Smart Watch", type: "product", category: "Wearables", value: 7200, qty: 10, available: 6, status: "active", description: "Branded smart watch with fitness tracking." },
  { name: "KSh 5,000 Voucher", type: "voucher", category: "Vouchers", value: 5000, qty: 80, available: 61, status: "active", description: "KSh 5,000 voucher for networking and CCTV products." },
  { name: "5,000 NETZA Points", type: "points", category: "NETZA Points", value: 5000, qty: null, available: null, status: "active", description: "5,000 NETZA Points credited instantly." },
  { name: "Hikvision DS-2CD2143 Camera", type: "product", category: "CCTV", value: 9800, qty: 8, available: 3, status: "active", description: "4MP dome camera for indoor monitoring." },
];

const EXTRA_VOUCHERS = [
  ["KSh 2,000 Voucher", 2000, 120, 94],
  ["KSh 1,000 Voucher", 1000, 200, 168],
  ["KSh 500 Voucher", 500, 250, 201],
  ["KSh 15,000 Voucher", 15000, 12, 7],
  ["KSh 20,000 Voucher", 20000, 6, 4],
  ["KSh 3,000 Voucher", 3000, 40, 28],
  ["KSh 250 Voucher", 250, 300, 240],
  ["KSh 4,000 Voucher", 4000, 24, 18],
  ["KSh 750 Voucher", 750, 90, 71],
];

const EXTRA_PRODUCTS = [
  ["Ubiquiti UniFi AP AC Lite", "Networking", 14500, 15, 11],
  ["MikroTik hEX Router", "Networking", 6200, 18, 12],
  ["Cat 6 Cable Drum 305m", "Cabling", 9800, 22, 16],
  ["Hikvision NVR 8-Channel", "CCTV", 18500, 7, 4],
  ["APC Back-UPS 650VA", "Power", 11200, 14, 9],
  ["ZKTeco F18 Access Reader", "Access Control", 16800, 9, 5],
  ["TP-Link Deco M4 Mesh (3-pack)", "Networking", 15900, 11, 8],
  ["Dahua XVR 16-Channel", "CCTV", 14200, 6, 2],
  ["NETZA Branded Cap", "General", 800, 100, 74],
  ["Samsung 1TB SSD", "General", 9800, 10, 6],
  ["TP-Link Archer C80 Router", "Networking", 8900, 16, 10],
  ["Hikvision 4MP Turret Camera", "CCTV", 7600, 20, 13],
  ["CDVI Access Controller", "Access Control", 21000, 5, 2],
  ["CyberPower UPS 1200VA", "Power", 17500, 8, 5],
];

const EXTRA_POINTS = [
  [500, 500], [1000, 1000], [2000, 2000], [2500, 2500], [3000, 3000],
  [7500, 7500], [15000, 15000], [20000, 20000], [250, 250], [8000, 8000],
  [12000, 12000], [4000, 4000], [600, 600], [1500, 1500],
];

let catalog = null;
let seq = 0;

function sku(n) {
  return `PRZ-${String(1000 + n).padStart(4, "0")}`;
}

function row(spec, index, status) {
  const unlimited = spec.qty == null;
  seq = Math.max(seq, index + 1);
  return {
    id: `prz-${index + 1}`,
    sku: sku(index + 1),
    name: spec.name,
    type: spec.type,
    category: spec.category,
    value: spec.value,
    qty: unlimited ? null : spec.qty,
    available: unlimited ? null : spec.available,
    unlimited,
    status,
    description: spec.description || "",
    allCompetitions: true,
    trackStock: !unlimited,
  };
}

function buildCatalog() {
  seq = 0;
  const rows = [];
  CORE.forEach((item) => rows.push(row(item, rows.length, "active")));
  EXTRA_VOUCHERS.forEach(([name, value, qty, available], i) => {
    rows.push(row({
      name,
      type: "voucher",
      category: "Vouchers",
      value,
      qty,
      available,
      description: `${name} for NETZA checkout.`,
    }, rows.length, i < 6 ? "active" : "inactive"));
  });
  EXTRA_PRODUCTS.forEach(([name, category, value, qty, available], i) => {
    rows.push(row({
      name,
      type: "product",
      category,
      value,
      qty,
      available,
      description: `${name} awarded as a physical prize.`,
    }, rows.length, i < 8 ? "active" : "inactive"));
  });
  EXTRA_POINTS.forEach(([points, value], i) => {
    const name = `${Number(points).toLocaleString("en-KE")} NETZA Points`;
    rows.push(row({
      name,
      type: "points",
      category: "NETZA Points",
      value,
      qty: null,
      available: null,
      description: `${name} credited instantly.`,
    }, rows.length, i < 6 ? "active" : "inactive"));
  });
  const sum = rows.reduce((s, r) => s + (r.value || 0), 0);
  const lastProduct = [...rows].reverse().find((r) => r.type === "product");
  if (lastProduct) lastProduct.value += (512000 - sum);
  return rows;
}

function getCatalog() {
  if (!catalog) catalog = buildCatalog();
  return catalog;
}

function statsOf(rows) {
  const total = rows.length;
  const active = rows.filter((r) => r.status === "active").length;
  const product = rows.filter((r) => r.type === "product").length;
  const points = rows.filter((r) => r.type === "points").length;
  const voucher = rows.filter((r) => r.type === "voucher").length;
  const value = rows.reduce((s, r) => s + (r.value || 0), 0);
  return {
    total,
    active,
    physical: product,
    points,
    voucher,
    value,
  };
}

function widgets() {
  const rows = getCatalog();
  return {
    stats: statsOf(rows),
    tiers: [
      { tier: "1st Prize", minRank: "1", maxWinners: 1, prizes: "KSh 10,000 Voucher + 5,000 Points", value: 15000 },
      { tier: "2nd Prize", minRank: "2", maxWinners: 1, prizes: "TP-Link Archer C6 + 10,000 Points", value: 13000 },
      { tier: "3rd Prize", minRank: "3", maxWinners: 1, prizes: "KSh 5,000 Voucher + 2,000 Points", value: 7000 },
      { tier: "4–9 Consolation", minRank: "4–9", maxWinners: 6, prizes: "KSh 2,000 Voucher + 1,000 Points", value: 18000 },
      { tier: "10–20 Participant", minRank: "10–20", maxWinners: 11, prizes: "500 NETZA Points", value: 0 },
    ],
    types: [
      { key: "voucher", label: "Vouchers", count: statsOf(rows).voucher, icon: "gift" },
      { key: "product", label: "Products", count: statsOf(rows).physical, icon: "bag" },
      { key: "points", label: "NETZA Points", count: statsOf(rows).points, icon: "star" },
      { key: "cash", label: "Cash Rewards", count: rows.filter((r) => r.type === "cash").length, icon: "receipt" },
    ],
    categories: [
      { name: "Vouchers", count: rows.filter((r) => r.category === "Vouchers").length },
      { name: "Networking", count: rows.filter((r) => r.category === "Networking").length },
      { name: "CCTV", count: rows.filter((r) => r.category === "CCTV").length },
      { name: "Wearables", count: rows.filter((r) => r.category === "Wearables").length },
      { name: "NETZA Points", count: rows.filter((r) => r.category === "NETZA Points").length },
      { name: "Access Control", count: rows.filter((r) => r.category === "Access Control").length },
      { name: "Cabling", count: rows.filter((r) => r.category === "Cabling").length },
      { name: "Power", count: rows.filter((r) => r.category === "Power").length },
      { name: "General", count: rows.filter((r) => r.category === "General").length },
    ],
    rules: [
      { title: "Stock tracking", detail: "Physical prizes are tracked by quantity and must be in stock before assignment." },
      { title: "Point prizes", detail: "Point prizes can be unlimited and are credited instantly to the winner." },
      { title: "Inactive prizes", detail: "Inactive prizes cannot be assigned to new competitions." },
      { title: "Live competitions", detail: "Changes to prizes do not affect ongoing competitions or prizes already awarded." },
      { title: "Reporting", detail: "Prize value in reports uses the configured KSh value, including points prizes." },
    ],
    activity: [
      { title: "TP-Link Archer C6 Router", detail: "Quantity updated: 20 → 25", at: "25 May 2026 04:12 PM" },
      { title: "KSh 10,000 Voucher", detail: "Added to prize library", at: "24 May 2026 11:40 AM" },
      { title: "10,000 NETZA Points", detail: "Status set to Active", at: "23 May 2026 02:18 PM" },
      { title: "Dahua IPC-HFW1431S Camera", detail: "Available stock updated: 12 → 9", at: "22 May 2026 09:05 AM" },
      { title: "NETZA Smart Watch", detail: "Value updated: KSh 6,800 → KSh 7,200", at: "21 May 2026 03:44 PM" },
      { title: "KSh 5,000 Voucher", detail: "Marked available for all competitions", at: "20 May 2026 10:20 AM" },
    ],
    notes: [
      "Physical prizes are tracked by quantity.",
      "Changes to prizes do not affect ongoing competitions.",
      "Inactive prizes cannot be assigned to new competitions.",
      "Point prizes default to unlimited quantity.",
    ],
  };
}

function listCompetitionPrizes(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 8)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const type = String(query.type || "").trim().toLowerCase();
  const all = getCatalog().filter((row) => {
    if (q && !`${row.name} ${row.sku} ${row.category}`.toLowerCase().includes(q)) return false;
    if (status && row.status !== status) return false;
    if (type && row.type !== type) return false;
    return true;
  });
  const skip = (page - 1) * limit;
  return {
    prizes: all.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 })),
    total: all.length,
    page,
    limit,
    ...widgets(),
  };
}

function upsertPrize(body = {}, prizeId) {
  const rows = getCatalog();
  const type = ["voucher", "product", "points", "cash"].includes(body.type) ? body.type : "voucher";
  const unlimited = Boolean(body.unlimited) || body.qty === "" || (type === "points" && (body.qty == null || body.qty === ""));
  const qty = unlimited ? null : Math.max(0, Number(body.qty || 0));
  const next = {
    name: String(body.name || "").trim() || "Untitled prize",
    type,
    category: String(body.category || TYPE_META[type].category),
    value: Math.max(0, Number(body.value || 0)),
    qty,
    unlimited,
    status: body.status === "inactive" ? "inactive" : "active",
    description: String(body.description || ""),
    allCompetitions: body.allCompetitions !== false,
    trackStock: unlimited ? false : body.trackStock !== false,
  };
  if (prizeId) {
    const idx = rows.findIndex((r) => r.id === prizeId);
    if (idx < 0) return null;
    const prev = rows[idx];
    let available = null;
    if (!unlimited) {
      if (body.available != null) available = Math.min(qty, Number(body.available));
      else if (prev.available != null) available = Math.min(qty, prev.available);
      else available = qty;
    }
    rows[idx] = { ...prev, ...next, available };
    return rows[idx];
  }
  next.available = unlimited ? null : Math.min(qty, Number(body.available != null ? body.available : qty));
  seq += 1;
  const created = {
    id: `prz-${seq}`,
    sku: sku(seq),
    ...next,
  };
  rows.unshift(created);
  return created;
}

function removePrize(prizeId) {
  const rows = getCatalog();
  const idx = rows.findIndex((r) => r.id === prizeId);
  if (idx < 0) return false;
  rows.splice(idx, 1);
  return true;
}

function duplicatePrize(prizeId) {
  const rows = getCatalog();
  const src = rows.find((r) => r.id === prizeId);
  if (!src) return null;
  return upsertPrize({ ...src, name: `${src.name} (copy)` });
}

module.exports = {
  listCompetitionPrizes,
  upsertPrize,
  removePrize,
  duplicatePrize,
};
