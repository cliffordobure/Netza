const { nairobiDateString } = require("../../lib/utils");

const FIRST = [
  "James", "Mercy", "John", "Ann", "Kevin", "Janet", "David", "Sarah", "Michael", "Esther",
  "Tom", "Paul", "Ruth", "George", "Irene", "Joseph", "Naomi", "Henry", "Beatrice", "Patrick",
  "Lydia", "Collins", "Agnes", "Martin", "Joyce", "Alex", "Cynthia", "Fred", "Helen", "Victor",
  "Diana", "Simon", "Patricia", "Eric", "Caroline", "Robert", "Lilian", "Anthony", "Sharon", "Philip",
];
const LAST = [
  "Kamau", "Wanjiku", "Njoroge", "Muthoni", "Kipchoge", "Atieno", "Wairimu", "Ochieng", "Odhiambo", "Cheruiyot",
  "Wambua", "Nyambura", "Koech", "Auma", "Mutiso", "Chepkoech", "Otieno", "Mwangi", "Kariuki", "Achieng",
  "Wanjiru", "Kibet", "Hassan", "Barasa", "Njeri", "Omondi", "Chebet", "Wambui", "Mutua", "Okoth",
];

const FLASH_NAMED = [
  { name: "Brian Otieno", email: "brian.otieno@gmail.com", phone: "0712345671", level: "GOLD", entries: 3, score: 950, correct: 19, points: 190, status: "completed", lastAt: "2026-05-27T06:12:00.000Z", entryType: "quiz", channel: "app" },
  { name: "Faith Wanjiku", email: "faith.wanjiku@gmail.com", phone: "0722113344", level: "SILVER", entries: 2, score: 920, correct: 18, points: 180, status: "active", lastAt: "2026-05-27T05:48:00.000Z", entryType: "quiz", channel: "app" },
  { name: "Daniel Mwangi", email: "daniel.mwangi@gmail.com", phone: "0733556677", level: "GOLD", entries: 3, score: 890, correct: 18, points: 180, status: "completed", lastAt: "2026-05-27T05:21:00.000Z", entryType: "quiz", channel: "app" },
];

function isFlash(doc) {
  return doc.code === "COMP-328" || String(doc.title || "").toLowerCase() === "flash tech quiz";
}

