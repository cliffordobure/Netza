const CORE = [
  { name: "Networking", description: "Routers, switches and network infrastructure.", products: 3, activeDrops: 1, completed: 1, avgDiscount: 32.6, status: "active", ico: "box", tone: "purple" },
  { name: "CCTV", description: "Cameras, NVRs and surveillance kits.", products: 2, activeDrops: 1, completed: 1, avgDiscount: 31.4, status: "active", ico: "eye", tone: "blue" },
  { name: "Wi-Fi", description: "Access points, mesh kits and wireless gear.", products: 1, activeDrops: 1, completed: 0, avgDiscount: 27.8, status: "active", ico: "bolt", tone: "orange" },
];

const RULES = {
  Networking: { maxDiscount: 60, minStock: 5, eligible: true, backorders: false, requirePoints: false, maxDrops: 5 },
  CCTV: { maxDiscount: 50, minStock: 4, eligible: true, backorders: false, requirePoints: false, maxDrops: 4 },
  "Wi-Fi": { maxDiscount: 45, minStock: 6, eligible: true, backorders: true, requirePoints: false, maxDrops: 4 },
};

const DEFAULT_RULES = { maxDiscount: 40, minStock: 5, eligible: true, backorders: false, requirePoints: false, maxDrops: 3 };

const PERFORMANCE = [
  { name: "Networking", drops: 1, sold: 2, revenue: 234000, avgDiscount: 32.6, conversion: 14.8 },
  { name: "CCTV", drops: 1, sold: 1, revenue: 386400, avgDiscount: 31.4, conversion: 12.1 },
  { name: "Wi-Fi", drops: 1, sold: 0, revenue: 0, avgDiscount: 27.8, conversion: 10.4 },
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
  const seed = all.length === 3;
  return {
    total: all.length,
    active: seed ? 3 : active,
    activePct: seed ? 100 : (all.length ? Math.round((active / all.length) * 1000) / 10 : 0),
    products,
    activeDrops,
    popular: "Networking",
    popularPct: 50,
  };
}

function distribution(all) {
  const named = ["Networking", "CCTV", "Wi-Fi"];
  const colors = ["#6D28D9", "#2563eb", "#ea580c"];
  const total = all.reduce((s, r) => s + (r.products || 0), 0) || 1;
  const parts = named.map((name, i) => {
    const row = all.find((r) => r.name === name);
    const value = row?.products || 0;
    return { key: name, name, value, pct: Math.round((value / total) * 1000) / 10, color: colors[i] };
  });
  return parts;
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
