const TOTAL = 3;
const TODAY = 2;
const UNIQUE_USERS = 2;
const DROPS_AFFECTED = 3;
const LAST_7 = 3;

const USERS = {
  admin: { name: "Admin User", role: "Super Admin", roleKey: "super_admin", avatar: "https://ui-avatars.com/api/?name=Admin+User&background=6D28D9&color=fff" },
  mercy: { name: "Mercy Wanjiku", role: "Administrator", roleKey: "admin", avatar: "https://ui-avatars.com/api/?name=Mercy+Wanjiku&background=2563eb&color=fff" },
  francis: { name: "Francis Kimani", role: "Manager", roleKey: "manager", avatar: "https://ui-avatars.com/api/?name=Francis+Kimani&background=0ea5e9&color=fff" },
  david: { name: "David Mwangi", role: "Manager", roleKey: "manager", avatar: "https://ui-avatars.com/api/?name=David+Mwangi&background=0ea5e9&color=fff" },
  system: { name: "System", role: "System", roleKey: "system", avatar: "https://ui-avatars.com/api/?name=System&background=64748b&color=fff" },
};

const ACTIONS = [
  { id: "created", label: "Created Drop", icon: "plus", tone: "green" },
  { id: "updated", label: "Updated Drop", icon: "pencil", tone: "blue" },
  { id: "activated", label: "Activated Drop", icon: "play", tone: "green" },
  { id: "added_product", label: "Added Product", icon: "grid", tone: "purple" },
  { id: "deleted", label: "Deleted Drop", icon: "trash", tone: "red" },
  { id: "cancelled", label: "Cancelled Drop", icon: "ban", tone: "orange" },
  { id: "expired", label: "Drop Expired", icon: "hourglass", tone: "purple" },
  { id: "settings", label: "Changed Settings", icon: "gear", tone: "grey" },
  { id: "scheduled", label: "Scheduled Drop", icon: "calendar", tone: "orange" },
];

const CORE = [
  {
    at: "2026-05-27T07:45:32.000Z",
    user: "admin",
    action: "created",
    dropName: "Networking Flash Sale",
    dropSku: "FD-2026-0054",
    details: "Created flash drop with 12 products and 40% discount",
    ip: "196.201.45.12",
    status: "success",
  },
  {
    at: "2026-05-27T07:30:15.000Z",
    user: "mercy",
    action: "updated",
    dropName: "TP-Link Archer C6 Router",
    dropSku: "FD-2026-0053",
    details: "Updated discount from 30% to 35%",
    ip: "196.201.89.34",
    status: "success",
  },
  {
    at: "2026-05-27T06:15:00.000Z",
    user: "admin",
    action: "activated",
    dropName: "Hikvision DS-2CD2143G2-I 4MP Dome",
    dropSku: "FD-2026-0052",
    details: "Flash drop is now live",
    ip: "System",
    status: "auto",
  },
  {
    at: "2026-05-27T05:50:22.000Z",
    user: "francis",
    action: "added_product",
    dropName: "Dahua 2MP CCTV Camera",
    dropSku: "FD-2026-0051",
    details: "Added 5 new products to flash drop",
    ip: "196.201.72.18",
    status: "success",
  },
  {
    at: "2026-05-26T14:20:10.000Z",
    user: "admin",
    action: "deleted",
    dropName: "KSh 1,000 Shopping Voucher",
    dropSku: "FD-2026-0050",
    details: "Deleted flash drop",
    ip: "196.201.45.12",
    status: "success",
  },
  {
    at: "2026-05-26T12:45:00.000Z",
    user: "mercy",
    action: "cancelled",
    dropName: "TP-Link Deco X20 Mesh 2-Pack",
    dropSku: "FD-2026-0049",
    details: "Cancelled due to stock issues",
    ip: "196.201.89.34",
    status: "success",
  },
  {
    at: "2026-05-26T09:00:00.000Z",
    user: "system",
    action: "expired",
    dropName: "Ubiquiti UniFi 6 Lite Access Point",
    dropSku: "FD-2026-0048",
    details: "Flash drop expired automatically",
    ip: "System",
    status: "auto",
  },
  {
    at: "2026-05-26T08:30:45.000Z",
    user: "admin",
    action: "settings",
    dropName: "Global Settings",
    dropSku: "",
    details: "Updated flash drop settings",
    ip: "196.201.45.12",
    status: "success",
  },
  {
    at: "2026-05-26T07:15:30.000Z",
    user: "francis",
    action: "scheduled",
    dropName: "TAJIRA Branded Cap",
    dropSku: "FD-2026-0047",
    details: "Scheduled for 28 May 2026 10:00 AM",
    ip: "196.201.72.18",
    status: "success",
  },
];

const POOL = [
  ["TP-Link Archer AX55 Wi-Fi 6 Router", "FD-2026-0046", "updated", "Updated stock from 120 to 150", "mercy"],
  ["Hikvision DS-7608NI-K2 8-Channel NVR", "FD-2026-0045", "created", "Created flash drop with 8 products", "admin"],
  ["280kg Magnetic Lock Kit", "FD-2026-0044", "activated", "Flash drop is now live", "admin"],
  ["MikroTik hEX S Gigabit Router", "FD-2026-0043", "added_product", "Added 3 new products to flash drop", "francis"],
  ["KSh 2,000 Shopping Voucher", "FD-2026-0042", "scheduled", "Scheduled for 29 May 2026 09:00 AM", "mercy"],
  ["Cisco SG350-10P PoE Switch", "FD-2026-0041", "cancelled", "Cancelled by admin", "admin"],
  ["Dahua 4MP PTZ Speed Dome", "FD-2026-0040", "expired", "Flash drop expired automatically", "system"],
  ["Cat6A SFTP Cable 305m Box", "FD-2026-0039", "deleted", "Deleted flash drop", "admin"],
  ["ZKTeco F18 Fingerprint Terminal", "FD-2026-0038", "updated", "Updated discount from 25% to 30%", "david"],
  ["APC Back-UPS 650VA", "FD-2026-0037", "created", "Created flash drop with 6 products", "francis"],
];

