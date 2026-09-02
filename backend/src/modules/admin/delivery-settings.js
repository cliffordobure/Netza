let CURRENT = null;

function defaults() {
  return {
    // General
    enabled: true,
    companyName: "Tajira Kenya Delivery",
    supportPhone: "+254 700 000 000",
    supportEmail: "delivery@tajira.co.ke",
    timezone: "Africa/Nairobi",
    defaultCourier: "g4s",
    workingDays: "mon_sat",
    cutoffTime: "15:00",
    sameDayCutoff: "12:00",

    // Shipping rules
    freeShippingEnabled: true,
    freeShippingMinKes: 5000,
    baseFeeKes: 300,
    weightLimitKg: 30,
    packingMinutes: 45,
    requireSignature: false,
    allowCashOnDelivery: true,
    maxCodKes: 50000,
    fragileHandlingFee: 150,

    // Couriers
    autoAssignCourier: true,
    assignStrategy: "nearest_zone",
    requireCourierVerification: true,
    maxActiveDeliveries: 8,
    allowOfflineDispatch: false,
    courierSlaMinutes: 120,

    // Zones & fees
    defaultZoneFeeKes: 250,
    remoteAreaSurchargeKes: 400,
    vatOnDelivery: true,
    vatPercent: 16,
    weekendSurchargeKes: 100,
    peakHourSurchargeKes: 50,

    // Returns
    returnsEnabled: true,
    returnWindowDays: 7,
    autoApproveReturns: false,
    refundMethod: "original",
    restockingFeePercent: 0,
    pickupForReturns: true,

    // Notifications
    notifyDispatch: true,
    notifyOutForDelivery: true,
    notifyDelivered: true,
    notifyFailed: true,
    notifyChannels: "sms_whatsapp",
    customerTrackingLink: true,
    adminAlertOnFailed: true,

    // Automation
    autoMarkDeliveredHours: 72,
    autoFailAfterDays: 5,
    autoReassignFailed: true,
    syncWithOrders: true,
    webhookUrl: "",
    automationTimezone: "Africa/Nairobi",
  };
}

function getDeliverySettings() {
  if (!CURRENT) CURRENT = defaults();
  return {
    settings: { ...CURRENT },
    options: {
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
    },
    summary: {
      activeZones: 2,
      onlineCouriers: 1,
      pendingShipments: 1,
      openReturns: 1,
    },
    programInfo: {
      lastUpdated: "27 May 2026, 10:30 AM",
      lastUpdatedBy: "Admin User",
      settingsId: "DLV-SET-001",
      env: "Production",
    },
    notes: [
      "Cutoff times use Africa/Nairobi (EAT).",
      "Free shipping overrides zone fees when the order qualifies.",
      "Return window is counted from the delivery confirmation date.",
      "Failed deliveries can be auto-reassigned when automation is enabled.",
    ],
    footerTip: "Tip: Review courier assignment and return window settings before peak sale periods.",
  };
}

function saveDeliverySettings(body = {}) {
  const base = CURRENT || defaults();
  CURRENT = { ...base, ...body };
  return {
    ok: true,
    message: "Delivery settings saved.",
    settings: { ...CURRENT },
    savedAt: "27 May 2026, 10:30 AM",
  };
}

function resetDeliverySettings() {
  CURRENT = defaults();
  return {
    ok: true,
    message: "Delivery settings reset to defaults.",
    settings: { ...CURRENT },
  };
}

module.exports = { getDeliverySettings, saveDeliverySettings, resetDeliverySettings };
