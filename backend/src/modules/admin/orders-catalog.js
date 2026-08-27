const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=64&q=80&sig=${sig}`;

const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const ROWS = [
  {
    id: "o1",
    n: 1,
    orderNumber: "ORD-2026-012845",
    shortId: "#12845",
    customerName: "James Mwangi",
    customerPhone: "+254 712 345 678",
    customerAvatar: avatar("James Mwangi", 1),
    itemCount: 3,
    totalKes: 8450,
    paymentStatus: "paid",
    paymentLabel: "Paid",
    paymentMethod: "MPESA",
    status: "delivered",
    statusLabel: "Delivered",
    statusDate: "26 May 2026",
    deliveryMethod: "Standard",
    deliveryCity: "Nairobi",
    orderDate: "24 May 2026",
    orderTime: "10:32 AM",
  },
  {
    id: "o2",
    n: 2,
    orderNumber: "ORD-2026-012844",
    shortId: "#12844",
    customerName: "Mercy Wanjiku",
    customerPhone: "+254 723 456 789",
    customerAvatar: avatar("Mercy Wanjiku", 2),
    itemCount: 2,
    totalKes: 15600,
    paymentStatus: "paid",
    paymentLabel: "Paid",
    paymentMethod: "Card",
    status: "shipped",
    statusLabel: "Shipped",
    statusDate: "26 May 2026",
    deliveryMethod: "Express",
    deliveryCity: "Kisumu",
    orderDate: "25 May 2026",
    orderTime: "03:15 PM",
  },
  {
    id: "o3",
    n: 3,
    orderNumber: "ORD-2026-012843",
    shortId: "#12843",
    customerName: "Peter Otieno",
    customerPhone: "+254 734 567 890",
    customerAvatar: avatar("Peter Otieno", 3),
    itemCount: 5,
    totalKes: 24300,
    paymentStatus: "pending",
    paymentLabel: "Pending",
    paymentMethod: "MPESA",
    status: "pending",
    statusLabel: "Pending",
    statusDate: "25 May 2026",
    deliveryMethod: "Standard",
    deliveryCity: "Mombasa",
    orderDate: "25 May 2026",
    orderTime: "11:48 AM",
  },
];

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.orderNumber.toLowerCase().includes(q) ||
        r.shortId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.paymentStatus) list = list.filter((r) => r.paymentStatus === query.paymentStatus);
  if (query.delivery) list = list.filter((r) => r.deliveryMethod.toLowerCase() === query.delivery);
  return list;
}

function getOrdersCatalog(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const filtered = filterRows(ROWS, query);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const orders = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      total: 3,
      totalDelta: 0,
      pending: 1,
      pendingDelta: 0,
      processing: 0,
      processingDelta: 0,
      shipped: 1,
      shippedDelta: 0,
      delivered: 1,
      deliveredDelta: 0,
      cancelled: 0,
      cancelledDelta: 0,
    },
    orders,
    statusDonut: [
      { key: "delivered", name: "Delivered", pct: 33.3, value: 1, color: "#10B981" },
      { key: "shipped", name: "Shipped", pct: 33.3, value: 1, color: "#8B5CF6" },
      { key: "pending", name: "Pending", pct: 33.4, value: 1, color: "#F59E0B" },
    ],
    topProducts: [
      { name: "Samsung Galaxy A54 5G", orders: 2, image: img("photo-1610945265064-0e34e5519bbf", 1) },
      { name: "HP Pavilion 15 Laptop", orders: 1, image: img("photo-1496181133206-80ce9b88a853", 2) },
      { name: "Sony WH-CH520 Headphones", orders: 1, image: img("photo-1505740420928-5e560c06d30e", 3) },
    ],
    recentOrders: [
      { id: "r1", text: "ORD-2026-012845 delivered", atLabel: "2 hours ago", tone: "green" },
      { id: "r2", text: "ORD-2026-012844 shipped to Kisumu", atLabel: "4 hours ago", tone: "purple" },
      { id: "r3", text: "ORD-2026-012843 payment pending", atLabel: "6 hours ago", tone: "orange" },
    ],
    filters: {
      deliveryMethods: ["Standard", "Express"],
    },
  };
}

module.exports = { getOrdersCatalog, ROWS };