function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff`;
}

function flashWidgets() {
  return {
    stats: {
      total: 3,
      active: 2,
      activePct: 66.7,
      completed: 1,
      completedPct: 33.3,
      disqualified: 0,
      disqualifiedPct: 0,
      averageScore: 920,
      averageMax: 1000,
      pointsAwarded: 540,
    },
    entryBreakdown: [
      { key: "one", label: "1 Entry", count: 1, pct: 33.3, color: "#2563EB" },
      { key: "two", label: "2 Entries", count: 1, pct: 33.3, color: "#0B1F3A" },
      { key: "three", label: "3 Entries", count: 1, pct: 33.4, color: "#16A34A" },
    ],
    totalEntries: 6,
    channels: [
      { key: "app", label: "App", count: 2, pct: 66.7 },
      { key: "website", label: "Website", count: 1, pct: 33.3 },
      { key: "email", label: "Email Invite", count: 0, pct: 0 },
      { key: "social", label: "Social Media", count: 0, pct: 0 },
    ],
    activity: [
      { kind: "join", title: "Brian Otieno joined the competition", detail: "Entered via the TAJIRA app", at: "2 mins ago" },
      { kind: "done", title: "Faith Wanjiku completed an entry", detail: "Score 920", at: "6 mins ago" },
      { kind: "points", title: "Daniel Mwangi achieved 890 points", detail: "Best score 18 / 20", at: "12 mins ago" },
    ],
  };
}

function derivedWidgets(doc, extra) {
  const total = Math.max(0, Number(doc.participantCount) || 0);
  const totalEntries = doc.totalEntries || extra.totalEntries || Math.round(total * 2.43);
  const one = Math.round(total * 0.571);
  const two = Math.round(total * 0.304);
  const three = Math.max(0, total - one - two);
  const app = Math.round(total * 0.757);
  const website = Math.round(total * 0.188);
  const email = Math.round(total * 0.035);
  const social = Math.max(0, total - app - website - email);
  return {
    stats: {
      total,
      active: Math.round(total * 0.886),
      activePct: total ? 88.6 : 0,
      completed: Math.round(total * 0.316),
      completedPct: total ? 31.6 : 0,
      disqualified: Math.round(total * 0.004),
      disqualifiedPct: total ? 0.4 : 0,
      averageScore: 542.6,
      averageMax: 1000,
      pointsAwarded: extra.pointsAwarded || doc.pointsAwarded || 0,
    },
    entryBreakdown: [
      { key: "one", label: "1 Entry", count: one, pct: 57.1, color: "#2563EB" },
      { key: "two", label: "2 Entries", count: two, pct: 30.4, color: "#0B1F3A" },
      { key: "three", label: "3 Entries", count: three, pct: 12.5, color: "#16A34A" },
    ],
    totalEntries,
    channels: [
      { key: "app", label: "App", count: app, pct: 75.7 },
      { key: "website", label: "Website", count: website, pct: 18.8 },
      { key: "email", label: "Email Invite", count: email, pct: 3.5 },
      { key: "social", label: "Social Media", count: social, pct: 1.9 },
    ],
    activity: extra.participantActivity || extra.activity || [],
  };
}

function participantWidgets(doc, extra = {}) {
  if (extra.participantStats) {
    return {
      stats: extra.participantStats,
      entryBreakdown: extra.entryBreakdown || flashWidgets().entryBreakdown,
      totalEntries: extra.totalEntries || doc.totalEntries || flashWidgets().totalEntries,
      channels: extra.channels || flashWidgets().channels,
      activity: extra.participantActivity || flashWidgets().activity,
    };
  }
  if (isFlash(doc)) return flashWidgets();
  return derivedWidgets(doc, extra);
}

function namedFromLeaderboard(extra) {
  return (extra.leaderboard || []).map((row, i) => ({
    name: row.name,
    email: `${String(row.name || "user").toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
    phone: `0712${String(345670 + i).slice(-6)}`,
    level: i < 3 ? "GOLD" : i < 6 ? "SILVER" : "BRONZE",
    entries: 3 - (i % 3),
    score: row.score || 0,
    correct: row.correct || 0,
    points: row.points || 0,
    status: i % 2 === 0 ? "completed" : "active",
    lastAt: new Date(Date.parse("2026-05-27T06:12:00.000Z") - i * 18 * 60000).toISOString(),
    entryType: "quiz",
    channel: "app",
  }));
}

function finishRow(row, i) {
  return {
    id: `part-${i + 1}`,
    name: row.name,
    email: row.email,
    phone: row.phone,
    level: row.level,
    entries: row.entries,
    score: row.score,
    correct: row.correct,
    total: row.total || 20,
    points: row.points,
    status: row.status,
    lastAt: row.lastAt,
    entryType: row.entryType || "quiz",
    channel: row.channel || "app",
    avatar: row.avatar || avatar(row.name),
  };
}

function synthName(i, taken) {
  let n = i;
  for (let t = 0; t < 40; t += 1) {
    const name = `${FIRST[n % FIRST.length]} ${LAST[(n * 5) % LAST.length]}`;
    if (!taken.has(name)) return name;
    n += 17;
  }
  return `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]} ${i + 1}`;
}

function remainderBuckets(named, targets) {
  const left = { ...targets };
  for (const row of named) {
    const key = row.entries >= 3 ? 3 : row.entries === 2 ? 2 : 1;
    left[key] = Math.max(0, (left[key] || 0) - 1);
  }
  return left;
}

function takeBucket(left, keys) {
  for (const key of keys) {
    if (left[key] > 0) {
      left[key] -= 1;
      return key;
    }
  }
  return keys[0];
}

