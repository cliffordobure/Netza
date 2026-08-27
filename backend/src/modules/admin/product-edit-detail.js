const img = (id, sig, w = 480) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80&sig=${sig}`;

const PHONE_GALLERY = [
  img("photo-1610945265064-0e34e5519bbf", 1),
  img("photo-1598327275661-c76316665372", 2),
  img("photo-1511707171634-5f897ff02aa9", 3),
  img("photo-1565849904461-04a516615088", 4),
  img("photo-1601784551446-20c9e07cdbdb", 5),
];

const SAMSUNG = {
  id: "pc1",
  name: "Samsung Galaxy A54 5G",
  sku: "SP-A54-128",
  barcode: "8806094792157",
  shortDescription: "Awesome 5G smartphone with 128GB storage and 8GB RAM.",
  description:
    "The Samsung Galaxy A54 5G delivers a premium smartphone experience with a vibrant 6.4-inch Super AMOLED display, powerful Exynos 1380 processor, and versatile triple-camera system. Enjoy all-day battery life, IP67 water resistance, and seamless 5G connectivity — perfect for work, entertainment, and everyday photography.",
  categoryPath: "Phones & Tablets > Smartphones",
  categoryId: "1",
  brandId: "1",
  brandName: "Samsung",
  unit: "Piece",
  productType: "Simple Product",
  tags: ["samsung", "smartphone", "5g", "android"],
  isActive: true,
  isFeatured: false,
  allowReviews: true,
  hasVariations: false,
  warrantyPeriod: "12 Months",
  color: "Awesome Graphite",
  modelNumber: "SM-A546E/DS",
  countryOfOrigin: "Vietnam",
  priceKes: 42999,
  compareAtKes: 47999,
  stock: 120,
  reserved: 10,
  available: 110,
  lowStockAt: 15,
  soldAllTime: 1245,
  returnRate: 2.3,
  costPriceKes: 38000,
  supplier: "Samsung Kenya Ltd",
  purchaseDate: "19 May 2026",
  adminNotes: "Supplier: Samsung Kenya Ltd\nPurchase Date: 19 May 2026\nCost Price: KSh 38,000",
  images: PHONE_GALLERY,
  primaryImage: PHONE_GALLERY[0],
  galleryCount: 5,
  galleryMax: 10,
  stockStatus: "in",
  stockStatusLabel: "In Stock",
  createdAt: "2026-01-15T09:30:00.000Z",
  createdLabel: "15 Jan 2026, 09:30 AM",
  updatedAt: "2026-05-26T14:22:00.000Z",
  updatedLabel: "26 May 2026, 02:22 PM",
  views: 1245,
  orders: 842,
  reviews: 128,
  rating: 4.6,
  auditTrail: [
    {
      id: "au1",
      action: "Stock updated",
      detail: "120 → 128 units",
      userName: "Mercy Wanjiku",
      userRole: "Administrator",
      atLabel: "26 May 2026, 02:22 PM",
    },
    {
      id: "au2",
      action: "Price updated",
      detail: "KSh 44,999 → KSh 42,999",
      userName: "Admin User",
      userRole: "Super Admin",
      atLabel: "24 May 2026, 11:10 AM",
    },
    {
      id: "au3",
      action: "Product created",
      detail: "Initial catalog entry",
      userName: "Francis Kimani",
      userRole: "Manager",
      atLabel: "15 Jan 2026, 09:30 AM",
    },
  ],
};

const OVERRIDES = {
  pc2: {
    id: "pc2",
    name: "HP Pavilion 15 Laptop",
    sku: "HP-PAV-15",
    categoryPath: "Computers > Laptops",
    brandName: "HP",
    shortDescription: "Reliable 15-inch laptop for work and study.",
    primaryImage: img("photo-1496181133206-80ce9b88a853", 20),
    images: [img("photo-1496181133206-80ce9b88a853", 20)],
    priceKes: 89999,
    stock: 42,
    available: 38,
    reserved: 4,
  },
  pc3: {
    id: "pc3",
    name: "Sony WH-CH520 Headphones",
    sku: "SNY-CH520",
    categoryPath: "Electronics > Audio",
    brandName: "Sony",
    stockStatus: "low",
    stockStatusLabel: "Low Stock",
    stock: 8,
    available: 6,
    reserved: 2,
    primaryImage: img("photo-1505740420928-5e560c06d30e", 30),
    images: [img("photo-1505740420928-5e560c06d30e", 30)],
    priceKes: 6499,
  },
};

function getProductEditDetail(id) {
  if (id === "pc1" || id === SAMSUNG.id) return { ...SAMSUNG };
  const over = OVERRIDES[id];
  if (over) return { ...SAMSUNG, ...over, tags: [...(over.tags || SAMSUNG.tags)] };
  if (String(id).startsWith("pc")) return { ...SAMSUNG, id, sku: `DEMO-${id}`, name: `Demo Product ${id}` };
  return null;
}

function saveProductEditDetail(id, body = {}) {
  const current = getProductEditDetail(id) || { ...SAMSUNG, id };
  return { ...current, ...body, id };
}

module.exports = { getProductEditDetail, saveProductEditDetail, SAMSUNG };
