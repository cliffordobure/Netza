const CORE = [
  { name: "Networking", description: "Routers, switches and network infrastructure.", products: 72, activeDrops: 3, completed: 18, avgDiscount: 32.6, status: "active", ico: "box", tone: "purple" },
  { name: "CCTV", description: "Cameras, NVRs and surveillance kits.", products: 58, activeDrops: 2, completed: 15, avgDiscount: 31.4, status: "active", ico: "eye", tone: "blue" },
  { name: "Wi-Fi", description: "Access points, mesh kits and wireless gear.", products: 28, activeDrops: 1, completed: 12, avgDiscount: 27.8, status: "active", ico: "bolt", tone: "orange" },
  { name: "Access Control", description: "Readers, locks and attendance terminals.", products: 19, activeDrops: 1, completed: 8, avgDiscount: 28.2, status: "active", ico: "gear", tone: "indigo" },
  { name: "Cables & Accessories", description: "Copper, fibre and installation accessories.", products: 32, activeDrops: 1, completed: 10, avgDiscount: 26.1, status: "active", ico: "tag", tone: "green" },
  { name: "Servers", description: "NAS, racks and compute hardware.", products: 9, activeDrops: 0, completed: 5, avgDiscount: 24.5, status: "active", ico: "box", tone: "blue" },
  { name: "Power Equipment", description: "UPS, PDUs and backup power.", products: 16, activeDrops: 0, completed: 6, avgDiscount: 23.7, status: "active", ico: "bolt", tone: "gold" },
  { name: "Tools", description: "Crimpers, testers and install tools.", products: 11, activeDrops: 0, completed: 4, avgDiscount: 20.9, status: "active", ico: "gear", tone: "orange" },
  { name: "Monitors & Displays", description: "Screens for control rooms and desks.", products: 7, activeDrops: 0, completed: 3, avgDiscount: 22.3, status: "inactive", ico: "eye", tone: "purple" },
  { name: "Storage", description: "Surveillance HDDs and SSDs.", products: 4, activeDrops: 0, completed: 2, avgDiscount: 19.8, status: "inactive", ico: "bag", tone: "blue" },
  { name: "Miscellaneous", description: "General and uncategorised drop items.", products: 0, activeDrops: 0, completed: 0, avgDiscount: 0, status: "inactive", ico: "tag", tone: "orange" },
  { name: "Archived Category", description: "Retired category kept for history.", products: 0, activeDrops: 0, completed: 0, avgDiscount: 0, status: "inactive", ico: "folder", tone: "purple" },
];

const RULES = {
  Networking: { maxDiscount: 60, minStock: 5, eligible: true, backorders: false, requirePoints: false, maxDrops: 5 },
  CCTV: { maxDiscount: 50, minStock: 4, eligible: true, backorders: false, requirePoints: false, maxDrops: 4 },
  "Wi-Fi": { maxDiscount: 45, minStock: 6, eligible: true, backorders: true, requirePoints: false, maxDrops: 4 },
  "Access Control": { maxDiscount: 40, minStock: 3, eligible: true, backorders: false, requirePoints: false, maxDrops: 3 },
  "Cables & Accessories": { maxDiscount: 35, minStock: 8, eligible: true, backorders: true, requirePoints: false, maxDrops: 6 },
};

const DEFAULT_RULES = { maxDiscount: 40, minStock: 5, eligible: true, backorders: false, requirePoints: false, maxDrops: 3 };

const PERFORMANCE = [
  { name: "Networking", drops: 18, sold: 1256, revenue: 2854600, avgDiscount: 32.6, conversion: 14.8 },
  { name: "CCTV", drops: 15, sold: 892, revenue: 1924000, avgDiscount: 31.4, conversion: 12.1 },
  { name: "Wi-Fi", drops: 12, sold: 410, revenue: 888000, avgDiscount: 27.8, conversion: 10.4 },
  { name: "Access Control", drops: 8, sold: 265, revenue: 516000, avgDiscount: 28.2, conversion: 9.2 },
  { name: "Cables & Accessories", drops: 10, sold: 388, revenue: 720000, avgDiscount: 26.1, conversion: 8.6 },
];

let rows = null;
let seq = 0;

function build() {
  seq = 0;
  return CORE.map((spec, i) => {
    seq = i + 1;
    return { id: `fdc-${i + 1}`, n: i + 1, order: i + 1, ...spec };
  });
}

function getRows() {
  if (!rows) rows = build();
  return rows;
}

function statsOf(all) {
  const active = all.filter((r) => r.status === "active").length;
  const products = all.reduce((s, r) => s + (r.products || 0), 0);
  const activeDrops = all.reduce((s, r) => s + (r.activeDrops || 0), 0);
  const seed = all.length === 12;
  return {
    total: all.length,
    active: seed ? 10 : active,
    activePct: seed ? 83.3 : (all.length ? Math.round((active / all.length) * 1000) / 10 : 0),
    products,
    activeDrops,
    popular: "Networking",
    popularPct: 42,
  };
}

