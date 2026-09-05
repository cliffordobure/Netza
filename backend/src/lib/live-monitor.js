const os = require("os");
const { verifyAccess } = require("./jwt");

const PRESENCE_TTL_MS = 90_000;
const SAMPLE_MS = 5_000;
const HISTORY_LEN = 180;

const STAFF_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "INVENTORY_MANAGER",
  "SALES_MANAGER",
  "CUSTOMER_SUPPORT",
  "DELIVERY_MANAGER",
]);

const SKIP_TRAFFIC = /\/health$|\/uploads\/|\/presence\/heartbeat|\/admin\/live/;
const SKIP_PRESENCE =
  /\/health$|\/uploads\/|\/admin\/|\/presence\/heartbeat|\/payments\/pesapal|\/auth\/(login|register|refresh|logout)/;

const presence = new Map();
const history = [];
const enriching = new Set();

let requestCount = 0;
let lastProcCpu = process.cpuUsage();
let lastHr = process.hrtime.bigint();
let lastSys = readCpuTimes();

function models() {
  return require("../models");
}

function readCpuTimes() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus() || []) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

function inferAppPath(url) {
  const p = String(url || "").split("?")[0].replace(/^\/api\/v1/, "") || "/";
  if (p.startsWith("/cart")) return "/cart";
  if (p.startsWith("/orders")) return "/orders";
  if (/^\/products\/[a-f0-9]{24}/i.test(p)) return `/product/${p.split("/")[2]}`;
  if (p.startsWith("/products")) return "/catalog";
  if (p.startsWith("/categories") || p.startsWith("/brands")) return "/shop";
  if (p.startsWith("/points")) return "/points";
  if (p.startsWith("/flash-drops")) return "/flash";
  if (p.startsWith("/competitions")) return "/challenges";
  if (p.startsWith("/quotes")) return "/quotes";
  if (p.startsWith("/addresses") || p.startsWith("/auth/me")) return "/account";
  if (p.startsWith("/shipping") || p.startsWith("/payments")) return "/checkout";
  if (p.startsWith("/banners")) return "/";
  return "/";
}

function persist(row) {
  try {
    const { mongoose, LiveSession } = models();
    if (mongoose.connection.readyState !== 1) return;
    LiveSession.findOneAndUpdate(
      { sessionId: row.sessionId },
      {
        $set: {
          userId: row.userId || "",
          name: row.name,
          role: row.role,
          path: row.path,
          client: row.client,
          explicit: Boolean(row.explicit),
          lastSeen: new Date(row.lastSeen),
        },
      },
      { upsert: true }
    ).catch(() => {});
  } catch {
    // Mongo not ready
  }
}

function enrichName(sessionId, userId) {
  if (!userId || enriching.has(sessionId)) return;
  enriching.add(sessionId);
  try {
    const { mongoose, User } = models();
    if (mongoose.connection.readyState !== 1) {
      enriching.delete(sessionId);
      return;
    }
    User.findById(userId)
      .select("firstName lastName phone")
      .lean()
      .then((u) => {
        enriching.delete(sessionId);
        if (!u) return;
        const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.phone || "Customer";
        const row = presence.get(sessionId);
        if (row) {
          row.name = name;
          persist(row);
        }
      })
      .catch(() => enriching.delete(sessionId));
  } catch {
    enriching.delete(sessionId);
  }
}

function recordRequest(req) {
  const url = String(req.originalUrl || req.url || "");
  if (!SKIP_TRAFFIC.test(url.split("?")[0])) requestCount += 1;
  touchFromRequest(req);
}

function touchFromRequest(req) {
  const url = String(req.originalUrl || req.url || "");
  if (SKIP_PRESENCE.test(url.split("?")[0])) return;

  let sessionId = "";
  let userId = null;
  let name = "Guest";
  let role = "CUSTOMER";
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) {
    try {
      const payload = verifyAccess(token);
      sessionId = `u:${payload.sub}`;
      userId = payload.sub;
      role = payload.role || "CUSTOMER";
      name = payload.phone || "Customer";
    } catch {
      // expired token — still count the device by IP
    }
  }
  if (!sessionId) {
    const ip = String(req.headers["x-forwarded-for"] || req.ip || "guest")
      .split(",")[0]
      .trim();
    sessionId = `g:${ip || "guest"}`;
  }

  heartbeat(
    {
      sessionId,
      userId,
      name,
      role,
      path: inferAppPath(url),
      client: "mobile",
    },
    { infer: true }
  );
}

