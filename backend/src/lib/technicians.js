const { User } = require("../models");
const { sendSms, configured } = require("./beem");
const { normalizePhone } = require("./phone");

const TECH_RE = /technic|install|engineer|cctv|trade/i;

function nameOf(u) {
  return `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.phone || "Technician";
}

async function listTechnicians(onlineSessions = []) {
  const onlineIds = new Set(
    (onlineSessions || []).map((s) => s.userId).filter(Boolean).map(String)
  );
  const base = {
    role: "CUSTOMER",
    isActive: { $ne: false },
    blacklisted: { $ne: true },
  };
  const tagged = {
    ...base,
    $or: [{ tags: { $elemMatch: { $regex: TECH_RE } } }, { segment: { $regex: TECH_RE } }],
  };
  let users = await User.find(tagged).select("firstName lastName phone tags segment").sort({ firstName: 1 }).lean();
  if (!users.length) {
    users = await User.find(base).select("firstName lastName phone tags segment").sort({ firstName: 1 }).limit(500).lean();
  }
  return users
    .filter((u) => normalizePhone(u.phone))
    .map((u) => ({
      id: String(u._id),
      name: nameOf(u),
      phone: normalizePhone(u.phone),
      online: onlineIds.has(String(u._id)),
    }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
}

async function sendPromoSms({ userId, message }) {
  const text = String(message || "").trim().slice(0, 480);
  if (!text) {
    const err = new Error("Write the SMS message");
    err.status = 400;
    throw err;
  }
  if (!configured()) {
    const err = new Error("Beem SMS is not configured. Add BEEM_API_KEY and BEEM_SECRET_KEY on the API.");
    err.status = 400;
    throw err;
  }
  const all = await listTechnicians();
  const target = String(userId || "all") === "all" ? all : all.filter((t) => t.id === String(userId));
  if (!target.length) {
    const err = new Error(userId && userId !== "all" ? "That technician was not found" : "No technicians with a phone number");
    err.status = 400;
    throw err;
  }
  const phones = [...new Set(target.map((t) => t.phone))];
  const chunkSize = 80;
  let sent = 0;
  for (let i = 0; i < phones.length; i += chunkSize) {
    const chunk = phones.slice(i, i + chunkSize);
    const result = await sendSms({ to: chunk, message: text });
    if (!result.skipped) sent += chunk.length;
  }
  return {
    sent,
    total: phones.length,
    names: target.slice(0, 8).map((t) => t.name),
  };
}

module.exports = { listTechnicians, sendPromoSms };
