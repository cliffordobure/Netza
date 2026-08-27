function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff`;
}

function maySeries() {
  const days = [];
  for (let d = 1; d <= 27; d += 1) {
    const participants = d % 9 === 0 ? 1 : 0;
    const entries = participants * 2;
    const points = participants * 180;
    days.push({
      d,
      label: String(d),
      dateLabel: `${d} May`,
      participants,
      entries,
      points,
    });
  }
  days[26].participants = 3;
  days[26].entries = 6;
  days[26].points = 540;
  return days;
}

function buildReport() {
  return {
    from: "2026-05-01",
    to: "2026-05-27",
    rangeLabel: "01 May 2026 - 27 May 2026",
    compareLabel: "Apr 2026",
    kpis: [
      { key: "competitions", label: "Total Competitions", value: 2, hint: "↑ 0% vs Apr", icon: "trophy", tone: "purple" },
      { key: "participants", label: "Total Participants", value: 3, hint: "↑ 0%", icon: "users", tone: "green" },
      { key: "entries", label: "Total Entries", value: 6, hint: "↑ 0%", icon: "file", tone: "blue" },
      { key: "points", label: "Points Awarded", value: 540, hint: "↑ 0%", icon: "star", tone: "gold" },
      { key: "prizes", label: "Prizes Distributed", value: 2, hint: "↑ 0%", icon: "gift", tone: "red" },
      { key: "value", label: "Total Prize Value", value: 40000, hint: "↑ 0%", icon: "trend", tone: "teal", money: true },
    ],
    compare: [
      { label: "Total Competitions", apr: 2, may: 2, change: "↑ 0%" },
      { label: "Total Participants", apr: 3, may: 3, change: "↑ 0%" },
      { label: "Total Entries", apr: 5, may: 6, change: "↑ 20%" },
      { label: "Points Awarded", apr: 480, may: 540, change: "↑ 12.5%" },
      { label: "Prizes Distributed", apr: 2, may: 2, change: "↑ 0%" },
      { label: "Total Prize Value", apr: 40000, may: 40000, change: "↑ 0%", money: true },
    ],
    participation: maySeries(),
    tipIndex: 15,
    entriesByCompetition: [
      { key: "quiz", name: "Flash Tech Quiz", count: 6, pct: 100, color: "#6D28D9" },
      { key: "refer", name: "Refer & Win Router", count: 0, pct: 0, color: "#16A34A" },
      { key: "review", name: "Review & Earn More", count: 0, pct: 0, color: "#2563EB" },
    ],
    topCompetitions: [
      { name: "Flash Tech Quiz", participants: 3, entries: 6, points: 540 },
      { name: "Refer & Win Router", participants: 0, entries: 0, points: 0 },
      { name: "Review & Earn More", participants: 0, entries: 0, points: 0 },
    ],
    channels: [
      { key: "app", label: "Mobile App", count: 2, pct: 66.7, color: "#6D28D9" },
      { key: "website", label: "Website", count: 1, pct: 33.3, color: "#2563EB" },
      { key: "email", label: "Email", count: 0, pct: 0, color: "#FF7A00" },
      { key: "social", label: "Social Media", count: 0, pct: 0, color: "#16A34A" },
    ],
    demographics: {
      gender: [
        { key: "male", label: "Male", count: 2, pct: 66.7, color: "#2563EB" },
        { key: "female", label: "Female", count: 1, pct: 33.3, color: "#6D28D9" },
      ],
      age: [
        { key: "18", label: "18–24", pct: 33.3, color: "#6D28D9" },
        { key: "25", label: "25–34", pct: 33.3, color: "#2563EB" },
        { key: "35", label: "35–44", pct: 33.4, color: "#FF7A00" },
        { key: "45", label: "45+", pct: 0, color: "#0D9488" },
      ],
    },
    completion: {
      pct: 66.7,
      completed: 4,
      inProgress: 2,
      abandoned: 0,
    },
    topParticipants: [
      { name: "Brian Otieno", entries: 3, points: 190, avatar: avatar("Brian Otieno") },
      { name: "Faith Wanjiku", entries: 2, points: 180, avatar: avatar("Faith Wanjiku") },
      { name: "Daniel Mwangi", entries: 3, points: 180, avatar: avatar("Daniel Mwangi") },
    ],
    performance: [
      { name: "Flash Tech Quiz", status: "active", type: "quiz", participants: 3, entries: 6, completion: 66.7, points: 540, prizeValue: 40000 },
      { name: "Refer & Win Router", status: "upcoming", type: "referral", participants: 0, entries: 0, completion: 0, points: 0, prizeValue: 13000 },
      { name: "Review & Earn More", status: "upcoming", type: "engagement", participants: 0, entries: 0, completion: 0, points: 0, prizeValue: 8000 },
    ],
    impact: [
      { label: "Total Points Awarded", value: 540, hint: "↑ 0%", icon: "star", tone: "gold" },
      { label: "Points Redeemed", value: 200, hint: "↑ 0%", icon: "gift", tone: "purple" },
      { label: "Avg Points / Participant", value: 180, hint: "↑ 0%", icon: "users", tone: "blue" },
      { label: "Redemption Rate", value: "37%", hint: "↑ 0%", icon: "trend", tone: "green" },
      { label: "Active Point Holders", value: 3, hint: "↑ 0%", icon: "bolt", tone: "orange" },
    ],
    activity: [
      { kind: "create", title: "New competition ‘Flash Tech Quiz’ created", detail: "Created by Admin User", at: "2h ago", icon: "plus" },
      { kind: "winners", title: "Winners queued for Flash Tech Quiz", detail: "Prizes queued for fulfilment", at: "5h ago", icon: "megaphone" },
      { kind: "prize", title: "Prize stock updated: TP-Link Archer C6", detail: "Quantity updated 20 → 25", at: "8h ago", icon: "gift" },
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
