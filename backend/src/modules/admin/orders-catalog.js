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
    paymentStatus: "paid",
    paymentLabel: "Paid",
    paymentMethod: "MPESA",
    status: "processing",
    statusLabel: "Processing",
    statusDate: "25 May 2026",
    deliveryMethod: "Standard",
    deliveryCity: "Mombasa",
    orderDate: "25 May 2026",
    orderTime: "11:48 AM",
  },
  {
    id: "o4",
    n: 4,
    orderNumber: "ORD-2026-012842",
    shortId: "#12842",
    customerName: "Grace Akinyi",
    customerPhone: "+254 745 678 901",
    customerAvatar: avatar("Grace Akinyi", 4),
    itemCount: 1,
    totalKes: 42999,
    paymentStatus: "pending",
    paymentLabel: "Pending",
    paymentMethod: "MPESA",
    status: "pending",
    statusLabel: "Pending",
    statusDate: "25 May 2026",
    deliveryMethod: "Express",
    deliveryCity: "Nairobi",
    orderDate: "25 May 2026",
    orderTime: "09:05 AM",
  },
  {
    id: "o5",
    n: 5,
    orderNumber: "ORD-2026-012841",
    shortId: "#12841",
    customerName: "David Kamau",
    customerPhone: "+254 756 789 012",
    customerAvatar: avatar("David Kamau", 5),
    itemCount: 4,
    totalKes: 12850,
    paymentStatus: "failed",
    paymentLabel: "Failed",
    paymentMethod: "Card",
    status: "cancelled",
    statusLabel: "Cancelled",
    statusDate: "24 May 2026",
    deliveryMethod: "Standard",
    deliveryCity: "Nakuru",
    orderDate: "24 May 2026",
    orderTime: "06:22 PM",
  },
  {
    id: "o6",
    n: 6,
    orderNumber: "ORD-2026-012840",
    shortId: "#12840",
    customerName: "Sarah Njeri",
    customerPhone: "+254 767 890 123",
    customerAvatar: avatar("Sarah Njeri", 6),
    itemCount: 2,
    totalKes: 9200,
    paymentStatus: "paid",
    paymentLabel: "Paid",
    paymentMethod: "MPESA",
    status: "delivered",
    statusLabel: "Delivered",
    statusDate: "24 May 2026",
    deliveryMethod: "Standard",
    deliveryCity: "Eldoret",
    orderDate: "23 May 2026",
    orderTime: "02:40 PM",
  },
  {
    id: "o7",
    n: 7,
    orderNumber: "ORD-2026-012839",
    shortId: "#12839",
    customerName: "Francis Kimani",
    customerPhone: "+254 778 901 234",
    customerAvatar: avatar("Francis Kimani", 7),
    itemCount: 6,
    totalKes: 31400,
    paymentStatus: "paid",
    paymentLabel: "Paid",
    paymentMethod: "MPESA",
    status: "shipped",
    statusLabel: "Shipped",
    statusDate: "23 May 2026",
    deliveryMethod: "Express",
    deliveryCity: "Nairobi",
    orderDate: "23 May 2026",
    orderTime: "08:18 AM",
  },
  {
    id: "o8",
    n: 8,
    orderNumber: "ORD-2026-012838",
    shortId: "#12838",
    customerName: "Anne Mutua",
    customerPhone: "+254 789 012 345",
    customerAvatar: avatar("Anne Mutua", 8),
    itemCount: 1,
    totalKes: 6499,
    paymentStatus: "paid",
    paymentLabel: "Paid",
    paymentMethod: "Card",
    status: "processing",
    statusLabel: "Processing",
    statusDate: "22 May 2026",
    deliveryMethod: "Standard",
    deliveryCity: "Thika",
    orderDate: "22 May 2026",
    orderTime: "04:55 PM",
  },
  {
    id: "o9",
    n: 9,
    orderNumber: "ORD-2026-012837",
    shortId: "#12837",
    customerName: "Brian Ochieng",
    customerPhone: "+254 790 123 456",
    customerAvatar: avatar("Brian Ochieng", 9),
    itemCount: 3,
    totalKes: 18750,
    paymentStatus: "pending",
    paymentLabel: "Pending",
    paymentMethod: "MPESA",
    status: "pending",
    statusLabel: "Pending",
    statusDate: "22 May 2026",
    deliveryMethod: "Standard",
    deliveryCity: "Kisii",
    orderDate: "22 May 2026",
    orderTime: "01:12 PM",
  },
  {
    id: "o10",
    n: 10,
    orderNumber: "ORD-2026-012836",
    shortId: "#12836",
    customerName: "Linda Chebet",
    customerPhone: "+254 701 234 567",
    customerAvatar: avatar("Linda Chebet", 10),
    itemCount: 2,
    totalKes: 11200,
    paymentStatus: "paid",
    paymentLabel: "Paid",
    paymentMethod: "MPESA",
    status: "delivered",
    statusLabel: "Delivered",
    statusDate: "21 May 2026",
    deliveryMethod: "Express",
    deliveryCity: "Nairobi",
    orderDate: "21 May 2026",
    orderTime: "07:30 AM",
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
  const useDemoTotal = !query.q && !query.status && !query.paymentStatus && !query.delivery;
  const total = useDemoTotal ? 12845 : filtered.length;
  const skip = (page - 1) * limit;
  const orders =
    page === 1 && useDemoTotal && limit >= 10
      ? ROWS.slice(0, Math.min(limit, ROWS.length))
      : filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      total: 12845,
      totalDelta: 18.7,
      pending: 1254,
      pendingDelta: 12.4,
      processing: 2368,
      processingDelta: 15.8,
      shipped: 5432,
      shippedDelta: 20.5,
      delivered: 3256,
      deliveredDelta: 22.1,
      cancelled: 535,
      cancelledDelta: 8.3,
    },
    orders,
    statusDonut: [
      { key: "delivered", name: "Delivered", pct: 25.4, value: 3256, color: "#10B981" },
      { key: "shipped", name: "Shipped", pct: 42.3, value: 5432, color: "#8B5CF6" },
      { key: "processing", name: "Processing", pct: 18.4, value: 2368, color: "#2563EB" },
      { key: "pending", name: "Pending", pct: 9.8, value: 1254, color: "#F59E0B" },
      { key: "cancelled", name: "Cancelled", pct: 4.1, value: 535, color: "#EF4444" },
    ],
    topProducts: [
      { name: "Samsung Galaxy A54 5G", orders: 842, image: img("photo-1610945265064-0e34e5519bbf", 1) },
      { name: "HP Pavilion 15 Laptop", orders: 624, image: img("photo-1496181133206-80ce9b88a853", 2) },
      { name: "Sony WH-CH520 Headphones", orders: 518, image: img("photo-1505740420928-5e560c06d30e", 3) },
      { name: "Nike Air Max 270", orders: 412, image: img("photo-1542291026-7eec264c27ff", 4) },
      { name: "Top Fry Cooking Oil 2L", orders: 386, image: img("photo-1474979266404-7eaacbcd87c5", 5) },
    ],
    recentOrders: [
      { id: "r1", text: "ORD-2026-012845 delivered", atLabel: "2 hours ago", tone: "green" },
      { id: "r2", text: "ORD-2026-012844 shipped to Kisumu", atLabel: "4 hours ago", tone: "purple" },
      { id: "r3", text: "ORD-2026-012843 moved to processing", atLabel: "6 hours ago", tone: "blue" },
      { id: "r4", text: "ORD-2026-012842 payment pending", atLabel: "Yesterday", tone: "orange" },
      { id: "r5", text: "ORD-2026-012841 cancelled — payment failed", atLabel: "Yesterday", tone: "red" },
    ],
    filters: {
      deliveryMethods: ["Standard", "Express"],
    },
  };
}

module.exports = { getOrdersCatalog, ROWS };