function heartbeat({ sessionId, userId, name, role, path, client }, opts = {}) {
  const infer = Boolean(opts.infer);
  const id = String(sessionId || userId || "").trim().slice(0, 80);
  if (!id) return;
  const existing = presence.get(id);
  if (infer && existing?.explicit && Date.now() - existing.lastSeen < 40_000) {
    existing.lastSeen = Date.now();
    persist(existing);
    return;
  }

  const safeClient = client === "dashboard" ? "dashboard" : "mobile";
  const nextName = infer && existing?.name && existing.name !== "Guest" && existing.name !== "Customer"
    ? existing.name
    : String(name || existing?.name || "Guest").slice(0, 80);
  const row = {
    sessionId: id,
    userId: userId ? String(userId) : existing?.userId || null,
    name: nextName,
    role: String(role || existing?.role || "CUSTOMER"),
    path: infer && existing?.explicit ? existing.path : String(path || "/").slice(0, 200),
    client: safeClient,
    explicit: infer ? Boolean(existing?.explicit) : true,
    lastSeen: Date.now(),
  };
  presence.set(id, row);
  persist(row);
  const looksLikePhone = /^\+?\d{8,}$/.test(row.name) || row.name === "Customer";
  if (row.userId && looksLikePhone) enrichName(id, row.userId);
}

function prune() {
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  for (const [key, row] of presence) {
    if (row.lastSeen < cutoff) presence.delete(key);
  }
}

function readProcessCpu() {
  const delta = process.cpuUsage(lastProcCpu);
  lastProcCpu = process.cpuUsage();
  const nowHr = process.hrtime.bigint();
  const elapsedUs = Number(nowHr - lastHr) / 1000;
  lastHr = nowHr;
  const cores = Math.max(1, os.cpus()?.length || 1);
  if (elapsedUs <= 0) return 0;
  const used = (delta.user + delta.system) / elapsedUs;
  return Math.min(100, Math.round(((used * 100) / cores) * 10) / 10);
}

function systemCpuPct() {
  const now = readCpuTimes();
  const idleDelta = now.idle - lastSys.idle;
  const totalDelta = now.total - lastSys.total;
  lastSys = now;
  if (totalDelta <= 0) return 0;
  return Math.min(100, Math.round((1 - idleDelta / totalDelta) * 1000) / 10);
}

function sample() {
  prune();
  const cpuPct = systemCpuPct();
  const processCpuPct = readProcessCpu();
  const total = os.totalmem();
  const free = os.freemem();
  const memPct = total ? Math.round(((total - free) / total) * 1000) / 10 : 0;
  const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const rssPct = total ? Math.round((process.memoryUsage().rss / total) * 1000) / 10 : 0;
  const rpm = Math.round((requestCount / (SAMPLE_MS / 1000)) * 60);
  requestCount = 0;
  history.push({
    t: Date.now(),
    rpm,
    cpuPct,
    processCpuPct,
    memPct,
    rssPct,
    rssMb,
    people: presence.size,
  });
  if (history.length > HISTORY_LEN) history.splice(0, history.length - HISTORY_LEN);
}

