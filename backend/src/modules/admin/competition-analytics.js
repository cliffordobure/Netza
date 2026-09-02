const { Competition, User, PointsTransaction } = require("../../models");

const COLORS = ["#6D28D9", "#16A34A", "#2563EB", "#FF7A00", "#0D9488", "#DC2626", "#F59E0B"];

function parseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "P")}&background=6D28D9&color=fff`;
}

function ymd(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function fmtRange(from, to) {
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  const a = from ? new Intl.DateTimeFormat("en-GB", opts).format(from) : "";
  const b = to ? new Intl.DateTimeFormat("en-GB", opts).format(to) : "";
  if (a && b) return `${a} - ${b}`;
  return a || b || "All time";
}

function fmtRelative(value) {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  if (ms < 86400000 * 7) return `${Math.floor(ms / 86400000)}d ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(value));
}

function pctChange(curr, prev) {
  if (!prev) return curr ? "↑ 100%" : "↑ 0%";
  const d = ((curr - prev) / prev) * 100;
  const arrow = d >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(d).toFixed(1)}%`;
}

function resolveStatus(doc) {
  const raw = String(doc.status || "").toLowerCase();
  if (raw === "cancelled") return "cancelled";
  if (raw === "completed" || raw === "ended") return "completed";
  if (raw === "upcoming") return "upcoming";
  if (raw === "active") return "active";
  const now = Date.now();
  const start = doc.startsAt ? new Date(doc.startsAt).getTime() : 0;
  const end = doc.endsAt ? new Date(doc.endsAt).getTime() : 0;
  if (end && now > end) return "completed";
  if (start && now < start) return "upcoming";
  return "active";
}

function metricsFor(doc) {
  const extra = parseJson(doc.overviewJson);
  const participants = Number(doc.participantCount) || 0;
  const entries = Number(doc.totalEntries || extra.totalEntries) || 0;
  const completed = Number(doc.completedEntries || extra.completedEntries) || 0;
  const points = Number(doc.pointsAwarded || extra.pointsAwarded) || 0;
  const prizeValue = Number(doc.prizePoolKes || extra.prizePoolKes) || 0;
  const winners = Number(doc.winnerCount) || (Array.isArray(doc.prizes)
    ? doc.prizes.reduce((s, p) => s + (Number(p.winners) || 0), 0)
    : 0);
  const completion = entries
    ? Number(((completed / entries) * 100).toFixed(1))
    : (participants ? Number(((completed / participants) * 100).toFixed(1)) : 0);
  return { extra, participants, entries, completed, points, prizeValue, winners, completion };
}

function inRange(doc, from, to) {
  const stamps = [doc.startsAt, doc.createdAt].filter(Boolean);
  if (!stamps.length) return true;
  return stamps.some((stamp) => {
    const t = new Date(stamp).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

function daySeries(from, to, rows) {
  let start = startOfDay(from);
  const end = startOfDay(to);
  const maxDays = 90;
  const spanDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (spanDays > maxDays) start = new Date(end.getTime() - (maxDays - 1) * 86400000);
  const days = [];
  const map = new Map();
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t);
    const key = ymd(d);
    const point = {
      d: key,
      label: String(d.getDate()),
      dateLabel: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d),
      participants: 0,
      entries: 0,
      points: 0,
    };
    map.set(key, point);
    days.push(point);
  }
  for (const row of rows) {
    const key = ymd(row.startsAt || row.createdAt);
    const bucket = map.get(key);
    if (!bucket) continue;
    const m = metricsFor(row);
    bucket.participants += m.participants;
    bucket.entries += m.entries;
    bucket.points += m.points;
  }
  return days.slice(0, 90);
}

function sumMetrics(rows) {
  return rows.reduce(
    (acc, doc) => {
      const m = metricsFor(doc);
      acc.competitions += 1;
      acc.participants += m.participants;
      acc.entries += m.entries;
      acc.completed += m.completed;
      acc.points += m.points;
      acc.prizes += m.winners;
      acc.value += m.prizeValue;
      return acc;
    },
    { competitions: 0, participants: 0, entries: 0, completed: 0, points: 0, prizes: 0, value: 0 }
  );
}

function share(count, total) {
  return total ? Number(((count / total) * 100).toFixed(1)) : 0;
}

function collectChannels(rows) {
  const counts = { app: 0, website: 0, email: 0, social: 0 };
  let used = false;
  for (const doc of rows) {
    const extra = parseJson(doc.overviewJson);
    const list = extra.channels || extra.entries || [];
    for (const item of list) {
      const key = String(item.channel || item.key || "").toLowerCase();
      if (key.includes("web")) {
        counts.website += Number(item.count || 1);
        used = true;
      } else if (key.includes("email")) {
        counts.email += Number(item.count || 1);
        used = true;
      } else if (key.includes("social")) {
        counts.social += Number(item.count || 1);
        used = true;
      } else if (key.includes("app") || item.channel) {
        counts.app += Number(item.count || 1);
        used = true;
      }
    }
  }
  if (!used) counts.app = rows.reduce((s, d) => s + (Number(d.participantCount) || 0), 0);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return [
    { key: "app", label: "Mobile App", count: counts.app, pct: share(counts.app, total), color: "#6D28D9" },
    { key: "website", label: "Website", count: counts.website, pct: share(counts.website, total), color: "#2563EB" },
    { key: "email", label: "Email", count: counts.email, pct: share(counts.email, total), color: "#FF7A00" },
    { key: "social", label: "Social Media", count: counts.social, pct: share(counts.social, total), color: "#16A34A" },
  ];
}

function collectTopParticipants(rows) {
  const byName = new Map();
  for (const doc of rows) {
    const extra = parseJson(doc.overviewJson);
    const people = [
      ...(Array.isArray(extra.participants) ? extra.participants : []),
      ...(Array.isArray(extra.leaderboard) ? extra.leaderboard : []),
      ...(Array.isArray(extra.entries) ? extra.entries : []),
    ];
    for (const p of people) {
      const name = p.name || p.label || "";
      if (!name) continue;
      const cur = byName.get(name) || { name, entries: 0, points: 0, avatar: p.avatar || avatar(name) };
      cur.entries += Number(p.entries || 1);
      cur.points += Number(p.points ?? p.pts ?? p.score ?? 0);
      byName.set(name, cur);
    }
  }
  return [...byName.values()].sort((a, b) => b.points - a.points || b.entries - a.entries).slice(0, 8);
}

function collectActivity(rows) {
  const items = [];
  for (const doc of rows) {
    const extra = parseJson(doc.overviewJson);
    for (const a of extra.activity || []) {
      items.push({
        kind: a.kind || "update",
        title: a.title || a.name || "Activity",
        detail: a.detail || doc.title,
        at: a.at || fmtRelative(a.createdAt || doc.updatedAt),
        atSort: new Date(a.createdAt || a.at || doc.updatedAt || 0).getTime(),
        icon: a.icon || "bolt",
      });
    }
    items.push({
      kind: "create",
      title: `Competition ‘${doc.title}’ created`,
      detail: `Created by ${doc.createdBy || "Admin"}`,
      at: fmtRelative(doc.createdAt),
      atSort: new Date(doc.createdAt || 0).getTime(),
      icon: "plus",
    });
    if (doc.updatedAt && String(doc.updatedAt) !== String(doc.createdAt)) {
      items.push({
        kind: "update",
        title: `‘${doc.title}’ updated`,
        detail: `Status: ${resolveStatus(doc)}`,
        at: fmtRelative(doc.updatedAt),
        atSort: new Date(doc.updatedAt).getTime(),
        icon: "gear",
      });
    }
  }
  return items.sort((a, b) => b.atSort - a.atSort).slice(0, 8).map(({ atSort, ...rest }) => rest);
}

function ageBucket(dob) {
  if (!dob) return null;
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
  if (years < 25) return "18";
  if (years < 35) return "25";
  if (years < 45) return "35";
  return "45";
}

async function demographics() {
  const users = await User.find({ role: "CUSTOMER" }).select("gender dateOfBirth").lean();
  const genderCounts = { male: 0, female: 0, other: 0 };
  const ageCounts = { "18": 0, "25": 0, "35": 0, "45": 0 };
  for (const u of users) {
    const g = String(u.gender || "").toLowerCase();
    if (g.startsWith("f")) genderCounts.female += 1;
    else if (g.startsWith("m")) genderCounts.male += 1;
    else if (g) genderCounts.other += 1;
    const bucket = ageBucket(u.dateOfBirth);
    if (bucket) ageCounts[bucket] += 1;
  }
  const gTotal = genderCounts.male + genderCounts.female + genderCounts.other;
  const aTotal = Object.values(ageCounts).reduce((s, n) => s + n, 0);
  return {
    gender: [
      { key: "male", label: "Male", count: genderCounts.male, pct: share(genderCounts.male, gTotal), color: "#2563EB" },
      { key: "female", label: "Female", count: genderCounts.female, pct: share(genderCounts.female, gTotal), color: "#6D28D9" },
    ],
    age: [
      { key: "18", label: "18–24", pct: share(ageCounts["18"], aTotal), color: "#6D28D9" },
      { key: "25", label: "25–34", pct: share(ageCounts["25"], aTotal), color: "#2563EB" },
      { key: "35", label: "35–44", pct: share(ageCounts["35"], aTotal), color: "#FF7A00" },
      { key: "45", label: "45+", pct: share(ageCounts["45"], aTotal), color: "#0D9488" },
    ],
  };
}

async function pointsImpact(curr) {
  const [redeemedAgg, holders] = await Promise.all([
    PointsTransaction.aggregate([
      { $match: { points: { $lt: 0 } } },
      { $group: { _id: null, pts: { $sum: "$points" } } },
    ]),
    User.countDocuments({ role: "CUSTOMER", pointsBalance: { $gt: 0 } }),
  ]);
  const redeemed = Math.abs(redeemedAgg[0]?.pts || 0);
  const awarded = curr.points;
  return [
    { label: "Total Points Awarded", value: awarded, hint: "", icon: "star", tone: "gold" },
    { label: "Points Redeemed", value: redeemed, hint: "", icon: "gift", tone: "purple" },
    { label: "Avg Points / Participant", value: curr.participants ? Math.round(awarded / curr.participants) : 0, hint: "", icon: "users", tone: "blue" },
    { label: "Redemption Rate", value: awarded ? `${Math.min(100, Math.round((redeemed / awarded) * 100))}%` : "0%", hint: "", icon: "trend", tone: "green" },
    { label: "Active Point Holders", value: holders, hint: "", icon: "bolt", tone: "orange" },
  ];
}

async function getCompetitionAnalytics(query = {}) {
  const all = await Competition.find().sort({ createdAt: -1 }).lean();
  const now = new Date();
  const dates = all.map((c) => c.createdAt || c.startsAt).filter(Boolean).map((d) => new Date(d));
  const earliest = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : now;
  const hasRange = Boolean(query.from || query.to);
  const from = query.from ? startOfDay(query.from) : startOfDay(earliest);
  const to = query.to ? endOfDay(query.to) : endOfDay(now);

  const current = hasRange ? all.filter((c) => inRange(c, from, to)) : all;
  const span = Math.max(1, to.getTime() - from.getTime());
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  const previous = all.filter((c) => inRange(c, prevFrom, prevTo));

  const curr = sumMetrics(current);
  const prev = sumMetrics(previous);
  const series = daySeries(from, to, current);
  const tipIndex = Math.max(0, series.reduce((best, p, i) => (p.participants > (series[best]?.participants || 0) ? i : best), 0));

  const entriesByCompetition = current.map((doc, i) => {
    const m = metricsFor(doc);
    return {
      key: String(doc._id),
      id: String(doc._id),
      name: doc.title || doc.code || "Competition",
      count: m.entries,
      pct: share(m.entries, curr.entries),
      color: COLORS[i % COLORS.length],
    };
  }).sort((a, b) => b.count - a.count);

  const performance = current.map((doc) => {
    const m = metricsFor(doc);
    return {
      id: String(doc._id),
      name: doc.title || doc.code || "Competition",
      status: resolveStatus(doc),
      type: String(doc.type || "quiz").toLowerCase(),
      participants: m.participants,
      entries: m.entries,
      completion: m.completion,
      points: m.points,
      prizeValue: m.prizeValue,
    };
  }).sort((a, b) => b.participants - a.participants || b.entries - a.entries);

  const topCompetitions = performance.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.name,
    participants: r.participants,
    entries: r.entries,
    points: r.points,
  }));

  const [demo, impact] = await Promise.all([demographics(), pointsImpact(curr)]);
  const channels = collectChannels(current);
  const channelTotal = channels.reduce((s, c) => s + c.count, 0);
  const abandoned = Math.max(0, curr.entries - curr.completed);
  const inProgress = 0;

  return {
    from: ymd(from),
    to: ymd(to),
    rangeLabel: fmtRange(from, to),
    compareLabel: fmtRange(prevFrom, prevTo),
    totalCompetitions: all.length,
    entriesTotal: curr.entries,
    participantsTotal: curr.participants,
    kpis: [
      { key: "competitions", label: "Total Competitions", value: all.length, hint: hasRange ? `${curr.competitions} in selected period` : `${pctChange(curr.competitions, prev.competitions)} vs prior period`, icon: "trophy", tone: "purple" },
      { key: "participants", label: "Total Participants", value: curr.participants, hint: pctChange(curr.participants, prev.participants), icon: "users", tone: "green" },
      { key: "entries", label: "Total Entries", value: curr.entries, hint: pctChange(curr.entries, prev.entries), icon: "file", tone: "blue" },
      { key: "points", label: "Points Awarded", value: curr.points, hint: pctChange(curr.points, prev.points), icon: "star", tone: "gold" },
      { key: "prizes", label: "Prizes Distributed", value: curr.prizes, hint: pctChange(curr.prizes, prev.prizes), icon: "gift", tone: "red" },
      { key: "value", label: "Total Prize Value", value: curr.value, hint: pctChange(curr.value, prev.value), icon: "trend", tone: "teal", money: true },
    ],
    compare: [
      { label: "Total Competitions", apr: prev.competitions, may: curr.competitions, change: pctChange(curr.competitions, prev.competitions) },
      { label: "Total Participants", apr: prev.participants, may: curr.participants, change: pctChange(curr.participants, prev.participants) },
      { label: "Total Entries", apr: prev.entries, may: curr.entries, change: pctChange(curr.entries, prev.entries) },
      { label: "Points Awarded", apr: prev.points, may: curr.points, change: pctChange(curr.points, prev.points) },
      { label: "Prizes Distributed", apr: prev.prizes, may: curr.prizes, change: pctChange(curr.prizes, prev.prizes) },
      { label: "Total Prize Value", apr: prev.value, may: curr.value, change: pctChange(curr.value, prev.value), money: true },
    ],
    participation: series,
    tipIndex,
    entriesByCompetition,
    topCompetitions,
    channels,
    channelTotal,
    demographics: demo,
    completion: {
      pct: curr.entries ? Number(((curr.completed / curr.entries) * 100).toFixed(1)) : 0,
      completed: curr.completed,
      inProgress,
      abandoned,
    },
    topParticipants: collectTopParticipants(current),
    performance,
    impact,
    activity: collectActivity(current),
    leaderboardCompetitionId: performance[0]?.id || null,
  };
}

module.exports = { getCompetitionAnalytics };
