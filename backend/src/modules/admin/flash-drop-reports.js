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

function getFlashDropReports() {
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
    status: [
      { key: "completed", name: "Completed", count: 2, pct: 66.7, color: "#16a34a" },
      { key: "upcoming", name: "Upcoming", count: 0, pct: 0, color: "#2563eb" },
      { key: "ongoing", name: "Ongoing", count: 1, pct: 33.3, color: "#ea580c" },
      { key: "cancelled", name: "Cancelled", count: 0, pct: 0, color: "#64748b" },
    ],
    categoryRevenue: [
      { key: "net", name: "Networking", pct: 19.2, value: 234000, money: "KSh 234K", color: "#6D28D9" },
      { key: "cctv", name: "CCTV", pct: 31.7, value: 386400, money: "KSh 386K", color: "#2563eb" },
      { key: "vouchers", name: "Vouchers", pct: 49.1, value: 600000, money: "KSh 600K", color: "#ea580c" },
    ],
    topDrops: [
      {
        n: 1,
        name: "TP-Link Archer C6 Router",
        sku: "FD-2026-0001",
        category: "Networking",
        startLabel: "20 May 2026",
        sold: 156,
        revenue: 234000,
        discount: "40%",
        participants: 1,
        conversion: 15.6,
        status: "completed",
        image: img("photo-1606904825846-647eb07f5be2", 1),
      },
      {
        n: 2,
        name: "Hikvision DS-2CD2143G2-I 4MP Dome",
        sku: "FD-2026-0002",
        category: "CCTV",
        startLabel: "18 May 2026",
        sold: 112,
        revenue: 386400,
        discount: "35%",
        participants: 1,
        conversion: 14.2,
        status: "completed",
        image: img("photo-1557597774-9d273bd59043", 2),
      },
      {
        n: 3,
        name: "KSh 5,000 Shopping Voucher",
        sku: "FD-2026-0003",
        category: "Vouchers",
        startLabel: "14 May 2026",
        sold: 120,
        revenue: 600000,
        discount: "Voucher",
        participants: 1,
        conversion: 22.5,
        status: "ongoing",
        image: img("photo-1556742049-0cfed4f6a45d", 3),
      },
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
    channels: [
      { key: "app", name: "Mobile App", participants: 2, sold: 2, revenue: 620400, conversion: 12.8 },
      { key: "website", name: "Website", participants: 1, sold: 1, revenue: 600000, conversion: 10.4 },
      { key: "email", name: "Email Campaign", participants: 0, sold: 0, revenue: 0, conversion: 0 },
    ],
    exportReports: [
      { id: "summary", name: "Flash Drops Summary Report" },
      { id: "sales", name: "Sales Performance Report" },
      { id: "participants", name: "Participant Report" },
    ],
    insights: [
      { icon: "trend", tone: "green", text: "Sample flash drops are performing within expected ranges." },
      { icon: "tag", tone: "purple", text: "Vouchers contribute the largest share of sample revenue." },
      { icon: "gift", tone: "blue", text: "Voucher drops have the highest conversion rate (22.5%)." },
    ],
  };
}

module.exports = { getFlashDropReports };
