const { defaultSettings, loadSettings, saveSettings, resetSettings, loadZones } = require("../../lib/delivery");

function options() {
  return {
    timezones: [
      { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
      { value: "UTC", label: "UTC" },
    ],
    couriers: [
      { value: "g4s", label: "G4S" },
      { value: "sendy", label: "Sendy" },
      { value: "bolt", label: "Bolt Express" },
      { value: "other", label: "Other / Manual" },
    ],
    workingDays: [
      { value: "mon_fri", label: "Monday – Friday" },
      { value: "mon_sat", label: "Monday – Saturday" },
      { value: "everyday", label: "Every day" },
    ],
    assignStrategies: [
      { value: "nearest_zone", label: "Nearest zone courier" },
      { value: "least_busy", label: "Least busy courier" },
      { value: "highest_rating", label: "Highest rated courier" },
      { value: "manual", label: "Manual assignment only" },
    ],
    refundMethods: [
      { value: "original", label: "Original payment method" },
      { value: "wallet", label: "Store wallet / credit" },
      { value: "mpesa", label: "M-Pesa" },
      { value: "manual", label: "Manual refund" },
    ],
    notifyChannels: [
      { value: "sms", label: "SMS only" },
      { value: "whatsapp", label: "WhatsApp only" },
      { value: "sms_whatsapp", label: "SMS + WhatsApp" },
      { value: "email", label: "Email only" },
      { value: "all", label: "All channels" },
    ],
  };
}

async function getDeliverySettings() {
  const [settings, zones] = await Promise.all([loadSettings(), loadZones()]);
  const now = new Date();
  return {
    settings,
    options: options(),
    summary: {
      activeZones: zones.filter((z) => z.status === "active").length,
      onlineCouriers: 0,
      pendingShipments: 0,
      openReturns: 0,
    },
    programInfo: {
      lastUpdated: now.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }),
      lastUpdatedBy: "Admin User",
      settingsId: "DLV-SET-001",
      env: "Production",
    },
    notes: [
      "Checkout uses the matching delivery zone fee, then default / remote / express surcharges.",
      "Free shipping overrides zone fees when the order meets the minimum.",
      "Return window is counted from the delivery confirmation date.",
    ],
    footerTip: "Zone fees on Delivery Zones are what customers pay in the app.",
  };
}

async function saveDeliverySettings(body = {}) {
  const settings = await saveSettings({ ...defaultSettings(), ...body });
  return {
    ok: true,
    message: "Delivery settings saved.",
    settings,
    savedAt: new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }),
  };
}

async function resetDeliverySettings() {
  const settings = await resetSettings();
  return {
    ok: true,
    message: "Delivery settings reset to defaults.",
    settings,
  };
}

module.exports = { getDeliverySettings, saveDeliverySettings, resetDeliverySettings };
