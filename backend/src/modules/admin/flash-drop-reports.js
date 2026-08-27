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

function getFlashDropReports() {
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
    status: [
      { key: "completed", name: "Completed", count: 14, pct: 58.3, color: "#16a34a" },
      { key: "upcoming", name: "Upcoming", count: 5, pct: 20.8, color: "#2563eb" },
      { key: "ongoing", name: "Ongoing", count: 2, pct: 8.3, color: "#ea580c" },
      { key: "cancelled", name: "Cancelled", count: 3, pct: 12.5, color: "#64748b" },
    ],
    categoryRevenue: [
      { key: "net", name: "Networking", pct: 38.5, value: 4806960, money: "KSh 4.81M", color: "#6D28D9" },
      { key: "cctv", name: "CCTV", pct: 31.6, value: 3945449, money: "KSh 3.95M", color: "#2563eb" },
      { key: "wifi", name: "Wi-Fi", pct: 12.6, value: 1573186, money: "KSh 1.57M", color: "#ea580c" },
      { key: "acc", name: "Accessories", pct: 9.4, value: 1173646, money: "KSh 1.17M", color: "#16a34a" },
      { key: "other", name: "Others", pct: 7.9, value: 986359, money: "KSh 0.99M", color: "#94a3b8" },
    ],
    topDrops: [
      {
        n: 1,
        name: "TP-Link Archer C6 Router",
        sku: "FD-2026-0001",
        category: "Networking",
        startLabel: "20 May 2026",
        sold: 200,
        revenue: 234000,
        discount: "40%",
        participants: 1248,
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
        sold: 150,
        revenue: 386400,
        discount: "35%",
        participants: 980,
        conversion: 14.2,
        status: "completed",
        image: img("photo-1557597774-9d273bd59043", 2),
      },
      {
        n: 3,
        name: "Dahua 2MP CCTV Camera",
        sku: "FD-2026-0017",
        category: "CCTV",
        startLabel: "16 May 2026",
        sold: 48,
        revenue: 156000,
        discount: "32%",
        participants: 412,
        conversion: 13.4,
        status: "completed",
        image: img("photo-1558002038-1055907df827", 17),
      },
      {
        n: 4,
        name: "KSh 1,000 Shopping Voucher",
        sku: "FD-2026-0023",
        category: "Vouchers",
        startLabel: "14 May 2026",
        sold: 500,
        revenue: 500000,
        discount: "Voucher",
        participants: 1860,
        conversion: 22.5,
        status: "completed",
        image: img("photo-1556742049-0cfed4f6a45d", 23),
      },
      {
        n: 5,
        name: "TP-Link Archer AX55 Wi-Fi 6 Router",
        sku: "FD-2026-0009",
        category: "Wi-Fi",
        startLabel: "12 May 2026",
        sold: 120,
        revenue: 1890000,
        discount: "45%",
        participants: 1540,
        conversion: 18.1,
        status: "completed",
        image: img("photo-1606904825846-647eb07f5be2", 9),
      },
    ],
    discounts: [
      { label: "0–10%", pct: 4.2 },
      { label: "11–20%", pct: 11.5 },
      { label: "21–30%", pct: 18.6 },
      { label: "31–40%", pct: 26.8 },
      { label: "41–50%", pct: 19.6 },
      { label: "51–60%", pct: 12.3 },
      { label: "60%+", pct: 7.0 },
    ],
    channels: [
      { key: "app", name: "Mobile App", participants: 12842, sold: 4280, revenue: 6240000, conversion: 12.8 },
      { key: "website", name: "Website", participants: 7420, sold: 2180, revenue: 3860000, conversion: 10.4 },
      { key: "email", name: "Email Campaign", participants: 3180, sold: 1240, revenue: 1420000, conversion: 18.6 },
      { key: "social", name: "Social Media", participants: 1680, sold: 620, revenue: 685600, conversion: 9.2 },
      { key: "sms", name: "SMS", participants: 616, sold: 322, revenue: 280000, conversion: 8.4 },
    ],
    exportReports: [
      { id: "summary", name: "Flash Drops Summary Report" },
      { id: "sales", name: "Sales Performance Report" },
      { id: "participants", name: "Participant Report" },
      { id: "products", name: "Product Performance Report" },
      { id: "discounts", name: "Discount Analysis Report" },
      { id: "logs", name: "Activity Logs Report" },
    ],
    insights: [
      { icon: "trend", tone: "green", text: "Revenue increased by 16.8% compared to the previous period." },
      { icon: "tag", tone: "purple", text: "Networking category generated the highest revenue (38.5%)." },
      { icon: "gift", tone: "blue", text: "Voucher drops have the highest conversion rate (22.5%)." },
      { icon: "cart", tone: "orange", text: "Mobile App is the top performing channel with 12,842 participants." },
    ],
  };
}

module.exports = { getFlashDropReports };
