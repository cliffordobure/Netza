const ZONES_KEY = "deliveryZones";
const SETTINGS_KEY = "deliverySettings";

const DEFAULT_ZONES = [
  {
    id: "zone1",
    name: "Nairobi CBD",
    city: "Nairobi",
    area: "CBD & Surroundings",
    coverage: "CBD, Upper Hill, Community",
    fee: 150,
    eta: "Same day",
    etaTone: "same",
    deliveryType: "same_day",
    status: "active",
    region: "nairobi",
  },
  {
    id: "zone2",
    name: "Westlands",
    city: "Nairobi",
    area: "Westlands Area",
    coverage: "Westlands, Parklands, Spring Valley",
    fee: 120,
    eta: "1 day",
    etaTone: "next",
    deliveryType: "next_day",
    status: "active",
    region: "nairobi",
  },
  {
    id: "zone3",
    name: "Eastlands",
    city: "Nairobi",
    area: "Eastlands Corridor",
    coverage: "Eastlands, Embakasi, Donholm",
    fee: 130,
    eta: "1 day",
    etaTone: "next",
    deliveryType: "next_day",
    status: "inactive",
    region: "nairobi",
  },
];

function defaultSettings() {
  return {
    enabled: true,
    companyName: "Tajira Kenya Delivery",
    supportPhone: "+254 700 000 000",
    supportEmail: "delivery@tajira.co.ke",
    timezone: "Africa/Nairobi",
    defaultCourier: "g4s",
    workingDays: "mon_sat",
    cutoffTime: "15:00",
    sameDayCutoff: "12:00",
    freeShippingEnabled: true,
    freeShippingMinKes: 5000,
    baseFeeKes: 300,
    weightLimitKg: 30,
    packingMinutes: 45,
    requireSignature: false,
    allowCashOnDelivery: true,
    maxCodKes: 50000,
    fragileHandlingFee: 150,
    autoAssignCourier: true,
    assignStrategy: "nearest_zone",
    requireCourierVerification: true,
    maxActiveDeliveries: 8,
    allowOfflineDispatch: false,
    courierSlaMinutes: 120,
    defaultZoneFeeKes: 250,
    remoteAreaSurchargeKes: 0,
    expressSurchargeKes: 200,
    vatOnDelivery: false,
    vatPercent: 16,
    weekendSurchargeKes: 0,
    peakHourSurchargeKes: 0,
    returnsEnabled: true,
    returnWindowDays: 7,
    autoApproveReturns: false,
    refundMethod: "original",
    restockingFeePercent: 0,
    pickupForReturns: true,
    notifyDispatch: true,
    notifyOutForDelivery: true,
    notifyDelivered: true,
    notifyFailed: true,
    notifyChannels: "sms_whatsapp",
    customerTrackingLink: true,
    adminAlertOnFailed: true,
    autoMarkDeliveredHours: 72,
    autoFailAfterDays: 5,
    autoReassignFailed: true,
    syncWithOrders: true,
    webhookUrl: "",
    automationTimezone: "Africa/Nairobi",
  };
}

function settingModel() {
  return require("../models").Setting;
}