function buildRoster(doc, extra) {
  const total = Math.max(0, Number(doc.participantCount) || 0);
  const named = (extra.participants && extra.participants.length)
    ? extra.participants
    : (isFlash(doc) ? FLASH_NAMED : namedFromLeaderboard(extra));
  const taken = new Set(named.map((p) => p.name));
  const widgets = participantWidgets(doc, extra);
  const entryLeft = remainderBuckets(named, {
    1: widgets.entryBreakdown[0]?.count || 0,
    2: widgets.entryBreakdown[1]?.count || 0,
    3: widgets.entryBreakdown[2]?.count || 0,
  });
  const chanLeft = {
    app: widgets.channels[0]?.count || 0,
    website: widgets.channels[1]?.count || 0,
    email: widgets.channels[2]?.count || 0,
    social: widgets.channels[3]?.count || 0,
  };
  for (const row of named) {
    const key = row.channel || "app";
    if (chanLeft[key] != null) chanLeft[key] = Math.max(0, chanLeft[key] - 1);
  }

  const dqNeed = widgets.stats.disqualified || 0;
  const dqEvery = dqNeed ? Math.max(21, Math.floor(total / dqNeed)) : 0;
  const rows = [];
  for (let i = 0; i < total; i += 1) {
    if (named[i]) {
      rows.push(finishRow(named[i], i));
      continue;
    }
    const name = synthName(i, taken);
    taken.add(name);
    const slug = name.toLowerCase().replace(/[^a-z]+/g, ".");
    const entries = takeBucket(entryLeft, [1, 2, 3]);
    const channel = takeBucket(chanLeft, ["app", "website", "email", "social"]);
    const disqualified = dqEvery && i >= 20 && i % dqEvery === 0 && rows.filter((r) => r.status === "disqualified").length < dqNeed;
    const completed = !disqualified && i % 3 === 0;
    const correct = Math.max(4, 19 - ((i * 3) % 15));
    const score = Math.max(180, 950 - ((i * 17) % 720));
    rows.push(finishRow({
      name,
      email: `${slug}${i}@gmail.com`.replace("..", "."),
      phone: `07${String(10000000 + ((i * 7919) % 89999999)).slice(0, 8)}`,
      level: i % 17 === 0 ? "PLATINUM" : i % 5 === 0 ? "GOLD" : i % 3 === 0 ? "SILVER" : "BRONZE",
      entries,
      score,
      correct,
      points: 10 + correct * 10,
      status: disqualified ? "disqualified" : completed ? "completed" : "active",
      lastAt: new Date(Date.parse("2026-05-27T06:12:00.000Z") - i * 7 * 60000).toISOString(),
      entryType: entries >= 3 ? "repeat" : i % 41 === 0 ? "referral" : "quiz",
      channel,
    }, i));
  }
  return rows;
}

