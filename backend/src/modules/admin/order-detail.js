const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80&sig=${sig}`;

const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=128&sig=${n}`;

const PRIMARY = {
  id: "o1",
  orderNumber: "ORD-2026-012845",
  shortId: "#12845",
  status: "delivered",
  statusLabel: "Delivered",
  paymentStatus: "paid",
  paymentLabel: "Paid",
  placedAt: "27 May 2026, 10:15 AM",
  placedAtShort: "27 May 2026, 10:15 AM",
  orderDate: "27 May 2026",
  orderTime: "10:15 AM",
  orderType: "Online Order",
  salesChannel: "Website",
  placedBy: "Mercy Wanjiku",
  ipAddress: "102.68.214.47",
  device: "Chrome on Windows",
  coupon: "SAVE50 — KES 50 OFF",
  customerNote: "Please gift-wrap the laptop if possible.",
  deliveryInstructions: "Leave at the front door if not available. Call before delivery.",
  deliveryMethod: "Standard Delivery",
  deliveryCity: "Nairobi",
  footerMessage: "This order was delivered on 27 May 2026 at 10:15 AM by Standard Delivery to Nairobi.",
  timeline: [
    { key: "placed", label: "Order Placed", at: "27 May 2026, 10:15 AM", done: true, current: false },
    { key: "payment", label: "Payment Confirmed", at: "27 May 2026, 10:17 AM", done: true, current: false },
    { key: "processing", label: "Processing", at: "27 May 2026, 12:20 PM", done: true, current: false },
    { key: "shipped", label: "Shipped", at: "27 May 2026, 04:30 PM", done: true, current: false },
    { key: "delivered", label: "Delivered", at: "27 May 2026, 10:15 AM", done: true, current: true },
  ],
  customer: {
    id: "c-demo-1",
    name: "Mercy Wanjiku",
    phone: "+254 723 456 789",
    email: "mercy.wanjiku@gmail.com",
    avatar: avatar("Mercy Wanjiku", 1),
    badge: "VIP Customer",
    memberSince: "12 Jan 2025",
    totalOrders: 18,
    totalSpentKes: 86450,
    loyaltyPoints: 1250,
  },
  shippingAddress: {
    name: "Mercy Wanjiku",
    phone: "+254 723 456 789",
    lines: ["Apartment 4B, Kilimani Towers", "Argwings Kodhek Road", "Nairobi, Kenya"],
    postalCode: "00100",
  },
  billingAddress: {
    name: "Mercy Wanjiku",
    phone: "+254 723 456 789",
    lines: ["Apartment 4B, Kilimani Towers", "Argwings Kodhek Road", "Nairobi, Kenya"],
    postalCode: "00100",
  },
  items: [
    {
      id: "oi1",
      name: "Samsung Galaxy A54 5G",
      sku: "SP-A54-128",
      image: img("photo-1610945265064-0e34e5519bbf", 1),
      priceKes: 5499,
      quantity: 1,
      discountKes: 0,
      totalKes: 5499,
      status: "delivered",
      statusLabel: "Delivered",
    },
    {
      id: "oi2",
      name: "HP Pavilion 15 Laptop",
      sku: "HP-PAV-15",
      image: img("photo-1496181133206-80ce9b88a853", 2),
      priceKes: 1951,
      quantity: 1,
      discountKes: 0,
      totalKes: 1951,
      status: "delivered",
      statusLabel: "Delivered",
    },
    {
      id: "oi3",
      name: "Sony WH-CH520 Headphones",
      sku: "SNY-CH520",
      image: img("photo-1505740420928-5e560c06d30e", 3),
      priceKes: 1000,
      quantity: 1,
      discountKes: 0,
      totalKes: 1000,
      status: "delivered",
      statusLabel: "Delivered",
    },
  ],
  summary: {
    itemCount: 3,
    subtotalKes: 8450,
    discountLabel: "SAVE50",
    discountKes: 50,
    deliveryKes: 350,
    packagingKes: 50,
    taxLabel: "Tax (16% VAT)",
    taxKes: 1234,
    totalKes: 10034,
    paidKes: 10034,
    dueKes: 0,
  },
  payment: {
    method: "M-PESA",
    methodLabel: "M-PESA",
    transactionId: "WP3A7Q2X8L",
    paidAt: "27 May 2026, 10:17 AM",
    status: "paid",
    statusLabel: "Paid",
  },
  activity: [
    { id: "a1", text: "Order marked as delivered", user: "System", at: "27 May 2026, 10:15 AM", tone: "green" },
    { id: "a2", text: "Shipment dispatched via Standard Delivery", user: "Mercy Wanjiku", at: "27 May 2026, 04:30 PM", tone: "purple" },
    { id: "a3", text: "Payment confirmed via M-PESA", user: "System", at: "27 May 2026, 10:17 AM", tone: "blue" },
    { id: "a4", text: "Order placed on Website", user: "Mercy Wanjiku", at: "27 May 2026, 10:15 AM", tone: "orange" },
  ],
  notes: [
    {
      id: "n1",
      author: "Admin User",
      role: "Super Admin",
      text: "Customer requested gift wrap on laptop. Confirmed with warehouse.",
      at: "27 May 2026, 11:05 AM",
    },
  ],
};

const ID_MAP = {
  o1: PRIMARY,
  "ord-2026-012845": PRIMARY,
};

function getOrderDetail(id) {
  const key = String(id || "").toLowerCase();
  if (ID_MAP[key]) return { ...ID_MAP[key] };
  if (key.startsWith("ord-2026-01284")) {
    const n = Number(key.replace(/\D/g, "").slice(-2)) || 5;
    const variant = { ...PRIMARY, id: `o${n}`, orderNumber: id.toUpperCase().startsWith("ORD") ? id.toUpperCase() : PRIMARY.orderNumber };
    return variant;
  }
  return null;
}

module.exports = { getOrderDetail, PRIMARY };
