const avatar = (name, n) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=6d28d9&size=64&sig=${n}`;

const STATUSES = [
  { key: "completed", label: "Completed", color: "#16a34a" },
  { key: "pending", label: "Pending", color: "#ea580c" },
  { key: "rejected", label: "Rejected", color: "#dc2626" },
];

const REASONS = [
  { key: "defective", label: "Item defective" },
  { key: "wrong_item", label: "Wrong item delivered" },
  { key: "not_as_described", label: "Item not as described" },
  { key: "changed_mind", label: "Changed my mind" },
  { key: "damaged", label: "Damaged in transit" },
  { key: "late", label: "Delivered too late" },
];

const RETURN_TYPES = [
  { value: "refund", label: "Refund" },
  { value: "exchange", label: "Exchange" },
  { value: "store_credit", label: "Store Credit" },
];

const CUSTOMERS = [
  { name: "Mercy Wanjiku", phone: "+254 712 345 678" },
  { name: "James Mwangi", phone: "+254 722 111 222" },
  { name: "Anne Mutua", phone: "+254 733 444 555" },
  { name: "Peter Otieno", phone: "+254 701 888 999" },
  { name: "Grace Akinyi", phone: "+254 715 222 333" },
  { name: "David Kipchoge", phone: "+254 720 555 666" },
  { name: "Faith Achieng", phone: "+254 711 777 888" },
  { name: "Samuel Mutua", phone: "+254 708 333 444" },
  { name: "Brian Ochieng", phone: "+254 724 999 000" },
  { name: "Linda Chebet", phone: "+254 716 123 456" },
];

const SEED = [
  { status: "completed", reason: "defective", type: "refund", date: "27 May 2026", time: "11:20 AM", refund: 8450 },
  { status: "pending", reason: "wrong_item", type: "exchange", date: "27 May 2026", time: "09:45 AM", refund: 6200 },
  { status: "completed", reason: "not_as_described", type: "refund", date: "26 May 2026", time: "04:12 PM", refund: 12500 },
  { status: "rejected", reason: "changed_mind", type: "refund", date: "26 May 2026", time: "01:30 PM", refund: 0 },
  { status: "pending", reason: "damaged", type: "refund", date: "25 May 2026", time: "03:55 PM", refund: 9800 },
  { status: "completed", reason: "defective", type: "store_credit", date: "25 May 2026", time: "10:05 AM", refund: 5400 },
  { status: "completed", reason: "wrong_item", type: "exchange", date: "24 May 2026", time: "02:40 PM", refund: 7100 },
  { status: "pending", reason: "late", type: "refund", date: "24 May 2026", time: "11:15 AM", refund: 4300 },
  { status: "rejected", reason: "changed_mind", type: "refund", date: "23 May 2026", time: "05:20 PM", refund: 0 },
  { status: "completed", reason: "damaged", type: "refund", date: "23 May 2026", time: "08:50 AM", refund: 11200 },
];

function buildRows() {
  return SEED.map((row, i) => {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const st = STATUSES.find((s) => s.key === row.status);
    const reason = REASONS.find((r) => r.key === row.reason);
    const type = RETURN_TYPES.find((t) => t.value === row.type);
    return {
      id: `ret${i + 1}`,
      n: i + 1,
      returnId: `RET-2026-${String(1042 - i).padStart(5, "0")}`,
      orderId: `ORD-2026-${String(12845 - i).padStart(6, "0")}`,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAvatar: avatar(customer.name, i + 360),
      reasonKey: row.reason,
      reason: reason.label,
      returnType: row.type,
      returnTypeLabel: type.label,
      status: row.status,
      statusLabel: st.label,
      date: row.date,
      time: row.time,
      refund: row.refund,
    };
  });
}

function filterRows(rows, query = {}) {
  let list = [...rows];
  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.returnId.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (query.reason) list = list.filter((r) => r.reasonKey === query.reason);
  if (query.returnType) list = list.filter((r) => r.returnType === query.returnType);
  return list;
}

function getDeliveryReturns(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const all = buildRows();
  const filtered = filterRows(all, query);
  const useDemoTotal = !query.q && !query.status && !query.reason && !query.returnType;
  const total = useDemoTotal ? 32 : filtered.length;
  const skip = (page - 1) * limit;
  const returns =
    page === 1 && useDemoTotal && limit >= 10
      ? all.slice(0, Math.min(limit, all.length))
      : filtered.slice(skip, skip + limit);

  const stats = {
    total: 32,
    totalDelta: 14.3,
    totalHint: "vs last month",
    completed: 18,
    completedPct: 56.3,
    completedHint: "of total",
    pending: 8,
    pendingPct: 25.0,
    pendingHint: "of total",
    refundsIssued: 128450,
    refundsDelta: 21.6,
    refundsHint: "vs last month",
    rejected: 6,
    rejectedPct: 18.7,
    rejectedHint: "of total",
  };

  return {
    total,
    page,
    limit,
    stats,
    returns,
    statusDonut: [
      { key: "completed", name: "Completed", value: 18, color: "#16a34a", pct: 56.3 },
      { key: "pending", name: "Pending", value: 8, color: "#ea580c", pct: 25.0 },
      { key: "rejected", name: "Rejected", value: 6, color: "#dc2626", pct: 18.7 },
    ],
    topReasons: [
      { name: "Item defective", count: 10, pct: 31.3 },
      { name: "Wrong item delivered", count: 6, pct: 18.8 },
      { name: "Item not as described", count: 5, pct: 15.6 },
      { name: "Changed my mind", count: 4, pct: 12.5 },
      { name: "Damaged in transit", count: 3, pct: 9.4 },
    ],
    financial: [
      { key: "totalRefunds", label: "Total Refunds (This Month)", value: "KES 128,450" },
      { key: "avgRefund", label: "Average Refund Amount", value: "KES 6,025" },
      { key: "issued", label: "Refunds Issued", value: "18" },
      { key: "pending", label: "Pending Refunds", value: "KES 42,300" },
    ],
    policyNote: "Return window is 7 days from delivery date. Customize in Return Settings.",
    filters: {
      statuses: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      reasons: REASONS.map((r) => ({ value: r.key, label: r.label })),
      returnTypes: RETURN_TYPES,
    },
    footerMessage: "Tip: Review pending returns regularly to improve customer satisfaction and reduce return rates.",
  };
}

module.exports = { getDeliveryReturns };
