const TICKETS = [
  { subject: "Order not delivered — ORD-2026-012840", customer: "Helen Mwangi", email: "helen.mwangi@email.com", channel: "email", priority: "high", status: "open", statusLabel: "Open", assignee: "Faith A.", updated: "27 May 2026 · 11:20 AM", created: "27 May 2026 · 09:05 AM" },
  { subject: "Refund request for damaged item", customer: "Brian Kircho", email: "brian.kircho@email.com", channel: "chat", priority: "urgent", status: "pending", statusLabel: "Pending", assignee: "James O.", updated: "27 May 2026 · 10:45 AM", created: "26 May 2026 · 04:12 PM" },
  { subject: "Unable to redeem loyalty points", customer: "Mercy Wanjiku", email: "mercy.wanjiku@email.com", channel: "app", priority: "medium", status: "open", statusLabel: "Open", assignee: "Unassigned", updated: "27 May 2026 · 08:30 AM", created: "27 May 2026 · 08:28 AM" },
  { subject: "Wrong size received — Fashion order", customer: "Grace Njeri", email: "grace.njeri@email.com", channel: "phone", priority: "medium", status: "resolved", statusLabel: "Resolved", assignee: "Faith A.", updated: "26 May 2026 · 06:10 PM", created: "25 May 2026 · 02:40 PM" },
  { subject: "M-PESA payment deducted twice", customer: "Peter Okello", email: "peter.okello@email.com", channel: "email", priority: "high", status: "pending", statusLabel: "Pending", assignee: "James O.", updated: "26 May 2026 · 03:55 PM", created: "26 May 2026 · 01:20 PM" },
  { subject: "How do I track my Flash Drop order?", customer: "Amina Hassan", email: "amina.hassan@email.com", channel: "chat", priority: "low", status: "resolved", statusLabel: "Resolved", assignee: "Faith A.", updated: "25 May 2026 · 11:00 AM", created: "25 May 2026 · 10:15 AM" },
  { subject: "Account locked after failed login", customer: "Daniel Kamau", email: "daniel.kamau@email.com", channel: "app", priority: "high", status: "open", statusLabel: "Open", assignee: "Unassigned", updated: "27 May 2026 · 07:50 AM", created: "27 May 2026 · 07:48 AM" },
  { subject: "Coupon NETZA500 not applying", customer: "Samuel Kiprop", email: "samuel.kiprop@email.com", channel: "email", priority: "medium", status: "closed", statusLabel: "Closed", assignee: "James O.", updated: "24 May 2026 · 05:30 PM", created: "23 May 2026 · 09:00 AM" },
];

const ARTICLES = [
  { title: "How to track an order", category: "Orders", views: 4820, helpful: 94 },
  { title: "Redeeming loyalty points", category: "Points", views: 3120, helpful: 91 },
  { title: "Return & refund policy", category: "Returns", views: 5680, helpful: 88 },
  { title: "Payment methods accepted", category: "Payments", views: 2940, helpful: 96 },
  { title: "Flash Drop participation guide", category: "Flash Drops", views: 2180, helpful: 90 },
];

function getSupport(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  let list = TICKETS.map((t, i) => ({
    id: `tkt${String(i + 1).padStart(4, "0")}`,
    n: i + 1,
    ...t,
  }));

  const q = (query.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    );
  }
  if (query.status) list = list.filter((t) => t.status === query.status);
  if (query.priority) list = list.filter((t) => t.priority === query.priority);
  if (query.channel) list = list.filter((t) => t.channel === query.channel);
  if (query.tab && query.tab !== "all" && query.tab !== "knowledge") {
    list = list.filter((t) => t.status === query.tab);
  }

  list = list.map((t, i) => ({ ...t, n: i + 1 }));
  const total = list.length;
  const skip = (page - 1) * limit;
  const tickets = list.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    stats: {
      open: TICKETS.filter((t) => t.status === "open").length,
      pending: TICKETS.filter((t) => t.status === "pending").length,
      resolved: TICKETS.filter((t) => t.status === "resolved").length,
      closed: TICKETS.filter((t) => t.status === "closed").length,
      avgResponse: "1.4h",
      csat: 94.2,
    },
    tickets,
    articles: ARTICLES,
    filters: {
      statuses: [
        { value: "open", label: "Open" },
        { value: "pending", label: "Pending" },
        { value: "resolved", label: "Resolved" },
        { value: "closed", label: "Closed" },
      ],
      priorities: [
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
      channels: [
        { value: "email", label: "Email" },
        { value: "chat", label: "Live Chat" },
        { value: "phone", label: "Phone" },
        { value: "app", label: "In-App" },
      ],
    },
  };
}