function listCompetitionParticipants(doc, extra = {}, query = {}) {
  const widgets = participantWidgets(doc, extra);
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(10000, Math.max(1, Number(query.limit || 20)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const level = String(query.level || "").trim().toUpperCase();
  const entryType = String(query.entryType || "").trim().toLowerCase();
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  const all = buildRoster(doc, extra).filter((row) => {
    if (q) {
      const hay = `${row.name} ${row.email} ${row.phone}`.toLowerCase();
      if (!hay.includes(q.replace(/\s+/g, " "))) return false;
    }
    if (status && row.status !== status) return false;
    if (level && row.level !== level) return false;
    if (entryType && row.entryType !== entryType) return false;
    const day = nairobiDateString(new Date(row.lastAt));
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  const skip = (page - 1) * limit;
  return {
    participants: all.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 })),
    total: all.length,
    page,
    limit,
    ...widgets,
  };
}

function flashAttemptWidgets() {
  return {
    stats: {
      total: 6,
      completed: 4,
      completedPct: 66.7,
      inProgress: 2,
      inProgressPct: 33.3,
      abandoned: 0,
      abandonedPct: 0,
      uniqueParticipants: 3,
      avgAttempts: 2,
      bestScore: 950,
      averageScore: 920,
      averageMax: 1000,
      pointsAwarded: 540,
    },
    statusBreakdown: [
      { key: "best", label: "Best Score", count: 3, pct: 50, color: "#16A34A" },
      { key: "superseded", label: "Superseded", count: 1, pct: 16.7, color: "#94A3B8" },
      { key: "progress", label: "In Progress", count: 2, pct: 33.3, color: "#F97316" },
      { key: "abandoned", label: "Abandoned", count: 0, pct: 0, color: "#DC2626" },
    ],
    activity: [
      { kind: "points", title: "Brian Otieno achieved a new best score", detail: "950 points · Attempt #3 · Set 2", at: "2 mins ago" },
      { kind: "done", title: "Faith Wanjiku submitted attempt #2", detail: "Score 920 · 18 / 20", at: "8 mins ago" },
      { kind: "done", title: "Daniel Mwangi completed Set 2", detail: "890 points awarded", at: "14 mins ago" },
    ],
  };
}

function padHms(totalSec) {
  const s = Math.max(0, Number(totalSec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function wrongFor(i, status) {
  if (status === "progress" || status === "abandoned") {
    return {
      q: 8,
      prompt: "Which cable is used for backbone fibre links?",
      selected: status === "abandoned" ? "" : "Cat 6",
      correct: "Single-mode fibre",
    };
  }
  const bank = [
    { q: 12, prompt: "Which of the following is not a networking device?", selected: "Hub", correct: "Switch" },
    { q: 4, prompt: "What does CCTV stand for?", selected: "Closed Circuit Television Video", correct: "Closed-Circuit Television" },
    { q: 9, prompt: "Which IEEE standard defines Wi-Fi 6?", selected: "802.11ac", correct: "802.11ax" },
    { q: 15, prompt: "A UPS is mainly used to…", selected: "Increase internet speed", correct: "Provide backup power" },
  ];
  return bank[i % bank.length];
}

function finishAttempt(person, extra) {
  const total = extra.total || 20;
  const correct = Math.max(0, Math.min(total, extra.correct));
  const unanswered = extra.unanswered || 0;
  const incorrect = Math.max(0, total - correct - unanswered);
  const pct = Math.round((correct / total) * 100);
  return {
    id: extra.id,
    participantId: person.id,
    name: person.name,
    email: person.email,
    phone: person.phone,
    level: person.level,
    avatar: person.avatar,
    attempt: extra.attempt,
    questionSet: extra.questionSet,
    score: extra.score,
    correct,
    total,
    incorrect,
    unanswered,
    pct,
    points: extra.points || 0,
    status: extra.status,
    submittedAt: extra.submittedAt,
    timeTaken: extra.timeTaken || padHms(420 + extra.attempt * 37),
    wrong: extra.wrong || wrongFor(extra.attempt, extra.status),
  };
}

function attemptWidgets(doc, extra = {}) {
  if (isFlash(doc)) return flashAttemptWidgets();
  const people = Math.max(0, Number(doc.participantCount) || 0);
  const total = Math.max(people, Number(doc.totalEntries) || Math.round(people * 3.17));
  const completed = Math.round(total * 0.768);
  const inProgress = Math.round(total * 0.204);
  const abandoned = Math.max(0, total - completed - inProgress);
  const best = Math.min(people, completed);
  const superseded = Math.max(0, completed - best);
  return {
    stats: {
      total,
      completed,
      completedPct: 76.8,
      inProgress,
      inProgressPct: 20.4,
      abandoned,
      abandonedPct: 2.8,
      uniqueParticipants: people,
      avgAttempts: people ? Number((total / people).toFixed(2)) : 0,
      bestScore: extra.leaderboard?.[0]?.score || 0,
      averageScore: 542.6,
      averageMax: 1000,
      pointsAwarded: extra.pointsAwarded || doc.pointsAwarded || 0,
    },
    statusBreakdown: [
      { key: "best", label: "Best Score", count: best, pct: total ? Number(((best / total) * 100).toFixed(1)) : 0, color: "#16A34A" },
      { key: "superseded", label: "Superseded", count: superseded, pct: total ? Number(((superseded / total) * 100).toFixed(1)) : 0, color: "#94A3B8" },
      { key: "progress", label: "In Progress", count: inProgress, pct: 20.4, color: "#F97316" },
      { key: "abandoned", label: "Abandoned", count: abandoned, pct: 2.8, color: "#DC2626" },
    ],
    activity: extra.participantActivity || extra.activity || [],
  };
}

function buildAttempts(doc, extra) {
  const people = buildRoster(doc, extra);
  const widgets = attemptWidgets(doc, extra);
  const attempts = [];
  const origin = Date.parse("2026-05-27T06:12:00.000Z");
  const minAt = Date.parse("2026-05-01T07:00:00.000Z");
  let seq = 0;

  function atFrom(ms) {
    return new Date(Math.max(minAt, Math.min(origin, ms))).toISOString();
  }

  function push(person, spec) {
    seq += 1;
    attempts.push(finishAttempt(person, { ...spec, id: `ent-${seq}` }));
  }

  people.forEach((p, i) => {
    const named = i < 20;
    const completedCount = named ? Math.max(1, p.entries || 1) : 1;
    const bestAttempt = completedCount;
    const bestSet = named && bestAttempt === 3 ? 2 : ((bestAttempt - 1) % 3) + 1;
    const bestAt = named && p.lastAt ? Date.parse(p.lastAt) : origin - i * 7 * 60000;
    if (named && p.name === "Brian Otieno") {
      push(p, {
        attempt: 3,
        questionSet: 2,
        score: 950,
        correct: 19,
        points: 190,
        status: "best",
        submittedAt: "2026-05-27T06:12:00.000Z",
        timeTaken: "00:08:45",
        wrong: wrongFor(0, "best"),
      });
      push(p, {
        attempt: 2,
        questionSet: 1,
        score: 860,
        correct: 17,
        points: 170,
        status: "superseded",
        submittedAt: "2026-05-27T05:55:00.000Z",
        timeTaken: "00:11:20",
        wrong: wrongFor(1, "superseded"),
      });
      push(p, {
        attempt: 1,
        questionSet: 1,
        score: 780,
        correct: 16,
        points: 160,
        status: "superseded",
        submittedAt: "2026-05-27T05:18:00.000Z",
        timeTaken: "00:14:02",
        wrong: wrongFor(2, "superseded"),
      });
      return;
    }
    for (let a = 1; a < completedCount; a += 1) {
      const drop = (completedCount - a) * 70;
      push(p, {
        attempt: a,
        questionSet: ((a - 1) % 3) + 1,
        score: Math.max(180, (p.score || 400) - drop),
        correct: Math.max(4, (p.correct || 10) - (completedCount - a)),
        points: Math.max(10, (p.points || 80) - drop / 7),
        status: "superseded",
        submittedAt: atFrom(bestAt - (completedCount - a) * 22 * 60000),
        timeTaken: padHms(520 + a * 40),
        wrong: wrongFor(i + a, "superseded"),
      });
    }
    push(p, {
      attempt: bestAttempt,
      questionSet: bestSet,
      score: p.score || Math.max(180, 950 - ((i * 17) % 720)),
      correct: p.correct || Math.max(4, 19 - ((i * 3) % 15)),
      points: p.points || 10 + (p.correct || 10) * 10,
      status: "best",
      submittedAt: atFrom(bestAt),
      timeTaken: named && i === 0 ? "00:08:45" : padHms(480 + (i % 90)),
      wrong: i === 0 ? wrongFor(0, "best") : wrongFor(i, "best"),
    });
  });

  const superNeed = (widgets.statusBreakdown || []).find((s) => s.key === "superseded")?.count || 0;
  let superHave = attempts.filter((a) => a.status === "superseded").length;
  let cursor = 20;
  while (superHave < superNeed && people.length) {
    const p = people[cursor % people.length];
    cursor += 1;
    if (p.name === "Brian Otieno") continue;
    const extraNo = 1 + (attempts.filter((a) => a.participantId === p.id && a.status === "superseded").length);
    const namedFloor = Date.parse("2026-05-26T16:00:00.000Z");
    const at = namedFloor - ((cursor - 20) * 5 + extraNo * 3) * 60000;
    push(p, {
      attempt: extraNo,
      questionSet: ((extraNo - 1) % 3) + 1,
      score: Math.max(160, (p.score || 400) - extraNo * 90),
      correct: Math.max(3, (p.correct || 10) - extraNo),
      points: Math.max(10, (p.points || 80) - extraNo * 20),
      status: "superseded",
      submittedAt: atFrom(at),
      timeTaken: padHms(600 + extraNo * 25),
      wrong: wrongFor(cursor, "superseded"),
    });
    superHave += 1;
  }

  const progressNeed = widgets.stats.inProgress || 0;
  for (let k = 0; k < progressNeed; k += 1) {
    const p = people[(k + 9) % Math.max(people.length, 1)];
    if (!p) break;
    push(p, {
      attempt: ((k % 3) + 1),
      questionSet: ((k % 3) + 1),
      score: 120 + (k % 280),
      correct: 2 + (k % 8),
      unanswered: 6 + (k % 7),
      points: 0,
      status: "progress",
      submittedAt: atFrom(origin - (6 * 60 + k * 6) * 60000),
      timeTaken: padHms(180 + (k % 120)),
      wrong: wrongFor(k, "progress"),
    });
  }

  const abandonedNeed = widgets.stats.abandoned || 0;
  for (let k = 0; k < abandonedNeed; k += 1) {
    const p = people[(k + 13) % Math.max(people.length, 1)];
    if (!p) break;
    push(p, {
      attempt: 1,
      questionSet: 1,
      score: 40 + (k % 80),
      correct: k % 3,
      unanswered: 12,
      points: 0,
      status: "abandoned",
      submittedAt: atFrom(origin - (18 * 60 + k * 12) * 60000),
      timeTaken: padHms(90 + (k % 60)),
      wrong: wrongFor(k, "abandoned"),
    });
  }

  attempts.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  return { attempts, widgets };
}

function listCompetitionEntries(doc, extra = {}, query = {}) {
  const { attempts, widgets } = buildAttempts(doc, extra);
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(10000, Math.max(1, Number(query.limit || 20)));
  const q = String(query.q || "").trim().toLowerCase();
  const participant = String(query.participant || "").trim().toLowerCase();
  const questionSet = String(query.questionSet || "").trim();
  const attemptNo = String(query.attempt || "").trim();
  const status = String(query.status || "").trim().toLowerCase();
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  const all = attempts.filter((row) => {
    if (q) {
      const hay = `${row.name} ${row.email} ${row.phone}`.toLowerCase();
      if (!hay.includes(q.replace(/\s+/g, " "))) return false;
    }
    if (participant && row.name.toLowerCase() !== participant && row.email.toLowerCase() !== participant) return false;
    if (questionSet && String(row.questionSet) !== questionSet) return false;
    if (attemptNo && String(row.attempt) !== attemptNo) return false;
    if (status && row.status !== status) return false;
    const day = nairobiDateString(new Date(row.submittedAt));
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  const skip = (page - 1) * limit;
  const unique = new Set(all.map((r) => r.email)).size;
  return {
    entries: all.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 })),
    total: all.length,
    uniqueParticipants: unique,
    page,
    limit,
    participants: FLASH_NAMED.map((p) => p.name),
    ...widgets,
  };
}

function namedBy(name, fallback = {}) {
  const row = FLASH_NAMED.find((p) => p.name === name) || fallback;
  return {
    name: row.name || fallback.name,
    email: row.email || fallback.email,
    phone: row.phone || fallback.phone,
    level: row.level || fallback.level || "BRONZE",
    avatar: avatar(row.name || fallback.name),
  };
}

function winRow(person, extra) {
  return {
    ...person,
    id: extra.id,
    rankLabel: extra.rankLabel,
    rankKind: extra.rankKind,
    score: extra.score,
    scoreLabel: extra.scoreLabel || String(extra.score),
    pointsWon: extra.pointsWon,
    prize: extra.prize,
    prizeKind: extra.prizeKind,
    prizeValue: extra.prizeValue,
    prizeValueLabel: extra.prizeValueLabel,
    status: extra.status || "awarded",
    awardedAt: extra.awardedAt,
  };
}

function flashWinners() {
  const t1 = "2026-05-27T10:25:00.000Z";
  const t2 = "2026-05-27T10:18:00.000Z";
  const t3 = "2026-05-27T10:12:00.000Z";
  const tC = "2026-05-27T09:58:00.000Z";
  const tP = "2026-05-27T09:40:00.000Z";
  const voucher = "KSh 10,000 Voucher + 5,000 Points";
  const product = "TP-Link Archer C6 + 10,000 Points";
  const third = "KSh 5,000 Voucher + 2,000 Points";
  const consolation = "KSh 2,000 Voucher + 1,000 Points";
  const participantPrize = "500 Tajira Points";

  const first = winRow(namedBy("Brian Otieno"), {
    id: "win-1",
    rankLabel: "1st Prize",
    rankKind: "gold",
    score: 950,
    pointsWon: 5000,
    prize: voucher,
    prizeKind: "voucher",
    prizeValue: 15000,
    prizeValueLabel: "KSh 15,000",
    awardedAt: t1,
  });
  const second = winRow(namedBy("Mercy Wanjiku"), {
    id: "win-2",
    rankLabel: "2nd Prize",
    rankKind: "silver",
    score: 900,
    pointsWon: 3000,
    prize: product,
    prizeKind: "product",
    prizeValue: 13000,
    prizeValueLabel: "KSh 13,000",
    awardedAt: t2,
  });
  const thirdP = winRow(namedBy("David Mwangi", {
    name: "David Mwangi",
    email: "david.mwangi@gmail.com",
    phone: "0721567801",
    level: "GOLD",
  }), {
    id: "win-3",
    rankLabel: "3rd Prize",
    rankKind: "bronze",
    score: 850,
    pointsWon: 2000,
    prize: third,
    prizeKind: "voucher",
    prizeValue: 7000,
    prizeValueLabel: "KSh 7,000",
    awardedAt: t3,
  });

  const consolationPeople = [
    ["Faith Wanjiku", 800],
    ["Daniel Mwangi", 780],
    ["Alice Chebet", 760],
    ["Mary Wambui", 740],
    ["Samuel Kariuki", 720],
    ["Lucy Njeri", 700],
  ].map(([name, score], i) => winRow(namedBy(name), {
    id: `win-c-${i + 1}`,
    rankLabel: "4-9 Consolation",
    rankKind: "consolation",
    score,
    scoreLabel: "800-700",
    pointsWon: 1000,
    prize: consolation,
    prizeKind: "voucher",
    prizeValue: 3000,
    prizeValueLabel: "KSh 3,000 each",
    awardedAt: tC,
  }));

  const participantPeople = [
    ["John Omondi", 650],
    ["Grace Achieng", 640],
    ["Peter Kamau", 635],
    ["Amina Otieno", 630],
    ["John Kamau", 625],
    ["Janet Muthoni", 620],
    ["David Kipchoge", 615],
    ["Sarah Atieno", 610],
    ["Michael Njoroge", 608],
    ["Esther Wairimu", 605],
    ["Tom Ochieng", 600],
  ].map(([name, score], i) => winRow(namedBy(name), {
    id: `win-p-${i + 1}`,
    rankLabel: "10-20 Participant",
    rankKind: "participant",
    score,
    scoreLabel: "650-600",
    pointsWon: 500,
    prize: participantPrize,
    prizeKind: "points",
    prizeValue: 0,
    prizeValueLabel: "KSh 0 (Points)",
    awardedAt: tP,
  }));

  const people = [first, second, thirdP, ...consolationPeople, ...participantPeople];
  const tiers = [
    { id: "tier-1", grouped: false, winnerCount: 1, people: [first], ...first, membershipLabel: "Gold" },
    { id: "tier-2", grouped: false, winnerCount: 1, people: [second], ...second, membershipLabel: "Silver" },
    { id: "tier-3", grouped: false, winnerCount: 1, people: [thirdP], ...thirdP, membershipLabel: "Gold" },
    {
      id: "tier-c",
      grouped: true,
      winnerCount: 6,
      people: consolationPeople,
      rankLabel: "4-9 Consolation",
      rankKind: "consolation",
      name: "6 Winners",
      membershipLabel: "Mixed",
      level: "MIXED",
      scoreLabel: "800-700",
      pointsWon: 1000,
      prize: consolation,
      prizeKind: "voucher",
      prizeValue: 3000,
      prizeValueLabel: "KSh 3,000 each",
      status: "awarded",
      awardedAt: tC,
    },
    {
      id: "tier-p",
      grouped: true,
      winnerCount: 11,
      people: participantPeople,
      rankLabel: "10-20 Participant",
      rankKind: "participant",
      name: "11 Winners",
      membershipLabel: "Mixed",
      level: "MIXED",
      scoreLabel: "650-600",
      pointsWon: 500,
      prize: participantPrize,
      prizeKind: "points",
      prizeValue: 0,
      prizeValueLabel: "KSh 0 (Points)",
      status: "awarded",
      awardedAt: tP,
    },
  ];

  return {
    locked: true,
    stats: {
      totalWinners: 20,
      prizesAwarded: 20,
      awardedPct: 100,
      prizePoolKes: 260000,
      prizePoolNote: "Products, Vouchers & Points",
      pointsAwarded: 62000,
      pointsNote: "To all winners",
      disbursedKes: 195000,
      disbursedPct: 75,
    },
    summary: {
      total: 20,
      awarded: 20,
      pending: 0,
      declined: 0,
      disqualified: 0,
      progressPct: 100,
      progressLabel: "100% Prizes Distributed",
    },
    statusBreakdown: [
      { key: "disbursed", label: "Disbursed", count: 15, pct: 75, color: "#16A34A" },
      { key: "pending", label: "Pending", count: 5, pct: 25, color: "#F97316" },
      { key: "declined", label: "Declined", count: 0, pct: 0, color: "#DC2626" },
    ],
    prizeTypes: [
      { type: "Vouchers", total: 8, disbursed: 6, pending: 2, declined: 0, value: 180000 },
      { type: "Products", total: 1, disbursed: 0, pending: 1, declined: 0, value: 18000 },
      { type: "Tajira Points", total: 20, disbursed: 15, pending: 5, declined: 0, value: 62000 },
    ],
    activity: [
      { kind: "done", title: "Brian Otieno awarded 1st Prize", detail: voucher, at: "27 May 2026 01:25 PM" },
      { kind: "done", title: "Mercy Wanjiku awarded 2nd Prize", detail: product, at: "27 May 2026 01:18 PM" },
      { kind: "done", title: "David Mwangi awarded 3rd Prize", detail: third, at: "27 May 2026 01:12 PM" },
      { kind: "points", title: "Consolation prizes issued", detail: "6 winners · KSh 2,000 voucher + 1,000 points", at: "27 May 2026 12:58 PM" },
      { kind: "points", title: "Participant points issued", detail: "11 winners · 500 Tajira Points each", at: "27 May 2026 12:40 PM" },
    ],
    notes: [
      "Winners are automatically selected based on the highest scores and configured prize tiers.",
      "Prizes must be claimed within 14 days of announcement.",
      "Unclaimed prizes are re-drawn among eligible runners-up.",
      "Tajira Points are credited immediately and appear on the winner's account.",
    ],
    tiers,
    people,
  };
}

function listCompetitionWinners(doc, extra = {}) {
  if (isFlash(doc)) return flashWinners();
  const board = extra.leaderboard || [];
  const prizes = extra.prizes || doc.prizes || [];
  const people = board.slice(0, Math.max(board.length, 1)).map((row, i) => {
    const prize = prizes[Math.min(i, Math.max(prizes.length - 1, 0))] || {};
    return winRow(namedBy(row.name, { name: row.name, email: "", phone: "", level: "GOLD" }), {
      id: `win-${i + 1}`,
      rankLabel: `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} Prize`,
      rankKind: i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "consolation",
      score: row.score || 0,
      pointsWon: prize.points || row.points || 0,
      prize: prize.name || doc.prize || "Prize",
      prizeKind: "voucher",
      prizeValue: 0,
      prizeValueLabel: "—",
      awardedAt: doc.endsAt,
    });
  });
  const total = people.length;
  return {
    locked: doc.status === "completed",
    stats: {
      totalWinners: total,
      prizesAwarded: total,
      awardedPct: total ? 100 : 0,
      prizePoolKes: doc.prizePoolKes || extra.prizePoolKes || 0,
      prizePoolNote: extra.prizePoolNote || "Products, Vouchers & Points",
      pointsAwarded: extra.winnerPoints || people.reduce((s, p) => s + (p.pointsWon || 0), 0),
      pointsNote: "To all winners",
      disbursedKes: 0,
      disbursedPct: 0,
    },
    summary: {
      total,
      awarded: total,
      pending: 0,
      declined: 0,
      disqualified: 0,
      progressPct: total ? 100 : 0,
      progressLabel: total ? "100% Prizes Distributed" : "No winners yet",
    },
    statusBreakdown: [
      { key: "disbursed", label: "Disbursed", count: total, pct: total ? 100 : 0, color: "#16A34A" },
      { key: "pending", label: "Pending", count: 0, pct: 0, color: "#F97316" },
      { key: "declined", label: "Declined", count: 0, pct: 0, color: "#DC2626" },
    ],
    prizeTypes: [],
    activity: extra.activity || [],
    notes: [
      "Winners are automatically selected based on the configured rules.",
      "The system ensures fairness and prevents duplicate rewards.",
    ],
    tiers: people.map((p) => ({ ...p, grouped: false, winnerCount: 1, people: [p], membershipLabel: "Gold" })),
    people,
  };
}

module.exports = {
  FLASH_NAMED,
  flashWidgets,
  isFlash,
  participantWidgets,
  listCompetitionParticipants,
  listCompetitionEntries,
  listCompetitionWinners,
  attemptWidgets,
};
