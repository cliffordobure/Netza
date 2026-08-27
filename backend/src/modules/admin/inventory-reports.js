const productImg = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const CATEGORIES = [
  "Electronics",
  "Home & Kitchen",
  "Fashion",
  "Beauty & Health",
  "Sports & Outdoors",
  "Others",
];

const BRANDS = ["Oraimo", "Samsung", "Nike", "Nivea", "Generic", "Sony"];

const WAREHOUSES = [
  "Nairobi Central",
  "Westlands Hub",
  "Mombasa Depot",
  "Kisumu Store",
  "Nakuru Warehouse",
];

const STATUSES = [
  { key: "in_stock", label: "In Stock", color: "#16a34a" },
  { key: "low_stock", label: "Low Stock", color: "#eab308" },
  { key: "out_of_stock", label: "Out of Stock", color: "#dc2626" },
  { key: "discontinued", label: "Discontinued", color: "#2563eb" },
];

const SEED = [
  {
    name: "Oraimo FreePods 3",
    sku: "ORA-FP3",
    category: "Electronics",
    brand: "Oraimo",
    warehouse: "Nairobi Central",
    stock: 5,
    reorderLevel: 20,
    status: "low_stock",
    value: 12500,
  },
  {
    name: "Samsung Galaxy Buds FE",
    sku: "SAM-GBFE",
    category: "Electronics",
    brand: "Samsung",
    warehouse: "Westlands Hub",
    stock: 8,
    reorderLevel: 25,
    status: "low_stock",
    value: 18400,
  },
  {
    name: "Nivea Soft Cream 200ml",
    sku: "NIV-SOFT200",
    category: "Beauty & Health",
    brand: "Nivea",
    warehouse: "Nairobi Central",
    stock: 12,
    reorderLevel: 40,
    status: "low_stock",
    value: 3600,
  },
  {
    name: "Nike Dri-FIT Tee",
    sku: "NKE-DFT-M",
    category: "Fashion",
    brand: "Nike",
    warehouse: "Mombasa Depot",
    stock: 6,
    reorderLevel: 30,
    status: "low_stock",
    value: 9600,
  },
  {
    name: "Non-Stick Frying Pan 28cm",
    sku: "HK-PAN28",
    category: "Home & Kitchen",
    brand: "Generic",
    warehouse: "Kisumu Store",
    stock: 4,
    reorderLevel: 15,
    status: "low_stock",
    value: 4800,
  },
];

function buildRows() {
  return SEED.map((row, i) => {
    const st = STATUSES.find((s) => s.key === row.status);
    return {
      id: `invr${i + 1}`,
      n: i + 1,
      name: row.name,
      sku: row.sku,
      category: row.category,
      brand: row.brand,
      warehouse: row.warehouse,
      stock: row.stock,
      reorderLevel: row.reorderLevel,
      status: row.status,
      statusLabel: st.label,
      value: row.value,
      image: productImg(row.name, i + 1200),
    };
  });
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }
  if (query.category) list = list.filter((r) => r.category === query.category);
  if (query.brand) list = list.filter((r) => r.brand === query.brand);
  if (query.warehouse) list = list.filter((r) => r.warehouse === query.warehouse);
  if (query.status) list = list.filter((r) => r.status === query.status);
  return list;
}

function getInventoryReports(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 5));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const total = 412;
  const skip = (page - 1) * limit;
  const products = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      totalProducts: 2856,
      totalProductsDelta: 8.4,
      totalProductsHint: "vs last month",
      inStock: 1985,
      inStockDelta: 6.7,
      inStockHint: "vs last month",
      lowStock: 412,
      lowStockDelta: 12.3,
      lowStockHint: "vs last month",
      outOfStock: 87,
      outOfStockDelta: -5.6,
      outOfStockHint: "vs last month",
      stockValue: 8745650,
      stockValueDelta: 11.9,
      stockValueHint: "vs last month",
    },
    products,
    valueOverTime: {
      labels: ["01 May", "07 May", "14 May", "21 May", "27 May"],
      values: [7200000, 7550000, 7980000, 8320000, 8745650],
    },
    statusDonut: [
      { key: "in_stock", name: "In Stock", value: 1985, color: "#16a34a", pct: 69.5 },
      { key: "low_stock", name: "Low Stock", value: 412, color: "#eab308", pct: 14.4 },
      { key: "out_of_stock", name: "Out of Stock", value: 87, color: "#dc2626", pct: 3.1 },
      { key: "discontinued", name: "Discontinued", value: 372, color: "#2563eb", pct: 13.0 },
    ],
    categories: [
      { key: "electronics", name: "Electronics", pct: 32.5 },
      { key: "home", name: "Home & Kitchen", pct: 22.3 },
      { key: "fashion", name: "Fashion", pct: 17.5 },
      { key: "beauty", name: "Beauty & Health", pct: 14.3 },
      { key: "sports", name: "Sports & Outdoors", pct: 7.1 },
      { key: "others", name: "Others", pct: 6.3 },
    ],
    summary: [
      { key: "total", label: "Total Products", value: 2856, kind: "number" },
      { key: "in", label: "In Stock", value: 1985, kind: "number" },
      { key: "low", label: "Low Stock", value: 412, kind: "number" },
      { key: "out", label: "Out of Stock", value: 87, kind: "number" },
      { key: "value", label: "Total Stock Value (KES)", value: 8745650, kind: "money" },
      { key: "avg", label: "Average Stock Value per Product", value: 3066, kind: "money" },
    ],
    insights: [
      { key: "i1", icon: "trend", text: "Stock value increased by 11.9% compared to last month." },
      { key: "i2", icon: "warning", text: "412 products are currently below reorder level." },
      { key: "i3", icon: "xCircle", text: "87 products are out of stock and need restocking." },
      { key: "i4", icon: "box", text: "Electronics holds the highest stock value share (32.5%)." },
      { key: "i5", icon: "pin", text: "Nairobi Central holds 58.3% of total stock value." },
    ],
    filters: {
      categories: CATEGORIES,
      brands: BRANDS,
      warehouses: WAREHOUSES,
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
    },
  };
}

module.exports = { getInventoryReports };
