const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80&sig=${sig}`;

const DEMO_PRODUCTS = [
  {
    id: "pc1",
    name: "Samsung Galaxy A54 5G",
    sub: "Smartphones · Electronics",
    sku: "SAM-A54-5G",
    category: "Electronics",
    priceKes: 42999,
    stock: 128,
    isActive: true,
    stockStatus: "in",
    createdAt: "2026-03-12T08:00:00.000Z",
    createdLabel: "12 Mar 2026",
    image: img("photo-1610945265064-0e34e5519bbf", 1),
    sales: 1245,
  },
  {
    id: "pc2",
    name: "HP Pavilion 15 Laptop",
    sub: "Laptops · Electronics",
    sku: "HP-PAV-15",
    category: "Electronics",
    priceKes: 89999,
    stock: 42,
    isActive: true,
    stockStatus: "in",
    createdAt: "2026-02-28T08:00:00.000Z",
    createdLabel: "28 Feb 2026",
    image: img("photo-1496181133206-80ce9b88a853", 2),
    sales: 892,
  },
  {
    id: "pc3",
    name: "Sony WH-CH520 Headphones",
    sub: "Audio · Electronics",
    sku: "SNY-CH520",
    category: "Electronics",
    priceKes: 6499,
    stock: 8,
    isActive: true,
    stockStatus: "low",
    createdAt: "2026-04-05T08:00:00.000Z",
    createdLabel: "05 Apr 2026",
    image: img("photo-1505740420928-5e560c06d30e", 3),
    sales: 756,
  },
  {
    id: "pc4",
    name: "Nike Air Max 270",
    sub: "Footwear · Fashion",
    sku: "NK-AM270",
    category: "Fashion",
    priceKes: 15999,
    stock: 64,
    isActive: true,
    stockStatus: "in",
    createdAt: "2026-01-18T08:00:00.000Z",
    createdLabel: "18 Jan 2026",
    image: img("photo-1542291026-7eec264c27ff", 4),
    sales: 634,
  },
  {
    id: "pc5",
    name: "Ariel Washing Powder 2kg",
    sub: "Household · Supermarket",
    sku: "ARL-WP-2KG",
    category: "Supermarket",
    priceKes: 899,
    stock: 0,
    isActive: false,
    stockStatus: "out",
    createdAt: "2025-11-02T08:00:00.000Z",
    createdLabel: "02 Nov 2025",
    image: img("photo-1585421514284-efb74c2d69c6", 5),
    sales: 512,
  },
  {
    id: "pc6",
    name: "Top Fry Cooking Oil 2L",
    sub: "Cooking · Supermarket",
    sku: "TF-OIL-2L",
    category: "Supermarket",
    priceKes: 549,
    stock: 210,
    isActive: true,
    stockStatus: "in",
    createdAt: "2026-05-01T08:00:00.000Z",
    createdLabel: "01 May 2026",
    image: img("photo-1474979266404-7eaacbcd87c5", 6),
    sales: 489,
  },
  {
    id: "pc7",
    name: "Brookside Milk 1L",
    sub: "Dairy · Supermarket",
    sku: "BS-MILK-1L",
    category: "Supermarket",
    priceKes: 145,
    stock: 6,
    isActive: true,
    stockStatus: "low",
    createdAt: "2026-04-22T08:00:00.000Z",
    createdLabel: "22 Apr 2026",
    image: img("photo-1563636619-e9143da7973b", 7),
    sales: 421,
  },
];

const CATEGORIES = [
  "All Categories",
  "Electronics",
  "Supermarket",
  "Fashion",
  "Home & Living",
  "Beauty",
  "Sports",
];

const BRANDS = [
  "All Brands",
  "Samsung",
  "HP",
  "Sony",
  "Nike",
  "Unilever",
  "Brookside",
];

function filterProducts(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }
  if (query.category && query.category !== "all") {
    list = list.filter((p) => p.category.toLowerCase() === query.category.toLowerCase());
  }
  if (query.status === "active") list = list.filter((p) => p.isActive);
  if (query.status === "inactive") list = list.filter((p) => !p.isActive);
  if (query.stock === "in") list = list.filter((p) => p.stockStatus === "in");
  if (query.stock === "low") list = list.filter((p) => p.stockStatus === "low");
  if (query.stock === "out") list = list.filter((p) => p.stockStatus === "out");
  return list;
}

function getProductsCatalog(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const filtered = filterProducts(DEMO_PRODUCTS, query);
  const useDemoTotal = !query.q && !query.category && !query.brand && !query.status && !query.stock;
  const total = useDemoTotal ? 8934 : filtered.length;
  const skip = (page - 1) * limit;
  const products =
    page === 1 && useDemoTotal && limit >= 7
      ? DEMO_PRODUCTS.slice(0, Math.min(limit, DEMO_PRODUCTS.length))
      : filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      total: 8934,
      active: 7842,
      activePct: 87.8,
      outOfStock: 342,
      outPct: 3.8,
      lowStock: 750,
      lowPct: 8.4,
      categories: 156,
      brands: 89,
      stockValue: 48756300,
    },
    products,
    meta: {
      categories: CATEGORIES.slice(1).map((name, i) => ({ id: String(i + 1), name })),
      brands: BRANDS.slice(1).map((name, i) => ({ id: String(i + 1), name })),
    },
    categoryDonut: [
      { key: "elec", name: "Electronics", pct: 25.4, value: 2269, color: "#4F46E5" },
      { key: "super", name: "Supermarket", pct: 22.1, value: 1974, color: "#10B981" },
      { key: "fashion", name: "Fashion", pct: 16.8, value: 1501, color: "#F59E0B" },
      { key: "home", name: "Home & Living", pct: 12.3, value: 1099, color: "#EC4899" },
      { key: "beauty", name: "Beauty", pct: 9.8, value: 876, color: "#8B5CF6" },
      { key: "other", name: "Others", pct: 13.6, value: 1215, color: "#94A3B8" },
    ],
    topSelling: [
      { name: "Samsung Galaxy A54 5G", sold: 1245, image: DEMO_PRODUCTS[0].image },
      { name: "HP Pavilion 15 Laptop", sold: 892, image: DEMO_PRODUCTS[1].image },
      { name: "Sony WH-CH520 Headphones", sold: 756, image: DEMO_PRODUCTS[2].image },
      { name: "Nike Air Max 270", sold: 634, image: DEMO_PRODUCTS[3].image },
      { name: "Top Fry Cooking Oil 2L", sold: 489, image: DEMO_PRODUCTS[5].image },
    ],
    inventorySummary: [
      { label: "Total Stock Quantity", value: "157,980" },
      { label: "Avg. Product Price", value: "KSh 5,461" },
      { label: "Products with Variants", value: "1,248" },
      { label: "Digital Products", value: "86" },
      { label: "Physical Products", value: "8,848" },
    ],
    stockOverview: [
      { key: "in", name: "In Stock", pct: 87.8, value: 7842, color: "#10B981" },
      { key: "low", name: "Low Stock", pct: 8.4, value: 750, color: "#F59E0B" },
      { key: "out", name: "Out of Stock", pct: 3.8, value: 342, color: "#EF4444" },
    ],
    recentActivities: [
      {
        id: "ra1",
        text: "Nike Air Max 270 price updated by Admin User",
        atLabel: "2 hours ago",
        tone: "purple",
      },
      {
        id: "ra2",
        text: "Samsung Galaxy A54 5G stock adjusted (+24 units)",
        atLabel: "5 hours ago",
        tone: "green",
      },
      {
        id: "ra3",
        text: "Ariel Washing Powder marked as inactive",
        atLabel: "Yesterday",
        tone: "orange",
      },
      {
        id: "ra4",
        text: "Brookside Milk 1L added to Supermarket category",
        atLabel: "2 days ago",
        tone: "blue",
      },
    ],
  };
}

module.exports = { getProductsCatalog, DEMO_PRODUCTS };
