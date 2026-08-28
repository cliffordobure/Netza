const { Router } = require("express");
const { z } = require("zod");
const { Competition, User, PointsTransaction } = require("../../models");
const { auth, requireRoles, requireStaff, staffRoles, me } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");

const router = Router();

function parseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function resolveStatus(doc) {
  const raw = String(doc.status || "").toLowerCase();
  if (raw === "cancelled") return "ended";
  if (raw === "completed" || raw === "ended") return "ended";
  if (raw === "upcoming") return "upcoming";
  if (raw === "active") return "active";
  const now = Date.now();
  const start = doc.startsAt ? new Date(doc.startsAt).getTime() : 0;
  const end = doc.endsAt ? new Date(doc.endsAt).getTime() : 0;
  if (end && now > end) return "ended";
  if (start && now < start) return "upcoming";
  return "active";
}

function fmtRange(start, end) {
  const opts = { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" };
  const a = start ? new Intl.DateTimeFormat("en-GB", opts).format(new Date(start)) : "";
  const b = end ? new Intl.DateTimeFormat("en-GB", opts).format(new Date(end)) : "";
  if (a && b) return `${a} - ${b}`;
  return a || b || "";
}

function endsLabel(endsAt) {
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `Ends in ${days}d ${hrs}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `Ends in ${hrs}h ${mins}m`;
}

function badgeFor(doc) {
  const cat = String(doc.category || "").trim();
  if (cat) return cat.toUpperCase();
  const type = String(doc.type || "challenge").replace(/_/g, " ");
  return type.toUpperCase();
}

function routeFor(doc) {
  const type = String(doc.type || "").toLowerCase();
  if (type.includes("flash")) return "/flash";
  if (type.includes("refer")) return "/points";
  if (type.includes("review")) return "/orders";
  if (type.includes("quiz")) return "";
  return "/catalog";
}

function normalizeQuestions(extra) {
  const list = extra.questions || extra.quiz || [];
  if (!Array.isArray(list)) return [];
  return list
    .map((q) => ({
      text: q.text || q.question || "",
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correct: Number.isInteger(q.correct) ? q.correct : Number(q.correctIndex ?? q.answer ?? 0),
    }))
    .filter((q) => q.text && q.options.length >= 2);
}

function normalizeLeaderboard(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 20).map((p, i) => ({
    name: p.name || p.label || "Participant",
    pts: p.points ?? p.pts ?? 0,
    image: p.avatar || p.imageUrl || p.image || "",
    place: p.place ?? p.rank ?? i + 1,
  }));
}

function serializeCompetition(doc, userCtx = {}) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  const extra = parseJson(json.overviewJson);
  const details = parseJson(json.detailsJson);
  const status = resolveStatus(json);
  const leaderboard = normalizeLeaderboard(extra.leaderboard || details.leaderboard || []);
  let yourPts = 0;
  let yourRank = 0;
  if (userCtx.userId && Array.isArray(extra.entries)) {
    const mine = extra.entries.find((e) => String(e.userId || e.user) === String(userCtx.userId));
    if (mine) {
      yourPts = mine.points ?? mine.score ?? 0;
      yourRank = mine.rank ?? 0;
    }
  }
  if (!yourRank && userCtx.monthlyRank) yourRank = userCtx.monthlyRank;

  return {
    id: json.id,
    code: json.code,
    name: json.title,
    title: json.title,
    description: json.shortDescription || json.description || "",
    fullDescription: json.description || "",
    image: json.imageUrl || "",
    imageUrl: json.imageUrl || "",
    status,
    type: json.type || "challenge",
    category: json.category || "General",
    endsLabel: status === "active" ? endsLabel(json.endsAt) : "",
    badge: badgeFor(json),
    dates: fmtRange(json.startsAt, json.endsAt),
    prize: json.prize || json.pointsNote || "",
    pointsToWin: json.pointsToWin || 0,
    goalPts: json.pointsToWin || 1000,
    yourPts,
    yourRank,
    participantCount: json.participantCount || 0,
    route: routeFor(json),
    startsAt: json.startsAt,
    endsAt: json.endsAt,
    pointsCorrect: json.pointsCorrect ?? 50,
    pointsParticipation: json.pointsParticipation ?? 10,
    maxAttempts: json.maxAttempts ?? 10,
    rules: details.rules || extra.rules || [],
    questions: normalizeQuestions(extra),
    leaderboard,
    showLeaderboard: json.showLeaderboard !== false,
  };
}

async function monthlyLeaderboard(limit = 10) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const rows = await PointsTransaction.aggregate([
    { $match: { points: { $gt: 0 }, createdAt: { $gte: startOfMonth } } },
    { $group: { _id: "$user", pts: { $sum: "$points" } } },
    { $sort: { pts: -1 } },
    { $limit: limit },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select("firstName lastName");
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
  return rows.map((r, i) => {
    const u = byId[String(r._id)];
    const name = u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Customer";
    return {
      name: name || "Customer",
      pts: r.pts,
      image: "",
      place: i + 1,
    };
  });
}

async function userMonthlyRank(userId) {
  if (!userId) return { rank: 0, pts: 0 };
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const rows = await PointsTransaction.aggregate([
    { $match: { points: { $gt: 0 }, createdAt: { $gte: startOfMonth } } },
    { $group: { _id: "$user", pts: { $sum: "$points" } } },
    { $sort: { pts: -1 } },
  ]);
  const idx = rows.findIndex((r) => String(r._id) === String(userId));
  if (idx < 0) return { rank: 0, pts: 0 };
  return { rank: idx + 1, pts: rows[idx].pts };
}

router.get(
  "/",
  auth(false),
  asyncHandler(async (req, res) => {
    const filter = {
      isActive: { $ne: false },
      publishState: { $ne: "draft" },
    };
    const docs = await Competition.find(filter).sort({ startsAt: -1, createdAt: -1 });
    const rankInfo = req.user ? await userMonthlyRank(req.user._id) : { rank: 0, pts: 0 };
    const ctx = { userId: req.user?.id, monthlyRank: rankInfo.rank };
    const competitions = docs.map((d) => serializeCompetition(d, ctx));
    const active = competitions.filter((c) => c.status === "active");
    const leaderboard = await monthlyLeaderboard(5);
    res.json({
      competitions,
      stats: {
        active: active.length,
        upcoming: competitions.filter((c) => c.status === "upcoming").length,
        ended: competitions.filter((c) => c.status === "ended").length,
        yourMonthlyPts: rankInfo.pts,
        yourRank: rankInfo.rank,
        competitionPts: active.reduce((s, c) => s + (c.yourPts || 0), 0),
      },
      leaderboard,
    });
  })
);

router.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    res.json({ leaderboard: await monthlyLeaderboard(limit) });
  })
);

router.get(
  "/:id",
  auth(false),
  asyncHandler(async (req, res) => {
    const q = {};
    if (/^[a-f\d]{24}$/i.test(req.params.id)) q._id = req.params.id;
    else q.$or = [{ code: req.params.id }, { slug: req.params.id }];
    const doc = await Competition.findOne(q);
    if (!doc || doc.isActive === false || doc.publishState === "draft") {
      throw httpError(404, "Competition not found");
    }
    const rankInfo = req.user ? await userMonthlyRank(req.user._id) : { rank: 0, pts: 0 };
    const competition = serializeCompetition(doc, { userId: req.user?.id, monthlyRank: rankInfo.rank });
    if (!competition.leaderboard.length) {
      competition.leaderboard = await monthlyLeaderboard(10);
    }
    res.json({ competition, yourMonthlyPts: rankInfo.pts, yourRank: rankInfo.rank });
  })
);

router.post(
  "/:id/answer",
  auth(),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        questionIndex: z.number().int().min(0),
        selectedIndex: z.number().int().min(0),
      })
      .parse(req.body);
    const doc = await Competition.findById(req.params.id);
    if (!doc) throw httpError(404, "Competition not found");
    if (resolveStatus(doc) !== "active") throw httpError(400, "This competition is not active");
    const extra = parseJson(doc.overviewJson);
    const questions = normalizeQuestions(extra);
    const q = questions[body.questionIndex];
    if (!q) throw httpError(400, "Invalid question");
    const correct = body.selectedIndex === q.correct;
    res.json({
      correct,
      pointsAwarded: correct ? doc.pointsCorrect || 50 : 0,
      message: correct ? "Correct answer!" : "Not quite. Try again.",
    });
  })
);

module.exports = router;