const DEFAULT_SETTINGS = {
  storeName: "NETZA Kenya",
  storeTagline: "Shop smarter across Kenya",
  storeEmail: "support@netzakenya.com",
  storePhone: "+254 700 000 000",
  currency: "KES",
  timezone: "Africa/Nairobi",
  language: "en",
  address: "Nairobi CBD, Kenya",
  city: "Nairobi",
  country: "Kenya",
  taxRate: 16,
  orderPrefix: "ORD-",
  invoicePrefix: "INV-",
  lowStockThreshold: 10,
  maintenanceMode: false,
  allowGuestCheckout: true,
  requireEmailVerify: true,
  showOutOfStock: true,
  autoConfirmOrders: false,
  twoFactorAdmin: true,
  notifyNewOrder: true,
  notifyLowStock: true,
  notifyTicket: true,
  notifyPaymentFail: true,
  notifyFlashDrop: true,
  notifyDailyDigest: false,
  sessionTimeoutMin: 60,
  passwordMinLength: 8,
  lockoutAttempts: 5,
  mpesaEnabled: true,
  mpesaShortcode: "174379",
  cardEnabled: true,
  cashOnDelivery: true,
  bankTransfer: false,
  webhookUrl: "",
  apiKeyMasked: "nz_live_••••••••9f2a",
  googleAnalyticsId: "",
  metaPixelId: "",
  smsSenderId: "NETZA",
  emailFromName: "NETZA Kenya",
  emailFromAddress: "noreply@netzakenya.com",
};

let SETTINGS = { ...DEFAULT_SETTINGS };

let TEAM = [
  { id: "usr1", name: "Faith Achieng", email: "faith@netzakenya.com", role: "Super Admin", status: "active", lastActive: "Just now" },
  { id: "usr2", name: "James Otieno", email: "james@netzakenya.com", role: "Support Agent", status: "active", lastActive: "12 min ago" },
  { id: "usr3", name: "Helen Mwangi", email: "helen@netzakenya.com", role: "Operations", status: "active", lastActive: "1h ago" },
  { id: "usr4", name: "Brian Kircho", email: "brian@netzakenya.com", role: "Marketing", status: "invited", lastActive: "—" },
];

