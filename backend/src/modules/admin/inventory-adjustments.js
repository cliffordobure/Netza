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
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const rows = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    from: "2026-05-01",
    to: "2026-05-27",
    stats: {
      totalAdjustments: 3,
      itemsAffected: 3,
      stockAdded: 20,
      stockAddedValue: 859980,
      stockDeducted: 3,
      stockDeductedValue: 102997,
      netValue: 756983,
      thisMonth: 3,
      monthDelta: 0,
    },
    rows,
    typeDonut: [
      { key: "addition", name: "Addition", pct: 33.3, value: 1, color: "#10B981" },
      { key: "deduction", name: "Deduction", pct: 66.7, value: 2, color: "#EF4444" },
    ],
    reasonBars: [
      { key: "received", name: "Stock Received", count: 1, color: "#10B981" },
      { key: "damaged", name: "Damaged", count: 1, color: "#EF4444" },
      { key: "correction", name: "Stock Correction", count: 1, color: "#38BDF8" },
    ],
    valueImpact: {
      added: 859980,
      deducted: 102997,
      net: 756983,
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