async function loadJson(key, fallback) {
  const doc = await settingModel().findOne({ key }).lean();
  if (!doc?.value) return fallback;
  try {
    const parsed = JSON.parse(doc.value);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

async function saveJson(key, value) {
  await settingModel().findOneAndUpdate(
    { key },
    { value: JSON.stringify(value) },
    { upsert: true }
  );
}

async function loadSettings() {
  const stored = await loadJson(SETTINGS_KEY, null);
  return { ...defaultSettings(), ...(stored && typeof stored === "object" ? stored : {}) };
}

async function saveSettings(next) {
  const merged = { ...defaultSettings(), ...next };
  await saveJson(SETTINGS_KEY, merged);
  return merged;
}

async function resetSettings() {
  const defaults = defaultSettings();
  await saveJson(SETTINGS_KEY, defaults);
  return defaults;
}

function decorateZone(row, index) {
  const status = row.status === "inactive" ? "inactive" : "active";
  return {
    id: row.id || `zone${index + 1}`,
    n: index + 1,
    name: row.name || "Zone",
    city: row.city || "",
    area: row.area || "",
    coverage: row.coverage || "",
    fee: Number(row.fee) || 0,
    eta: row.eta || "2-3 days",
    etaTone: row.etaTone || (String(row.eta || "").toLowerCase().includes("same") ? "same" : "next"),
    deliveryType: row.deliveryType || "standard",
    status,
    statusLabel: status === "active" ? "Active" : "Inactive",
    orders: Number(row.orders) || 0,
    region: row.region || "other",
  };
}

async function loadZones() {
  const stored = await loadJson(ZONES_KEY, null);
  if (!Array.isArray(stored) || !stored.length) return [];
  return stored.map(decorateZone);
}

async function saveZones(zones) {
  const rows = (zones || []).map((row, i) => decorateZone(row, i));
  await saveJson(ZONES_KEY, rows);
  return rows;
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return norm(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
}

function scoreZone(zone, address = {}) {
  if (zone.status === "inactive") return 0;
  const city = norm(address.city);
  const county = norm(address.county);
  const street = norm(address.street);
  const hay = `${city} ${county} ${street}`.trim();
  if (!hay) return 0;

  let score = 0;
  const zoneCity = norm(zone.city);
  const zoneName = norm(zone.name);
  const zoneArea = norm(zone.area);

  if (zoneCity && (city === zoneCity || county === zoneCity)) score += 3;
  else if (zoneCity && (hay.includes(zoneCity) || zoneCity.includes(city) || zoneCity.includes(county))) score += 2;

  if (zoneName && hay.includes(zoneName)) score += 4;
  if (zoneArea && hay.includes(zoneArea)) score += 3;

  for (const part of String(zone.coverage || "").split(",")) {
    const token = norm(part);
    if (token.length > 2 && hay.includes(token)) score += 5;
  }
  for (const token of tokens(`${zone.name} ${zone.area} ${zone.coverage}`)) {
    if (hay.includes(token)) score += 1;
  }
  return score;
}

function pickZone(zones, address) {
  let best = null;
  let bestScore = 0;
  for (const zone of zones) {
    const score = scoreZone(zone, address);
    if (score > bestScore) {
      best = zone;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : null;
}

function weekendInNairobi(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-KE", { weekday: "short", timeZone: "Africa/Nairobi" }).format(now);
  return day === "Sat" || day === "Sun";
}

async function quoteDelivery({ address = {}, method = "STANDARD", subtotalKes = 0 } = {}) {
  const [settings, zones] = await Promise.all([loadSettings(), loadZones()]);
  const matched = pickZone(zones, address);
  let deliveryKes = matched
    ? Number(matched.fee) || 0
    : Number(settings.defaultZoneFeeKes ?? settings.baseFeeKes) || 0;

  if (!matched && Number(settings.remoteAreaSurchargeKes) > 0) {
    deliveryKes += Number(settings.remoteAreaSurchargeKes) || 0;
  }
  if (String(method).toUpperCase() === "EXPRESS") {
    deliveryKes += Number(settings.expressSurchargeKes) || 0;
  }
  if (Number(settings.weekendSurchargeKes) > 0 && weekendInNairobi()) {
    deliveryKes += Number(settings.weekendSurchargeKes) || 0;
  }

  const freeShipping =
    Boolean(settings.freeShippingEnabled) &&
    Number(subtotalKes) >= Number(settings.freeShippingMinKes || 0) &&
    Number(settings.freeShippingMinKes) > 0;

  if (freeShipping) deliveryKes = 0;

  return {
    deliveryKes: Math.max(0, Math.round(deliveryKes)),
    zoneId: matched?.id || null,
    zoneName: matched?.name || null,
    eta: matched?.eta || (String(method).toUpperCase() === "EXPRESS" ? "Next day" : "2-3 days"),
    method: String(method).toUpperCase() === "EXPRESS" ? "EXPRESS" : "STANDARD",
    freeShipping,
    matched: Boolean(matched),
  };
}

module.exports = {
  defaultSettings,
  loadSettings,
  saveSettings,
  resetSettings,
  loadZones,
  saveZones,
  quoteDelivery,
  decorateZone,
};