function getSettings() {
  return {
    settings: { ...SETTINGS },
    defaults: { ...DEFAULT_SETTINGS },
    team: TEAM.map((m, i) => ({ ...m, n: i + 1 })),
    roles: ["Super Admin", "Admin", "Operations", "Support Agent", "Marketing", "Finance"],
    summary: {
      teamActive: TEAM.filter((m) => m.status === "active").length,
      teamInvited: TEAM.filter((m) => m.status === "invited").length,
      paymentsOn: [SETTINGS.mpesaEnabled, SETTINGS.cardEnabled, SETTINGS.cashOnDelivery, SETTINGS.bankTransfer].filter(Boolean).length,
      maintenance: SETTINGS.maintenanceMode,
    },
    info: {
      settingsId: "SET-GLOBAL-001",
      env: "Production",
      lastUpdated: "27 May 2026 · 03:12 PM",
      lastUpdatedBy: "Faith Achieng",
    },
    options: {
      timezones: [
        { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
        { value: "UTC", label: "UTC" },
      ],
      currencies: [
        { value: "KES", label: "KES — Kenyan Shilling" },
        { value: "USD", label: "USD — US Dollar" },
      ],
      languages: [
        { value: "en", label: "English" },
        { value: "sw", label: "Swahili" },
      ],
    },
    notes: [
      "Save changes before switching tabs to keep edits.",
      "Payment credentials stay encrypted and are never shown in full.",
      "Invited team members must accept email before they can sign in.",
    ],
    footerTip: "Store-wide settings apply to dashboard, mobile app and checkout. Module-specific settings (Delivery, Points, Flash Drops) live under each module.",
  };
}

function saveSettings(body = {}) {
  const { team, invite, memberUpdate, ...rest } = body;
  SETTINGS = { ...SETTINGS, ...rest };
  if (invite?.email) {
    TEAM = [
      ...TEAM,
      {
        id: `usr${TEAM.length + 1}`,
        name: invite.name || invite.email,
        email: invite.email,
        role: invite.role || "Support Agent",
        status: "invited",
        lastActive: "—",
      },
    ];
  }
  if (memberUpdate?.id) {
    TEAM = TEAM.map((m) => (m.id === memberUpdate.id ? { ...m, ...memberUpdate } : m));
  }
  return { ...getSettings(), ok: true, message: "Settings saved." };
}

function resetSettings() {
  SETTINGS = { ...DEFAULT_SETTINGS };
  return { ...getSettings(), ok: true, message: "Settings reset to defaults." };
}

const UNITS = [
  { name: "Piece", abbr: "pc", type: "count", products: 1840, status: "active" },
  { name: "Kilogram", abbr: "kg", type: "weight", products: 420, status: "active" },
  { name: "Gram", abbr: "g", type: "weight", products: 186, status: "active" },
  { name: "Litre", abbr: "L", type: "volume", products: 240, status: "active" },
  { name: "Millilitre", abbr: "ml", type: "volume", products: 312, status: "active" },
  { name: "Pack", abbr: "pk", type: "count", products: 98, status: "active" },
  { name: "Dozen", abbr: "dz", type: "count", products: 44, status: "inactive" },
  { name: "Meter", abbr: "m", type: "length", products: 62, status: "active" },
];

function getProductUnits(query = {}) {
  let list = UNITS.map((u, i) => ({ id: `unt${i + 1}`, n: i + 1, ...u }));
  const q = (query.q || "").trim().toLowerCase();
  if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.abbr.toLowerCase().includes(q));
  if (query.type) list = list.filter((u) => u.type === query.type);
  if (query.status) list = list.filter((u) => u.status === query.status);
  list = list.map((u, i) => ({ ...u, n: i + 1 }));
  return {
    total: list.length,
    units: list,
    stats: {
      total: UNITS.length,
      active: UNITS.filter((u) => u.status === "active").length,
      inactive: UNITS.filter((u) => u.status === "inactive").length,
      linkedProducts: UNITS.reduce((s, u) => s + u.products, 0),
    },
    filters: {
      types: [
        { value: "count", label: "Count" },
        { value: "weight", label: "Weight" },
        { value: "volume", label: "Volume" },
        { value: "length", label: "Length" },
      ],
      statuses: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  };
}

const IMPORT_HISTORY = [
  { file: "products-may-batch.csv", type: "Products", rows: 240, success: 238, failed: 2, status: "completed", statusLabel: "Completed", date: "26 May 2026 · 02:14 PM", by: "Faith A." },
  { file: "inventory-adjust.xlsx", type: "Inventory", rows: 86, success: 86, failed: 0, status: "completed", statusLabel: "Completed", date: "24 May 2026 · 11:40 AM", by: "Helen M." },
  { file: "brands-import.csv", type: "Brands", rows: 32, success: 30, failed: 2, status: "completed", statusLabel: "Completed", date: "20 May 2026 · 04:05 PM", by: "Faith A." },
  { file: "customers-vip.csv", type: "Customers", rows: 120, success: 0, failed: 0, status: "processing", statusLabel: "Processing", date: "27 May 2026 · 10:02 AM", by: "James O." },
  { file: "bad-sku-list.csv", type: "Products", rows: 18, success: 0, failed: 18, status: "failed", statusLabel: "Failed", date: "18 May 2026 · 09:22 AM", by: "Brian K." },
];

function getProductImport() {
  return {
    history: IMPORT_HISTORY.map((h, i) => ({ id: `imp${i + 1}`, n: i + 1, ...h })),
    stats: {
      imports: IMPORT_HISTORY.length,
      successRows: IMPORT_HISTORY.reduce((s, h) => s + h.success, 0),
      failedRows: IMPORT_HISTORY.reduce((s, h) => s + h.failed, 0),
      processing: IMPORT_HISTORY.filter((h) => h.status === "processing").length,
    },
    templates: [
      { key: "products", label: "Products CSV", columns: "sku, name, price, stock, category, brand" },
      { key: "inventory", label: "Inventory CSV", columns: "sku, warehouse, qty, action" },
      { key: "customers", label: "Customers CSV", columns: "name, email, phone, segment" },
      { key: "brands", label: "Brands CSV", columns: "name, slug, status" },
    ],
  };
}

module.exports = {
  getSupport,
  getSettings,
  saveSettings,
  resetSettings,
  getProductUnits,
  getProductImport,
};
