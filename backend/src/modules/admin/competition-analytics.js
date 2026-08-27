function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff`;
}

function maySeries() {
  const days = [];
  for (let d = 1; d <= 27; d += 1) {
    const t = (d - 1) / 26;
    const hump = Math.sin(t * Math.PI);
    let participants = Math.round(220 + hump * 380 + (d % 3) * 12);
    let entries = Math.round(participants * 3.55 + hump * 90);
    let points = Math.round(participants * 19.2);
    if (d === 16) {
      participants = 612;
      entries = 1840;
      points = 11850;
    }
    days.push({
      d,
      label: String(d),
      dateLabel: `${d} May`,
      participants,
      entries,
      points,
    });
  }
  return days;
}

function buildReport() {
  return {
    from: "2026-05-01",
    to: "2026-05-27",
    rangeLabel: "01 May 2026 - 27 May 2026",
    compareLabel: "Apr 2026",
    kpis: [
      { key: "competitions", label: "Total Competitions", value: 28, hint: "↑ 12% vs Apr", icon: "trophy", tone: "purple" },
      { key: "participants", label: "Total Participants", value: 12458, hint: "↑ 18.4%", icon: "users", tone: "green" },
      { key: "entries", label: "Total Entries", value: 45672, hint: "↑ 21.7%", icon: "file", tone: "blue" },
      { key: "points", label: "Points Awarded", value: 246750, hint: "↑ 23.6%", icon: "star", tone: "gold" },
      { key: "prizes", label: "Prizes Distributed", value: 2310, hint: "↑ 15.3%", icon: "gift", tone: "red" },
      { key: "value", label: "Total Prize Value", value: 3482000, hint: "↑ 16.8%", icon: "trend", tone: "teal", money: true },
    ],
    compare: [
      { label: "Total Competitions", apr: 25, may: 28, change: "↑ 12%" },
      { label: "Total Participants", apr: 10522, may: 12458, change: "↑ 18.4%" },
      { label: "Total Entries", apr: 37528, may: 45672, change: "↑ 21.7%" },
      { label: "Points Awarded", apr: 199636, may: 246750, change: "↑ 23.6%" },
      { label: "Prizes Distributed", apr: 2003, may: 2310, change: "↑ 15.3%" },
      { label: "Total Prize Value", apr: 2981000, may: 3482000, change: "↑ 16.8%", money: true },
    ],
    participation: maySeries(),
    tipIndex: 15,
    entriesByCompetition: [
      { key: "quiz", name: "Flash Tech Quiz", count: 12423, pct: 27.2, color: "#6D28D9" },
      { key: "refer", name: "Refer & Win Router", count: 9865, pct: 21.6, color: "#16A34A" },
      { key: "review", name: "Review & Earn More", count: 7033, pct: 15.4, color: "#2563EB" },
      { key: "buy", name: "Buy & Win CCTV Kit", count: 5846, pct: 12.8, color: "#FF7A00" },
      { key: "june", name: "June Grand Giveaway", count: 4613, pct: 10.1, color: "#CA8A04" },
      { key: "other", name: "Other", count: 5892, pct: 12.9, color: "#0B1F3A" },
    ],
    topCompetitions: [
      { name: "Flash Tech Quiz", participants: 3245, entries: 12423, points: 245870 },
      { name: "Refer & Win Router", participants: 2690, entries: 9865, points: 98400 },
      { name: "Review & Earn More", participants: 2140, entries: 7033, points: 64200 },
      { name: "Buy & Win CCTV Kit", participants: 1688, entries: 5846, points: 52180 },
      { name: "June Grand Giveaway", participants: 1420, entries: 4613, points: 38800 },
    ],
    channels: [
      { key: "app", label: "Mobile App", count: 7238, pct: 58.1, color: "#6D28D9" },
      { key: "website", label: "Website", count: 3115, pct: 25.0, color: "#2563EB" },
      { key: "email", label: "Email", count: 1258, pct: 10.1, color: "#FF7A00" },
      { key: "social", label: "Social Media", count: 847, pct: 6.8, color: "#16A34A" },
    ],
    demographics: {
      gender: [
        { key: "male", label: "Male", count: 7012, pct: 56.3, color: "#2563EB" },
        { key: "female", label: "Female", count: 5446, pct: 43.7, color: "#6D28D9" },
      ],
      age: [
        { key: "18", label: "18–24", pct: 28.0, color: "#6D28D9" },
        { key: "25", label: "25–34", pct: 39.1, color: "#2563EB" },
        { key: "35", label: "35–44", pct: 17.2, color: "#FF7A00" },
        { key: "45", label: "45+", pct: 17.7, color: "#0D9488" },
      ],
    },
    completion: {
      pct: 67.8,
      completed: 30942,
      inProgress: 8452,
      abandoned: 6278,
    },
    topParticipants: [
      { name: "Brian Otieno", entries: 12, points: 5240, avatar: avatar("Brian Otieno") },
      { name: "Daniel Mwangi", entries: 9, points: 3120, avatar: avatar("Daniel Mwangi") },
      { name: "Alice Chebet", entries: 8, points: 2200, avatar: avatar("Alice Chebet") },
      { name: "Faith Wanjiku", entries: 7, points: 1860, avatar: avatar("Faith Wanjiku") },
      { name: "Samuel Kariuki", entries: 6, points: 980, avatar: avatar("Samuel Kariuki") },
    ],
    performance: [
      { name: "Flash Tech Quiz", status: "active", type: "quiz", participants: 3245, entries: 12423, completion: 96.1, points: 245870, prizeValue: 40000 },
      { name: "Refer & Win Router", status: "active", type: "referral", participants: 2690, entries: 9865, completion: 81.4, points: 98400, prizeValue: 13000 },
      { name: "Review & Earn More", status: "active", type: "engagement", participants: 2140, entries: 7033, completion: 74.2, points: 64200, prizeValue: 8000 },
      { name: "Buy & Win CCTV Kit", status: "upcoming", type: "purchase", participants: 1688, entries: 5846, completion: 0, points: 52180, prizeValue: 45000 },
      { name: "June Grand Giveaway", status: "upcoming", type: "lucky_draw", participants: 1420, entries: 4613, completion: 0, points: 38800, prizeValue: 25000 },
      { name: "Madaraka Day Promo", status: "completed", type: "engagement", participants: 1180, entries: 2210, completion: 88.6, points: 29400, prizeValue: 12000 },
      { name: "March Madness Draw", status: "completed", type: "lucky_draw", participants: 1540, entries: 1980, completion: 91.2, points: 33600, prizeValue: 18000 },
      { name: "Networking Pro", status: "active", type: "quiz", participants: 860, entries: 1702, completion: 62.4, points: 21400, prizeValue: 6000 },
    ],
    impact: [
      { label: "Total Points Awarded", value: 246750, hint: "↑ 23.6%", icon: "star", tone: "gold" },
      { label: "Points Redeemed", value: 182400, hint: "↑ 14.2%", icon: "gift", tone: "purple" },
      { label: "Avg Points / Participant", value: 20, hint: "↑ 4.1%", icon: "users", tone: "blue" },
      { label: "Redemption Rate", value: "74%", hint: "↑ 2.1%", icon: "trend", tone: "green" },
      { label: "Active Point Holders", value: 9840, hint: "↑ 11.4%", icon: "bolt", tone: "orange" },
    ],
    activity: [
      { kind: "create", title: "New competition ‘Flash Tech Quiz’ created", detail: "Created by Admin User", at: "2h ago", icon: "plus" },
      { kind: "winners", title: "20 winners announced for Flash Tech Quiz", detail: "Prizes queued for fulfilment", at: "5h ago", icon: "megaphone" },
      { kind: "prize", title: "Prize stock updated: TP-Link Archer C6", detail: "Quantity updated 20 → 25", at: "8h ago", icon: "gift" },
      { kind: "points", title: "Brian Otieno reached 950 points", detail: "Best score 19/20 on Flash Tech Quiz", at: "12h ago", icon: "star" },
      { kind: "status", title: "Refer & Win Router marked Active", detail: "Updated by Admin User", at: "1d ago", icon: "bolt" },
    ],
  };
}

function attachIds(report, competitions = []) {
  const byTitle = {};
  const byCode = {};
  for (const c of competitions) {
    const id = String(c._id || c.id || "");
    if (c.title) byTitle[c.title] = id;
    if (c.code) byCode[c.code] = id;
  }
  const withId = (row) => ({ ...row, id: byTitle[row.name] || null });
  return {
    ...report,
    leaderboardCompetitionId: byCode["COMP-328"] || byTitle["Flash Tech Quiz"] || null,
    topCompetitions: (report.topCompetitions || []).map(withId),
    performance: (report.performance || []).map(withId),
  };
}

function getCompetitionAnalytics(competitions = []) {
  return attachIds(buildReport(), competitions);
}

module.exports = { getCompetitionAnalytics };
