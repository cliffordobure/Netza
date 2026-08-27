const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=64&q=80&sig=${sig}`;

const ROWS = [
  {
    id: "ia1",
    n: 1,
    atLabel: "27 May 2026, 09:15 AM",
    reference: "ADJ-2026-0482",
    productName: "Samsung Galaxy A54 5G",
    productSku: "SP-A54-128",
    productImage: img("photo-1610945265064-0e34e5519bbf", 1),
    type: "addition",
    typeLabel: "Addition",
    reason: "Stock Received",
    location: "Main Warehouse",
    qtyChange: 20,
    valueKes: 859980,
    userName: "Mercy Wanjiku",
    userRole: "Administrator",
    roleKey: "admin",
  },
  {
    id: "ia2",
    n: 2,
    atLabel: "27 May 2026, 08:42 AM",
    reference: "ADJ-2026-0481",
    productName: "HP Pavilion 15 Laptop",
    productSku: "HP-PAV-15",
    productImage: img("photo-1496181133206-80ce9b88a853", 2),
    type: "deduction",
    typeLabel: "Deduction",
    reason: "Damaged",
    location: "Nairobi DC",
    qtyChange: -1,
    valueKes: -89999,
    userName: "Admin User",
    userRole: "Super Admin",
    roleKey: "super_admin",
  },
  {
    id: "ia3",
    n: 3,
    atLabel: "26 May 2026, 04:30 PM",
    reference: "ADJ-2026-0480",
    productName: "Sony WH-CH520 Headphones",
    productSku: "SNY-CH520",
    productImage: img("photo-1505740420928-5e560c06d30e", 3),
    type: "deduction",
    typeLabel: "Deduction",
    reason: "Stock Correction",
    location: "Store Front",
    qtyChange: -2,
    valueKes: -12998,
    userName: "Francis Kimani",
    userRole: "Manager",
    roleKey: "manager",
  },
  {
    id: "ia4",
    n: 4,
    atLabel: "26 May 2026, 02:15 PM",
    reference: "ADJ-2026-0479",
    productName: "Nike Air Max 270",
    productSku: "NK-AM270",
    productImage: img("photo-1542291026-7eec264c27ff", 4),
    type: "addition",
    typeLabel: "Addition",
    reason: "Return to Stock",
    location: "Main Warehouse",
    qtyChange: 5,
    valueKes: 79995,
    userName: "Mercy Wanjiku",
    userRole: "Administrator",
    roleKey: "admin",
  },
  {
    id: "ia5",
    n: 5,
    atLabel: "26 May 2026, 11:00 AM",
    reference: "ADJ-2026-0478",
    productName: "Ariel Washing Powder 2kg",
    productSku: "ARL-WP-2KG",
    productImage: img("photo-1585421514284-efb74c2d69c6", 5),
    type: "deduction",
    typeLabel: "Deduction",
    reason: "Expired",
    location: "Nairobi DC",
    qtyChange: -12,
    valueKes: -10788,
    userName: "Admin User",
    userRole: "Super Admin",
    roleKey: "super_admin",
  },
  {
    id: "ia6",
    n: 6,
    atLabel: "25 May 2026, 03:45 PM",
    reference: "ADJ-2026-0477",
    productName: "Top Fry Cooking Oil 2L",
    productSku: "TF-OIL-2L",
    productImage: img("photo-1474979266404-7eaacbcd87c5", 6),
    type: "addition",
    typeLabel: "Addition",
    reason: "Stock Received",
    location: "Main Warehouse",
    qtyChange: 48,
    valueKes: 26352,
    userName: "Francis Kimani",
    userRole: "Manager",
    roleKey: "manager",
  },
  {
    id: "ia7",
    n: 7,
    atLabel: "25 May 2026, 10:20 AM",
    reference: "ADJ-2026-0476",
    productName: "Brookside Milk 1L",
    productSku: "BS-MILK-1L",
    productImage: img("photo-1563636619-e9143da7973b", 7),
    type: "deduction",
    typeLabel: "Deduction",
    reason: "Lost",
    location: "Store Front",
    qtyChange: -3,
    valueKes: -435,
    userName: "Mercy Wanjiku",
    userRole: "Administrator",
    roleKey: "admin",
  },
  {
    id: "ia8",
    n: 8,
    atLabel: "24 May 2026, 05:10 PM",
    reference: "ADJ-2026-0475",
    productName: "Samsung Galaxy A54 5G",
    productSku: "SP-A54-128",
    productImage: img("photo-1610945265064-0e34e5519bbf", 8),
    type: "correction",
    typeLabel: "Stock Correction",
    reason: "Stock Correction",
    location: "Main Warehouse",
    qtyChange: -4,
    valueKes: -171996,
    userName: "Admin User",
    userRole: "Super Admin",
    roleKey: "super_admin",
  },
  {
    id: "ia9",
    n: 9,
    atLabel: "24 May 2026, 01:30 PM",
    reference: "ADJ-2026-0474",
    productName: "HP Pavilion 15 Laptop",
    productSku: "HP-PAV-15",
    productImage: img("photo-1496181133206-80ce9b88a853", 9),
    type: "addition",
    typeLabel: "Addition",
    reason: "Stock Received",
    location: "Nairobi DC",
    qtyChange: 10,
    valueKes: 899990,
    userName: "Francis Kimani",
    userRole: "Manager",
    roleKey: "manager",
  },
  {
    id: "ia10",
    n: 10,
    atLabel: "23 May 2026, 09:55 AM",
    reference: "ADJ-2026-0473",
    productName: "Sony WH-CH520 Headphones",
    productSku: "SNY-CH520",
    productImage: img("photo-1505740420928-5e560c06d30e", 10),
    type: "return",
    typeLabel: "Return to Stock",
    reason: "Return to Stock",
    location: "Store Front",
    qtyChange: 2,
    valueKes: 12998,
    userName: "Mercy Wanjiku",
    userRole: "Administrator",
    roleKey: "admin",
  },
];

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.reference.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.productSku.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
    );
  }
  if (query.type && query.type !== "all") list = list.filter((r) => r.type === query.type);
  if (query.reason && query.reason !== "all") {
    list = list.filter((r) => r.reason.toLowerCase().replace(/\s+/g, "-") === query.reason);
  }
  if (query.location && query.location !== "all") list = list.filter((r) => r.location === query.location);
  if (query.user && query.user !== "all") list = list.filter((r) => r.roleKey === query.user);
  return list;
}

function getInventoryAdjustments(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const filtered = filterRows(ROWS, query);
  const useDemoTotal = !query.q && !query.type && !query.reason && !query.location && !query.user;
  const total = useDemoTotal ? 482 : filtered.length;
  const skip = (page - 1) * limit;
  const rows =
    page === 1 && useDemoTotal && limit >= 10
      ? ROWS.slice(0, Math.min(limit, ROWS.length))
      : filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    from: "2026-05-01",
    to: "2026-05-27",
    stats: {
      totalAdjustments: 482,
      itemsAffected: 2845,
      stockAdded: 1876,
      stockAddedValue: 1245600,
      stockDeducted: 969,
      stockDeductedValue: 582300,
      netValue: 663300,
      thisMonth: 74,
      monthDelta: 12.1,
    },
    rows,
    typeDonut: [
      { key: "addition", name: "Addition", pct: 52.1, value: 250, color: "#10B981" },
      { key: "deduction", name: "Deduction", pct: 40.0, value: 193, color: "#EF4444" },
      { key: "correction", name: "Stock Correction", pct: 5.2, value: 25, color: "#38BDF8" },
      { key: "return", name: "Return to Stock", pct: 2.3, value: 11, color: "#14B8A6" },
      { key: "other", name: "Other", pct: 0.4, value: 2, color: "#94A3B8" },
    ],
    reasonBars: [
      { key: "received", name: "Stock Received", count: 186, color: "#10B981" },
      { key: "damaged", name: "Damaged", count: 98, color: "#EF4444" },
      { key: "expired", name: "Expired", count: 72, color: "#F59E0B" },
      { key: "correction", name: "Stock Correction", count: 54, color: "#38BDF8" },
      { key: "lost", name: "Lost", count: 38, color: "#8B5CF6" },
      { key: "return", name: "Return to Stock", count: 24, color: "#14B8A6" },
      { key: "other", name: "Other", count: 10, color: "#94A3B8" },
    ],
    valueImpact: {
      added: 1245600,
      deducted: 582300,
      net: 663300,
    },
    filters: {
      types: [
        { id: "addition", label: "Addition" },
        { id: "deduction", label: "Deduction" },
        { id: "correction", label: "Stock Correction" },
        { id: "return", label: "Return to Stock" },
      ],
      reasons: [
        { id: "stock-received", label: "Stock Received" },
        { id: "damaged", label: "Damaged" },
        { id: "expired", label: "Expired" },
        { id: "stock-correction", label: "Stock Correction" },
        { id: "lost", label: "Lost" },
        { id: "return-to-stock", label: "Return to Stock" },
      ],
      locations: ["Main Warehouse", "Nairobi DC", "Store Front"],
      users: [
        { id: "super_admin", label: "Super Admin" },
        { id: "admin", label: "Administrator" },
        { id: "manager", label: "Manager" },
      ],
    },
  };
}

module.exports = { getInventoryAdjustments, ROWS };
