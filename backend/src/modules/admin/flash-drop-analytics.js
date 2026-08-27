const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80&sig=${sig}`;

function series() {
  const revenue = [
    420000, 468000, 390000, 510000, 545000, 480000, 612000,
    588000, 670000, 720000, 690000, 810000, 860000, 940000,
    1020000, 1248500, 980000, 890000, 760000, 820000, 740000,
    690000, 640000, 580000, 610000, 540000, 498000,
  ];
  const sold = [
    280, 310, 260, 340, 360, 320, 410,
    390, 450, 480, 460, 540, 580, 640,
    710, 842, 660, 600, 510, 550, 500,
    460, 430, 390, 410, 360, 330,
  ];
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
      drops: 24,
      dropsDelta: 14.3,
      revenue: 12485600,
      revenueDelta: 16.8,
      sold: 8642,
      soldDelta: 18.3,
      participants: 25736,
      participantsDelta: 21.6,
      avgDiscount: 32.6,
      avgDiscountDelta: -1.8,
      conversion: 11.7,
      conversionDelta: 2.9,
    },
    revenueSeries: series(),
    topDrops: [
      { n: 1, name: "TP-Link Archer C6 Router", sku: "FD-2026-0001", revenue: 234000, sold: 156, discount: "40%", conversion: 15.6, image: img("photo-1606904825846-647eb07f5be2", 1) },
      { n: 2, name: "Hikvision DS-2CD2143G2-I 4MP Dome", sku: "FD-2026-0002", revenue: 386400, sold: 112, discount: "35%", conversion: 14.2, image: img("photo-1557597774-9d273bd59043", 2) },
      { n: 3, name: "Dahua 2MP CCTV Camera", sku: "FD-2026-0017", revenue: 512000, sold: 248, discount: "32%", conversion: 13.4, image: img("photo-1558002038-1055907df827", 17) },
      { n: 4, name: "KSh 1,000 Shopping Voucher", sku: "FD-2026-0023", revenue: 1240000, sold: 1240, discount: "Voucher", conversion: 22.5, image: img("photo-1556742049-0cfed4f6a45d", 23) },
      { n: 5, name: "TP-Link Archer AX55 Wi-Fi 6 Router", sku: "FD-2026-0009", revenue: 1890000, sold: 420, discount: "45%", conversion: 18.1, image: img("photo-1606904825846-647eb07f5be2", 9) },
    ],
    categoryRevenue: [
      { key: "net", name: "Networking", pct: 34.2, value: 4270000, money: "KSh 4.27M", color: "#6D28D9" },
      { key: "cctv", name: "CCTV", pct: 28.7, value: 3580000, money: "KSh 3.58M", color: "#2563eb" },
      { key: "wifi", name: "Wi-Fi", pct: 14.6, value: 1820000, money: "KSh 1.82M", color: "#ea580c" },
      { key: "cables", name: "Cables & Accessories", pct: 9.8, value: 1220000, money: "KSh 1.22M", color: "#16a34a" },
      { key: "other", name: "Other Categories", pct: 12.7, value: 1600000, money: "KSh 1.60M", color: "#94a3b8" },
    ],
    discounts: [
      { label: "0–10%", pct: 4.2 },
      { label: "11–20%", pct: 11.5 },
      { label: "21–30%", pct: 18.4 },
      { label: "31–40%", pct: 26.8 },
      { label: "41–50%", pct: 19.6 },
      { label: "51–60%", pct: 12.3 },
      { label: "60%+", pct: 7.2 },
    ],
    status: [
      { key: "active", name: "Active", count: 3, pct: 12.5, color: "#16a34a" },
      { key: "upcoming", name: "Upcoming", count: 5, pct: 20.8, color: "#ea580c" },
      { key: "completed", name: "Completed", count: 16, pct: 66.7, color: "#2563eb" },
      { key: "cancelled", name: "Cancelled", count: 0, pct: 0, color: "#94a3b8" },
    ],
    performance: [
      { name: "Networking", drops: 8, participants: 8420, sold: 2810, revenue: 4270000, avgDiscount: 34.2, conversion: 12.4 },
      { name: "CCTV", drops: 6, participants: 7120, sold: 2480, revenue: 3580000, avgDiscount: 28.8, conversion: 11.2 },
      { name: "Wi-Fi", drops: 3, participants: 3890, sold: 1180, revenue: 1820000, avgDiscount: 31.5, conversion: 10.8 },
      { name: "Cables & Accessories", drops: 2, participants: 2140, sold: 720, revenue: 1220000, avgDiscount: 20.4, conversion: 8.6 },
      { name: "Access Control", drops: 2, participants: 1860, sold: 540, revenue: 780000, avgDiscount: 30.0, conversion: 9.1 },
      { name: "Vouchers", drops: 2, participants: 1840, sold: 760, revenue: 600000, avgDiscount: 0, conversion: 22.5 },
      { name: "Other", drops: 1, participants: 466, sold: 152, revenue: 215600, avgDiscount: 18.0, conversion: 7.4 },
    ],
    totals: {
      drops: 24,
      participants: 25736,
      sold: 8642,
      revenue: 12485600,
      avgDiscount: 32.6,
      conversion: 11.7,
    },
    insights: [
      { icon: "trend", tone: "green", text: "Revenue increased by 16.8% compared to the previous period." },
      { icon: "tag", tone: "purple", text: "Vouchers generate the highest conversion rate (22.5%)." },
      { icon: "box", tone: "blue", text: "Networking category contributes the most revenue (34.2%)." },
      { icon: "bolt", tone: "orange", text: "Average discount dropped by 1.8% compared to last period." },
    ],
  };
}

module.exports = { getFlashDropAnalytics };
