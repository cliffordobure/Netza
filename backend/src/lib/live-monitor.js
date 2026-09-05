const os = require("os");

const PRESENCE_TTL_MS = 45_000;
const SAMPLE_MS = 5_000;
const HISTORY_LEN = 180; // 15 minutes at 5s

const STAFF_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "INVENTORY_MANAGER",
  "SALES_MANAGER",
  "CUSTOMER_SUPPORT",
  "DELIVERY_MANAGER",
]);

const SKIP_PATH = /\/health$|\/uploads\/|\/presence\/heartbeat|\/admin\/live/;

const presence = new Map();
const history = [];

let requestCount = 0;
let lastProcCpu = process.cpuUsage();
let lastHr = process.hrtime.bigint();
let lastSys = readCpuTimes();

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

function recordRequest(req) {
  const url = String(req.originalUrl || req.url || "");
  if (SKIP_PATH.test(url.split("?")[0])) return;
  requestCount += 1;
}

function heartbeat({ sessionId, userId, name, role, path, client }) {
  const id = String(sessionId || userId || "").trim().slice(0, 80);
  if (!id) return;
  const safeClient = client === "dashboard" ? "dashboard" : "mobile";
  presence.set(id, {
    sessionId: id,
    userId: userId ? String(userId) : null,
    name: String(name || "Guest").slice(0, 80),
    role: String(role || "CUSTOMER"),
    path: String(path || "/").slice(0, 200),
    client: safeClient,
    lastSeen: Date.now(),
  });
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
  return Math.min(100, Math.round((used * 100) / cores * 10) / 10);
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

function snapshot() {
  prune();
  const sessions = [...presence.values()].sort((a, b) => b.lastSeen - a.lastSeen);
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

module.exports = { recordRequest, heartbeat, snapshot };
