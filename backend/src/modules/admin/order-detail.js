const { Order, User, isOid } = require("../../models");

const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Guest")}&background=ede9fe&color=6d28d9&size=128&sig=${n}`;

function fmtDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(d)}, ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(d)}`;
}

function fmtDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function fmtTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function uiStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING_PAYMENT") return { status: "pending", statusLabel: "Pending" };
  if (s === "SHIPPED") return { status: "shipped", statusLabel: "Shipped" };
  if (s === "DELIVERED") return { status: "delivered", statusLabel: "Delivered" };
  if (s === "CANCELLED") return { status: "cancelled", statusLabel: "Cancelled" };
  return { status: "processing", statusLabel: "Processing" };
}

function uiPayment(paymentStatus) {
  const s = String(paymentStatus || "").toUpperCase();
  if (s === "COMPLETED") return { paymentStatus: "paid", paymentLabel: "Paid", status: "paid", statusLabel: "Paid" };
  if (s === "FAILED") return { paymentStatus: "failed", paymentLabel: "Failed", status: "failed", statusLabel: "Failed" };
  return { paymentStatus: "pending", paymentLabel: "Pending", status: "pending", statusLabel: "Pending" };
}

function paymentMethodLabel(method) {
  const m = String(method || "").toUpperCase();
  if (m === "MPESA") return "M-PESA";
  if (m === "POINTS") return "Tajira Points";
  if (m === "PESAPAL" || m === "CARD") return "Card (Pesapal)";
  return method || "—";
}

function deliveryLabel(method) {
  return String(method || "").toUpperCase() === "EXPRESS" ? "Express Delivery" : "Standard Delivery";
}

function buildTimeline(order, st) {
  const created = order.createdAt;
  const paid = order.paidAt;
  const steps = [
    { key: "placed", label: "Order Placed", at: fmtDateTime(created), done: true, current: st.status === "pending" },
    {
      key: "payment",
      label: "Payment Confirmed",
      at: paid ? fmtDateTime(paid) : "—",
      done: !!paid || order.paymentStatus === "COMPLETED",
      current: false,
    },
    {
      key: "processing",
      label: "Processing",
      at: st.status === "processing" || st.status === "shipped" || st.status === "delivered" ? fmtDateTime(order.updatedAt) : "—",
      done: ["processing", "shipped", "delivered"].includes(st.status),
      current: st.status === "processing",
    },
    {
      key: "shipped",
      label: "Shipped",
      at: st.status === "shipped" || st.status === "delivered" ? fmtDateTime(order.updatedAt) : "—",
      done: ["shipped", "delivered"].includes(st.status),
      current: st.status === "shipped",
    },
    {
      key: "delivered",
      label: "Delivered",
      at: st.status === "delivered" ? fmtDateTime(order.updatedAt) : "—",
      done: st.status === "delivered",
      current: st.status === "delivered",
    },
  ];
  return steps;
}

function buildOrderDetail(order) {
  const json = typeof order.toJSON === "function" ? order.toJSON() : order;
  const user = json.user && typeof json.user === "object" ? json.user : {};
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Guest";
  const st = uiStatus(json.status);
  const pay = uiPayment(json.paymentStatus);
  const addr = json.address || {};
  const addrLines = [addr.street, addr.city, addr.county].filter(Boolean);
  const payment = (json.payments || [])[0] || {};
  const items = (json.items || []).map((item, i) => ({
    id: item.product || `oi${i}`,
    name: item.name,
    sku: item.sku || "",
    image: "",
    priceKes: item.unitPriceKes || 0,
    quantity: item.quantity || 1,
    discountKes: 0,
    totalKes: item.lineTotalKes || (item.unitPriceKes || 0) * (item.quantity || 1),
    status: st.status,
    statusLabel: st.statusLabel,
  }));
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const placedAt = fmtDateTime(json.createdAt);

  return {
    id: json.id,
    orderNumber: json.orderNumber,
    shortId: json.orderNumber ? `#${String(json.orderNumber).replace(/\D/g, "").slice(-5)}` : "",
    ...st,
    ...pay,
    placedAt,
    placedAtShort: placedAt,
    orderDate: fmtDate(json.createdAt),
    orderTime: fmtTime(json.createdAt),
    orderType: "Online Order",
    salesChannel: "TAJIRA App",
    placedBy: name,
    ipAddress: "",
    device: "",
    coupon: json.discountKes > 0 ? `Discount applied — KES ${json.discountKes}` : "",
    customerNote: json.customerNote || "",
    deliveryInstructions: json.installationNotes || "",
    deliveryMethod: deliveryLabel(json.deliveryMethod),
    deliveryCity: addr.city || addr.county || "—",
    footerMessage:
      st.status === "delivered"
        ? `This order was delivered on ${fmtDate(json.updatedAt)} via ${deliveryLabel(json.deliveryMethod)} to ${addr.city || "customer"}.`
        : "",
    timeline: buildTimeline(json, st),
    customer: {
      id: user.id || "",
      name,
      phone: user.phone || addr.phone || "",
      email: user.email || "",
      avatar: avatar(name, 1),
      badge: user.membershipLevel ? `${user.membershipLevel} Member` : "Customer",
      memberSince: user.createdAt ? fmtDate(user.createdAt) : "—",
      totalOrders: 0,
      totalSpentKes: 0,
      loyaltyPoints: user.pointsBalance || 0,
    },
    shippingAddress: {
      name,
      phone: addr.phone || user.phone || "",
      lines: addrLines.length ? addrLines : ["—"],
      postalCode: addr.postalCode || "",
    },
    billingAddress: {
      name,
      phone: addr.phone || user.phone || "",
      lines: addrLines.length ? addrLines : ["—"],
      postalCode: addr.postalCode || "",
    },
    items,
    summary: {
      itemCount,
      subtotalKes: json.subtotalKes || 0,
      discountLabel: json.discountKes > 0 ? "Discount" : "",
      discountKes: json.discountKes || 0,
      deliveryKes: json.deliveryKes || 0,
      packagingKes: 0,
      taxLabel: "Tax (16% VAT)",
      taxKes: json.vatKes || 0,
      totalKes: json.totalKes || 0,
      paidKes: pay.paymentStatus === "paid" ? json.totalKes || 0 : 0,
      dueKes: pay.paymentStatus === "paid" ? 0 : json.totalKes || 0,
    },
    payment: {
      method: json.paymentMethod,
      methodLabel: paymentMethodLabel(json.paymentMethod),
      transactionId: payment.reference || "",
      paidAt: json.paidAt ? fmtDateTime(json.paidAt) : "—",
      status: pay.status,
      statusLabel: pay.statusLabel,
    },
    activity: [
      {
        id: "a1",
        text: `Order ${json.orderNumber} created`,
        user: name,
        at: placedAt,
        tone: "orange",
      },
      ...(json.paidAt
        ? [
            {
              id: "a2",
              text: `Payment confirmed via ${paymentMethodLabel(json.paymentMethod)}`,
              user: "System",
              at: fmtDateTime(json.paidAt),
              tone: "blue",
            },
          ]
        : []),
    ],
    notes: [],
  };
}

async function getOrderDetail(id) {
  const raw = String(id || "").trim();
  if (!raw) return null;
  const q = isOid(raw) ? { _id: raw } : { orderNumber: raw };
  const order = await Order.findOne(q).populate(
    "user",
    "firstName lastName phone email pointsBalance membershipLevel createdAt"
  );
  if (!order) return null;
  return buildOrderDetail(order);
}

module.exports = { getOrderDetail, buildOrderDetail };