function scaleAdvice(recent) {
  const n = recent.length || 1;
  const avgCpu = recent.reduce((s, x) => s + (x.cpuPct || 0), 0) / n;
  const avgMem = recent.reduce((s, x) => s + (x.rssPct || 0), 0) / n;
  const avgRpm = recent.reduce((s, x) => s + (x.rpm || 0), 0) / n;
  const peakCpu = recent.reduce((m, x) => Math.max(m, x.cpuPct || 0), 0);
  const hints = [];
  let level = "ok";

  if (avgCpu >= 75 || peakCpu >= 90) {
    level = "warn";
    hints.push("CPU has been high. Increase this instance’s CPU, or add another server.");
  } else if (avgCpu >= 55) {
    level = "watch";
    hints.push("CPU is climbing. Watch this window before peak hours.");
  }

  if (avgMem >= 85) {
    level = "warn";
    hints.push("Memory is tight. Increase RAM on this instance.");
  } else if (avgMem >= 70 && level === "ok") {
    level = "watch";
    hints.push("Memory use is elevated. Leave headroom before a sale or campaign.");
  }

  if (avgRpm >= 180 && avgCpu >= 60) {
    level = "warn";
    hints.push("Request volume and CPU are both high. Scale out to another instance.");
  }

  if (!hints.length) {
    hints.push("Load looks healthy for this instance. No extra server is needed right now.");
  }

  return {
    level,
    avgCpu: Math.round(avgCpu * 10) / 10,
    avgMem: Math.round(avgMem * 10) / 10,
    avgRpm: Math.round(avgRpm),
    hints,
  };
}

function isStaff(role, client) {
  if (STAFF_ROLES.has(String(role || "").toUpperCase())) return true;
  return client === "dashboard";
}

function toSession(row) {
  return {
    sessionId: row.sessionId,
    userId: row.userId || null,
    name: row.name,
    role: row.role,
    path: row.path,
    client: row.client,
    lastSeen: typeof row.lastSeen === "number" ? row.lastSeen : new Date(row.lastSeen).getTime(),
  };
}

async function loadPersisted() {
  try {
    const { mongoose, LiveSession } = models();
    if (mongoose.connection.readyState !== 1) return [];
    const rows = await LiveSession.find({
      lastSeen: { $gt: new Date(Date.now() - PRESENCE_TTL_MS) },
    }).lean();
    return rows.map(toSession);
  } catch {
    return [];
  }
}

async function snapshot() {
  prune();
  const map = new Map();
  for (const row of presence.values()) map.set(row.sessionId, toSession(row));
  for (const row of await loadPersisted()) {
    const current = map.get(row.sessionId);
    if (!current || row.lastSeen >= current.lastSeen) map.set(row.sessionId, row);
  }
  const sessions = [...map.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  const routes = {};
  for (const row of sessions) {
    const key = `${row.client}:${row.path}`;
    routes[key] = (routes[key] || 0) + 1;
  }
  const latest = history[history.length - 1] || {
    rpm: 0,
    cpuPct: 0,
    processCpuPct: 0,
    memPct: 0,
    rssPct: 0,
    rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    people: sessions.length,
  };
  const recent = history.slice(-24);
  const loadAvg = os.loadavg();

  return {
    now: new Date().toISOString(),
    people: {
      total: sessions.length,
      customers: sessions.filter((s) => !isStaff(s.role, s.client)).length,
      staff: sessions.filter((s) => isStaff(s.role, s.client)).length,
      mobile: sessions.filter((s) => s.client === "mobile").length,
      dashboard: sessions.filter((s) => s.client === "dashboard").length,
      sessions,
      routes: Object.entries(routes)
        .map(([key, count]) => {
          const idx = key.indexOf(":");
          return { client: key.slice(0, idx), path: key.slice(idx + 1), count };
        })
        .sort((a, b) => b.count - a.count),
    },
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      cores: os.cpus()?.length || 1,
      loadAvg: loadAvg.some((n) => n > 0) ? loadAvg.map((n) => Math.round(n * 100) / 100) : null,
      cpuPct: latest.cpuPct,
      processCpuPct: latest.processCpuPct,
      memPct: latest.memPct,
      rssPct: latest.rssPct || 0,
      rssMb: latest.rssMb,
      totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemMb: Math.round(os.freemem() / 1024 / 1024),
      uptimeSec: Math.round(process.uptime()),
    },
    traffic: { rpm: latest.rpm },
    history,
    scale: scaleAdvice(recent.length ? recent : [latest]),
  };
}

setInterval(sample, SAMPLE_MS).unref();
sample();

module.exports = { recordRequest, heartbeat, snapshot, touchFromRequest };