function distribution(all) {
  const named = ["Networking", "CCTV", "Wi-Fi", "Access Control", "Cables & Accessories"];
  const colors = ["#6D28D9", "#2563eb", "#ea580c", "#4f46e5", "#16a34a", "#94a3b8"];
  const total = all.reduce((s, r) => s + (r.products || 0), 0) || 1;
  const parts = named.map((name, i) => {
    const row = all.find((r) => r.name === name);
    const value = row?.products || 0;
    return { key: name, name, value, pct: Math.round((value / total) * 1000) / 10, color: colors[i] };
  });
  const others = all.filter((r) => !named.includes(r.name)).reduce((s, r) => s + (r.products || 0), 0);
  parts.push({ key: "Others", name: "Others", value: others, pct: Math.round((others / total) * 1000) / 10, color: colors[5] });
  const listed = [
    { name: "Networking", pct: 28.1, value: 72 },
    { name: "CCTV", pct: 22.7, value: 58 },
    { name: "Wi-Fi", pct: 10.9, value: 28 },
    { name: "Access Control", pct: 7.4, value: 19 },
    { name: "Cables & Accessories", pct: 12.5, value: 32 },
    { name: "Others", pct: 18.4, value: 47 },
  ];
  return listed.map((item, i) => ({ ...parts[i], ...item, color: colors[i] }));
}

function listDropCategories(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 12)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const all = getRows().filter((row) => {
    if (q && !`${row.name} ${row.description}`.toLowerCase().includes(q)) return false;
    if (status && row.status !== status) return false;
    return true;
  }).sort((a, b) => a.order - b.order);
  const skip = (page - 1) * limit;
  const stats = statsOf(getRows());
  return {
    categories: all.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 })),
    total: all.length,
    page,
    limit,
    stats,
    rules: RULES,
    defaultRules: DEFAULT_RULES,
    performance: PERFORMANCE,
    distribution: distribution(getRows()),
  };
}

function upsertCategory(body = {}, catId) {
  const list = getRows();
  const existing = catId ? list.find((r) => r.id === catId) : null;
  if (catId && !existing) return null;
  const next = {
    name: body.name != null ? String(body.name).trim() : (existing?.name || "New category"),
    description: body.description != null ? String(body.description) : (existing?.description || ""),
    products: body.products != null ? Number(body.products) : (existing?.products || 0),
    activeDrops: body.activeDrops != null ? Number(body.activeDrops) : (existing?.activeDrops || 0),
    completed: body.completed != null ? Number(body.completed) : (existing?.completed || 0),
    avgDiscount: body.avgDiscount != null ? Number(body.avgDiscount) : (existing?.avgDiscount || 0),
    status: ["active", "inactive"].includes(body.status) ? body.status : (existing?.status || "active"),
    ico: body.ico || existing?.ico || "folder",
    tone: body.tone || existing?.tone || "purple",
  };
  if (existing) {
    const idx = list.findIndex((r) => r.id === catId);
    list[idx] = { ...existing, ...next };
    return list[idx];
  }
  seq += 1;
  const created = { id: `fdc-${seq}`, n: 1, order: 0, ...next };
  list.unshift(created);
  list.forEach((r, i) => { r.order = i + 1; });
  return created;
}

function removeCategory(catId) {
  const list = getRows();
  const idx = list.findIndex((r) => r.id === catId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  list.forEach((r, i) => { r.order = i + 1; });
  return true;
}

function duplicateCategory(catId) {
  const src = getRows().find((r) => r.id === catId);
  if (!src) return null;
  return upsertCategory({ ...src, name: `${src.name} (copy)`, status: "inactive", products: 0, activeDrops: 0 });
}

function reorderCategories(ids = []) {
  const list = getRows();
  if (!Array.isArray(ids) || !ids.length) return list;
  const map = new Map(list.map((r) => [r.id, r]));
  const next = [];
  ids.forEach((id) => {
    const row = map.get(id);
    if (row) next.push(row);
  });
  list.forEach((r) => { if (!ids.includes(r.id)) next.push(r); });
  rows = next.map((r, i) => ({ ...r, order: i + 1, n: i + 1 }));
  return rows;
}

function saveRules(category, patch = {}) {
  const current = RULES[category] || { ...DEFAULT_RULES };
  RULES[category] = { ...current, ...patch };
  return RULES[category];
}

module.exports = {
  listDropCategories,
  upsertCategory,
  removeCategory,
  duplicateCategory,
  reorderCategories,
  saveRules,
};
