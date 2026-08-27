const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80&sig=${sig}`;

function series() {
  const revenue = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 234000, 0, 0, 0, 0, 0, 386400, 600000];
  const sold = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 156, 0, 0, 0, 0, 0, 112, 120];
  return revenue.map((value, i) => {
    const d = i + 1;
    const show = [1, 5, 10, 16, 20, 27].includes(d);
    return {
      d: `2026-05-${String(d).padStart(2, "0")}`,
      label: show ? (d === 1 ? "May 01" : String(d).padStart(2, "0")) : "",
      dateLabel: `${d} May 2026`,
      revenue: value,
      sold: sold[i],
    };
  });
}

function getFlashDropAnalytics() {
  return {
    from: "2026-05-01",
    to: "2026-05-27",
    compareLabel: "01 Apr - 30 Apr",
    tipIndex: 15,
    kpis: {
      drops: 3,
      dropsDelta: 0,
      revenue: 1220400,
      revenueDelta: 0,
      sold: 388,
      soldDelta: 0,
      participants: 3,
      participantsDelta: 0,
      avgDiscount: 32.6,
      avgDiscountDelta: 0,
      conversion: 11.7,
      conversionDelta: 0,
    },
    revenueSeries: series(),
    topDrops: [
      { n: 1, name: "TP-Link Archer C6 Router", sku: "FD-2026-0001", revenue: 234000, sold: 156, discount: "40%", conversion: 15.6, image: img("photo-1606904825846-647eb07f5be2", 1) },
      { n: 2, name: "Hikvision DS-2CD2143G2-I 4MP Dome", sku: "FD-2026-0002", revenue: 386400, sold: 112, discount: "35%", conversion: 14.2, image: img("photo-1557597774-9d273bd59043", 2) },
      { n: 3, name: "KSh 5,000 Shopping Voucher", sku: "FD-2026-0003", revenue: 600000, sold: 120, discount: "Voucher", conversion: 22.5, image: img("photo-1556742049-0cfed4f6a45d", 3) },
    ],
    categoryRevenue: [
      { key: "net", name: "Networking", pct: 19.2, value: 234000, money: "KSh 234K", color: "#6D28D9" },
      { key: "cctv", name: "CCTV", pct: 31.7, value: 386400, money: "KSh 386K", color: "#2563eb" },
      { key: "vouchers", name: "Vouchers", pct: 49.1, value: 600000, money: "KSh 600K", color: "#ea580c" },
    ],
    discounts: [
      { label: "0–10%", pct: 0 },
      { label: "11–20%", pct: 0 },
      { label: "21–30%", pct: 0 },
      { label: "31–40%", pct: 66.7 },
      { label: "41–50%", pct: 0 },
      { label: "51–60%", pct: 0 },
      { label: "60%+", pct: 0 },
    ],
    status: [
      { key: "active", name: "Active", count: 3, pct: 100, color: "#16a34a" },
      { key: "upcoming", name: "Upcoming", count: 0, pct: 0, color: "#ea580c" },
      { key: "completed", name: "Completed", count: 0, pct: 0, color: "#2563eb" },
      { key: "cancelled", name: "Cancelled", count: 0, pct: 0, color: "#94a3b8" },
    ],
    performance: [
      { name: "Networking", drops: 1, participants: 1, sold: 156, revenue: 234000, avgDiscount: 40, conversion: 15.6 },
      { name: "CCTV", drops: 1, participants: 1, sold: 112, revenue: 386400, avgDiscount: 35, conversion: 14.2 },
      { name: "Vouchers", drops: 1, participants: 1, sold: 120, revenue: 600000, avgDiscount: 0, conversion: 22.5 },
    ],
    totals: {
      drops: 3,
      participants: 3,
      sold: 388,
      revenue: 1220400,
      avgDiscount: 32.6,
      conversion: 11.7,
    },
    insights: [
      { icon: "trend", tone: "green", text: "Sample flash drops show healthy conversion on vouchers." },
      { icon: "tag", tone: "purple", text: "Vouchers generate the highest conversion rate (22.5%)." },
      { icon: "box", tone: "blue", text: "CCTV contributes the most hardware revenue in this sample." },
    ],
  };
}

module.exports = { getFlashDropAnalytics };