const USER_KEYS = ["admin", "mercy", "francis", "david", "system"];
const IPS = ["196.201.45.12", "196.201.89.34", "196.201.72.18", "196.201.55.90", "System"];

function fmtWhen(iso) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
  return `${date} ${time}`;
}

function actionMeta(id) {
  return ACTIONS.find((a) => a.id === id) || ACTIONS[0];
}

function rowAt(i) {
  if (i < CORE.length) {
    const row = CORE[i];
    const user = USERS[row.user];
    const act = actionMeta(row.action);
    return {
      id: `fdl-${i + 1}`,
      n: i + 1,
      at: row.at,
      atLabel: fmtWhen(row.at),
      userId: row.user,
      userName: user.name,
      userRole: user.role,
      roleKey: user.roleKey,
      avatar: user.avatar,
      action: row.action,
      actionLabel: act.label,
      actionIcon: act.icon,
      actionTone: act.tone,
      dropName: row.dropName,
      dropSku: row.dropSku,
      details: row.details,
      ip: row.ip,
      status: row.status,
      statusLabel: row.status === "auto" ? "Auto" : "Success",
    };
  }
  const spec = POOL[(i - CORE.length) % POOL.length];
  const userKey = spec[4] || USER_KEYS[i % USER_KEYS.length];
  const user = USERS[userKey] || USERS.admin;
  const action = spec[2];
  const act = actionMeta(action);
  const at = new Date(Date.parse("2026-05-26T07:15:30.000Z") - (i - CORE.length + 1) * 47 * 60000).toISOString();
  const status = userKey === "system" || action === "expired" || action === "activated" ? "auto" : "success";
  return {
    id: `fdl-${i + 1}`,
    n: i + 1,
    at,
    atLabel: fmtWhen(at),
    userId: userKey,
    userName: user.name,
    userRole: user.role,
    roleKey: user.roleKey,
    avatar: user.avatar,
    action,
    actionLabel: act.label,
    actionIcon: act.icon,
    actionTone: act.tone,
    dropName: spec[0],
    dropSku: spec[1],
    details: spec[3],
    ip: IPS[i % IPS.length],
    status,
    statusLabel: status === "auto" ? "Auto" : "Success",
  };
}

function widgets() {
  return {
    stats: {
      total: TOTAL,
      today: TODAY,
      todayDelta: 15.6,
      uniqueUsers: UNIQUE_USERS,
      dropsAffected: DROPS_AFFECTED,
      last7: LAST_7,
      last7Delta: 12.4,
    },
    overview: {
      total: LAST_7,
      successful: 3,
      failed: 0,
      system: 0,
    },
    days: [
      { d: "2026-05-25", label: "25 May", dateLabel: "25 May 2026", activities: 1 },
      { d: "2026-05-26", label: "26 May", dateLabel: "26 May 2026", activities: 1 },
      { d: "2026-05-27", label: "27 May", dateLabel: "27 May 2026", activities: 1 },
    ],
    tipIndex: 6,
    topUsers: [
      { id: "admin", name: "Admin User", role: "Super Admin", roleKey: "super_admin", count: 2, avatar: USERS.admin.avatar },
      { id: "mercy", name: "Mercy Wanjiku", role: "Administrator", roleKey: "admin", count: 1, avatar: USERS.mercy.avatar },
      { id: "francis", name: "Francis Kimani", role: "Manager", roleKey: "manager", count: 0, avatar: USERS.francis.avatar },
    ],
    actionsList: ACTIONS,
    usersList: Object.entries(USERS).map(([id, u]) => ({ id, name: u.name, role: u.role })),
    dropsList: [
      "Networking Flash Sale",
      "TP-Link Archer C6 Router",
      "Hikvision DS-2CD2143G2-I 4MP Dome",
    ],
  };
}

function listFlashDropLogs(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const q = String(query.q || "").trim().toLowerCase();
  const action = String(query.action || "").trim().toLowerCase();
  const user = String(query.user || "").trim().toLowerCase();
  const drop = String(query.drop || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const skip = (page - 1) * limit;

  let rows = Array.from({ length: TOTAL }, (_, i) => rowAt(i));
  if (q) {
    rows = rows.filter((r) =>
      `${r.userName} ${r.dropName} ${r.dropSku} ${r.details} ${r.actionLabel}`.toLowerCase().includes(q)
    );
  }
  if (action) rows = rows.filter((r) => r.action === action);
  if (user) rows = rows.filter((r) => r.userId === user);
  if (drop) rows = rows.filter((r) => r.dropName.toLowerCase().includes(drop));
  if (status) rows = rows.filter((r) => r.status === status);

  const slice = rows.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 }));
  return { logs: slice, total: rows.length, page, limit, ...widgets() };
}

module.exports = { listFlashDropLogs };
