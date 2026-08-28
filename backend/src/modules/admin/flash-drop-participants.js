const { Order, User } = require("../../models");
const { loadAllRows } = require("./flash-drop-admin");

function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff`;
}

async function listFlashDropParticipants(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const channel = String(query.channel || "").trim().toLowerCase();
  const drop = String(query.drop || "").trim();
  const skip = (page - 1) * limit;

  const rows = await Order.aggregate([
    { $match: { paymentStatus: "COMPLETED", "items.wasFlashDrop": true, user: { $ne: null } } },
    {
      $group: {
        _id: "$user",
        spent: { $sum: "$totalKes" },
        drops: { $sum: 1 },
        entries: { $sum: { $size: "$items" } },
        lastAt: { $max: "$paidAt" },
      },
    },
    { $sort: { spent: -1 } },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select(
    "firstName lastName email phone pointsBalance isActive"
  );
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));

  const drops = await loadAllRows();
  const dropOptions = drops.map((d) => ({ id: d.id, name: d.name }));

  let participants = rows.map((r, i) => {
    const u = byId[String(r._id)];
    const name = u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Customer" : "Customer";
    return {
      id: String(r._id),
      n: i + 1,
      name,
      email: u?.email || "",
      phone: u?.phone || "",
      level: "BRONZE",
      drops: r.drops || 0,
      entries: r.entries || 0,
      spent: r.spent || 0,
      points: u?.pointsBalance || 0,
      status: u?.isActive !== false ? "active" : "inactive",
      channel: "app",
      lastAt: r.lastAt,
      winner: false,
      isNew: false,
      dropId: dropOptions[0]?.id || "",
      dropName: dropOptions[0]?.name || "",
      avatar: avatar(name),
    };
  });

  if (q) {
    participants = participants.filter((p) =>
      `${p.name} ${p.email} ${p.phone}`.toLowerCase().includes(q)
    );
  }
  if (status) participants = participants.filter((p) => p.status === status);
  if (channel) participants = participants.filter((p) => p.channel === channel);
  if (drop) participants = participants.filter((p) => p.dropId === drop);

  const slice = participants.slice(skip, skip + limit).map((p, i) => ({ ...p, n: skip + i + 1 }));
  const active = participants.filter((p) => p.status === "active").length;

  return {
    participants: slice,
    total: participants.length,
    page,
    limit,
    stats: {
      total: participants.length,
      totalDelta: 0,
      active,
      activeDelta: 0,
      entries: participants.reduce((s, p) => s + (p.entries || 0), 0),
      entriesDelta: 0,
      winners: 0,
      winnersDelta: 0,
      points: participants.reduce((s, p) => s + (p.points || 0), 0),
      pointsDelta: 0,
      avgDiscount: 0,
      avgDiscountDelta: 0,
    },
    channels: [],
    topDrops: dropOptions.slice(0, 5).map((d) => ({ ...d, participants: 0, pct: 0, image: "" })),
    statusCards: [
      { key: "active", label: "Active", value: active, pct: participants.length ? Math.round((active / participants.length) * 1000) / 10 : 0, tone: "green" },
      { key: "inactive", label: "Inactive", value: participants.length - active, pct: participants.length ? Math.round(((participants.length - active) / participants.length) * 1000) / 10 : 0, tone: "orange" },
      { key: "new", label: "New This Month", value: 0, pct: 0, tone: "blue" },
      { key: "banned", label: "Banned", value: 0, pct: 0, tone: "red" },
    ],
    growth: [],
    tipIndex: 0,
    topParticipants: slice.slice(0, 3).map((p, i) => ({
      n: i + 1,
      name: p.name,
      entries: p.entries,
      spent: p.spent,
      avatar: p.avatar,
    })),
    recent: slice.slice(0, 3).map((p) => ({
      name: p.name,
      at: p.lastAt ? new Date(p.lastAt).toLocaleString("en-KE") : "",
      avatar: p.avatar,
    })),
    drops: dropOptions,
  };
}

module.exports = { listFlashDropParticipants };
