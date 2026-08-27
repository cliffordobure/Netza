const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80&sig=${sig}`;

const FIRST = [
  "James", "Mercy", "John", "Ann", "Kevin", "Janet", "Sarah", "Michael", "Esther",
  "Tom", "Paul", "Ruth", "George", "Irene", "Joseph", "Naomi", "Henry", "Beatrice", "Patrick",
  "Lydia", "Collins", "Agnes", "Martin", "Joyce", "Alex", "Cynthia", "Fred", "Helen", "Victor",
  "Diana", "Simon", "Patricia", "Eric", "Caroline", "Robert", "Lilian", "Anthony", "Sharon", "Philip",
];
const LAST = [
  "Kamau", "Wanjiku", "Njoroge", "Muthoni", "Kipchoge", "Atieno", "Wairimu", "Ochieng", "Odhiambo", "Cheruiyot",
  "Wambua", "Nyambura", "Koech", "Auma", "Mutiso", "Chepkoech", "Otieno", "Kariuki", "Achieng",
  "Wanjiru", "Kibet", "Hassan", "Barasa", "Njeri", "Omondi", "Chebet", "Wambui", "Mutua", "Okoth",
];

const TOTAL = 3;
const ACTIVE = 2;
const BANNED = 0;
const NEW_N = 1;
const WINNERS = 2;

const CORE = [
  { name: "David Mwangi", email: "david.mwangi@gmail.com", phone: "0712345601", level: "GOLD", drops: 12, entries: 28, spent: 24560, points: 4200, status: "active", channel: "app", lastAt: "2026-05-27T07:15:00.000Z", winner: true, isNew: false },
  { name: "Faith Wanjiku", email: "faith.wanjiku@gmail.com", phone: "0722113344", level: "SILVER", drops: 6, entries: 18, spent: 18600, points: 3120, status: "active", channel: "app", lastAt: "2026-05-27T06:48:00.000Z", winner: true, isNew: false },
  { name: "Brian Otieno", email: "brian.otieno@gmail.com", phone: "0712345671", level: "GOLD", drops: 7, entries: 21, spent: 42800, points: 5100, status: "active", channel: "website", lastAt: "2026-05-27T06:12:00.000Z", winner: true, isNew: false },
  { name: "Alice Chebet", email: "alice.chebet@gmail.com", phone: "0733445566", level: "GOLD", drops: 5, entries: 14, spent: 31200, points: 2780, status: "active", channel: "app", lastAt: "2026-05-27T05:54:00.000Z", winner: true, isNew: false },
  { name: "Samuel Kariuki", email: "samuel.kariuki@gmail.com", phone: "0700112233", level: "SILVER", drops: 4, entries: 12, spent: 22100, points: 1960, status: "active", channel: "email", lastAt: "2026-05-27T05:21:00.000Z", winner: false, isNew: false },
  { name: "Mercy Wanjiku", email: "mercy.wanjiku@gmail.com", phone: "0713456789", level: "SILVER", drops: 3, entries: 9, spent: 14200, points: 1540, status: "inactive", channel: "app", lastAt: "2026-05-26T18:10:00.000Z", winner: false, isNew: false },
  { name: "Amina Otieno", email: "amina@example.com", phone: "0712345678", level: "GOLD", drops: 4, entries: 11, spent: 16800, points: 1880, status: "active", channel: "app", lastAt: "2026-05-27T04:36:00.000Z", winner: true, isNew: false },
  { name: "John Kamau", email: "john.kamau@gmail.com", phone: "0721567890", level: "BRONZE", drops: 2, entries: 4, spent: 7600, points: 640, status: "active", channel: "social", lastAt: "2026-05-27T03:18:00.000Z", winner: false, isNew: true },
  { name: "Janet Muthoni", email: "janet.muthoni@gmail.com", phone: "0732678901", level: "SILVER", drops: 3, entries: 8, spent: 15400, points: 1320, status: "inactive", channel: "website", lastAt: "2026-05-25T21:10:00.000Z", winner: false, isNew: false },
  { name: "Caroline Wairimu", email: "caroline.wairimu@gmail.com", phone: "0711567890", level: "BRONZE", drops: 2, entries: 4, spent: 2360, points: 180, status: "inactive", channel: "website", lastAt: "2026-05-24T16:40:00.000Z", winner: false, isNew: false },
  { name: "Peter Kamau", email: "peter.kamau@gmail.com", phone: "0799001122", level: "BRONZE", drops: 1, entries: 2, spent: 4200, points: 360, status: "inactive", channel: "email", lastAt: "2026-05-24T11:28:00.000Z", winner: false, isNew: false },
  { name: "Eunice Moraa", email: "eunice.moraa@gmail.com", phone: "0711882233", level: "BRONZE", drops: 1, entries: 1, spent: 3900, points: 200, status: "active", channel: "app", lastAt: "2026-05-27T07:15:00.000Z", winner: false, isNew: true },
];

const DROPS = [
  { id: "fd-1", name: "TP-Link Archer C6 Router", participants: 1, pct: 33.3, image: img("photo-1606904825846-647eb07f5be2", 1) },
  { id: "fd-2", name: "Dahua 2MP CCTV Camera", participants: 1, pct: 33.3, image: img("photo-1558002038-1055907df827", 17) },
  { id: "fd-3", name: "Hikvision DS-2CD2143G2-I 4MP Dome", participants: 1, pct: 33.4, image: img("photo-1557597774-9d273bd59043", 2) },
];

function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff`;
}

function channelOf(i) {
  if (i < 2) return "app";
  return "website";
}

function statusOf(i) {
  if (i >= TOTAL - BANNED) return "banned";
  if (i < ACTIVE) return "active";
  return "inactive";
}

function rowAt(i) {
  if (i < CORE.length) {
    const row = CORE[i];
    return {
      id: `fdp-${i + 1}`,
      n: i + 1,
      ...row,
      dropId: DROPS[i % DROPS.length].id,
      dropName: DROPS[i % DROPS.length].name,
      avatar: avatar(row.name),
    };
  }
  const first = FIRST[(i * 7) % FIRST.length];
  const last = LAST[(i * 13) % LAST.length];
  const name = `${first} ${last}`;
  const level = i % 11 === 0 ? "GOLD" : i % 4 === 0 ? "SILVER" : "BRONZE";
  const status = statusOf(i);
  const drops = 1 + (i % 8);
  const entries = drops + (i % 5);
  return {
    id: `fdp-${i + 1}`,
    n: i + 1,
    name,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@gmail.com`,
    phone: `07${String(10000000 + (i * 17) % 89999999).slice(0, 8)}`,
    level,
    drops,
    entries,
    spent: 1800 + (i % 90) * 320,
    points: 120 + (i % 40) * 45,
    status,
    channel: channelOf(i),
    lastAt: new Date(Date.parse("2026-05-27T07:15:00.000Z") - (i % 4000) * 9 * 60000).toISOString(),
    winner: i % 75 === 0 && i / 75 < WINNERS,
    isNew: i < NEW_N,
    dropId: DROPS[i % DROPS.length].id,
    dropName: DROPS[i % DROPS.length].name,
    avatar: avatar(name),
  };
}

function indexesFor(tab) {
  if (tab === "active") return { total: ACTIVE, at: (k) => k };
  if (tab === "new") return { total: NEW_N, at: (k) => k };
  if (tab === "winners") return { total: WINNERS, at: (k) => k * 75 };
  if (tab === "spenders") {
    const order = [...CORE.map((_, i) => i)].sort((a, b) => (CORE[b].spent || 0) - (CORE[a].spent || 0));
    return {
      total: TOTAL,
      at: (k) => (k < order.length ? order[k] : CORE.length + (k - order.length)),
    };
  }
  return { total: TOTAL, at: (k) => k };
}

function growth() {
  const values = [1, 1, 0, 1, 1, 2, 3];
  return values.map((participants, i) => {
    const d = i + 21;
    return {
      d: `2026-05-${String(d).padStart(2, "0")}`,
      label: String(d),
      dateLabel: `${d} May 2026`,
      participants,
    };
  });
}

function widgets() {
  return {
    stats: {
      total: TOTAL,
      totalDelta: 0,
      active: ACTIVE,
      activeDelta: 0,
      entries: 8,
      entriesDelta: 0,
      winners: WINNERS,
      winnersDelta: 0,
      points: 7320,
      pointsDelta: 0,
      avgDiscount: 32.6,
      avgDiscountDelta: 0,
    },
    channels: [
      { key: "app", name: "Mobile App", count: 2, pct: 66.7, color: "#6D28D9" },
      { key: "website", name: "Website", count: 1, pct: 33.3, color: "#2563eb" },
    ],
    topDrops: DROPS,
    statusCards: [
      { key: "active", label: "Active", value: ACTIVE, pct: 66.7, tone: "green" },
      { key: "inactive", label: "Inactive", value: 1, pct: 33.3, tone: "orange" },
      { key: "new", label: "New This Month", value: NEW_N, pct: 33.3, tone: "blue" },
      { key: "banned", label: "Banned", value: BANNED, pct: 0, tone: "red" },
    ],
    growth: growth(),
    tipIndex: 15,
    topParticipants: [
      { n: 1, name: "David Mwangi", entries: 28, spent: 24560, avatar: avatar("David Mwangi") },
      { n: 2, name: "Brian Otieno", entries: 21, spent: 42800, avatar: avatar("Brian Otieno") },
      { n: 3, name: "Faith Wanjiku", entries: 18, spent: 18600, avatar: avatar("Faith Wanjiku") },
    ],
    recent: [
      { name: "David Mwangi", at: "27 May 2026, 10:15 AM", avatar: avatar("David Mwangi") },
      { name: "Faith Wanjiku", at: "27 May 2026, 09:42 AM", avatar: avatar("Faith Wanjiku") },
      { name: "Brian Otieno", at: "27 May 2026, 08:18 AM", avatar: avatar("Brian Otieno") },
    ],
    drops: DROPS.map((d) => ({ id: d.id, name: d.name })),
  };
}

function listFlashDropParticipants(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const q = String(query.q || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();
  const channel = String(query.channel || "").trim().toLowerCase();
  const drop = String(query.drop || "").trim();
  const tab = String(query.tab || "all").trim().toLowerCase();
  const skip = (page - 1) * limit;

  if (q) {
    const named = [];
    for (let i = 0; i < TOTAL; i += 1) {
      const row = rowAt(i);
      if (!`${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(q)) continue;
      if (status && row.status !== status) continue;
      if (channel && row.channel !== channel) continue;
      if (drop && row.dropId !== drop) continue;
      named.push(row);
    }
    const slice = named.slice(skip, skip + limit).map((row, i) => ({ ...row, n: skip + i + 1 }));
    return { participants: slice, total: named.length, page, limit, ...widgets() };
  }

  let spec = indexesFor(tab);
  if (status === "active" && (tab === "all" || tab === "spenders")) spec = indexesFor("active");
  else if (status === "inactive") spec = { total: TOTAL - ACTIVE - BANNED, at: (k) => ACTIVE + k };
  else if (status === "banned") spec = { total: BANNED, at: (k) => TOTAL - BANNED + k };

  const rows = [];
  for (let k = skip; k < skip + limit && k < spec.total; k += 1) {
    const row = rowAt(spec.at(k));
    if (status && row.status !== status) continue;
    if (channel && row.channel !== channel) continue;
    if (drop && row.dropId !== drop) continue;
    rows.push({ ...row, n: k + 1 });
  }
  return { participants: rows, total: spec.total, page, limit, ...widgets() };
}

module.exports = { listFlashDropParticipants };
