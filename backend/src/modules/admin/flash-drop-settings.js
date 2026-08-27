const DEFAULTS = {
  enableFlashDrops: true,
  autoStart: true,
  autoEnd: true,
  showCountdown: true,
  defaultDuration: "2h",
  minDuration: "30m",
  maxDuration: "24h",
  timezone: "eat",
  refreshInterval: "10s",
  soldOutBehavior: "hide",
  bufferMinutes: 5,
  lowStockThreshold: 5,
  preventOverselling: true,
  reserveStock: true,
  allowBackorders: false,
  restorePrice: true,
  multiChannelSync: true,
  minStockToStart: 1,
  stockReleaseOnCancel: "immediate",
  partialStockEnd: "zero",
  maxDiscount: 70,
  minDiscount: 5,
  discountType: "percentage",
  priceRounding: "1",
  currency: "KES",
  allowFreeProducts: false,
  displaySavings: true,
  taxOnDiscounted: true,
  limitEntries: 5,
  pointsMultiplier: 2,
  awardPoints: "yes",
  winnersAnnouncement: "end",
  requireLogin: true,
  blockMultipleAccounts: true,
  emailNotifications: true,
  smsNotifications: false,
  productEligibility: "all",
  categoryEligibility: "all",
  brandEligibility: "all",
  geoRestrictions: "all",
  excludeOutOfStock: true,
  allowSameProductMultiple: false,
  maxActiveDrops: 10,
  cooldownHours: 1,
  bannerUrl: "",
  badgeText: "FLASH DEAL",
  badgeColor: "#7C3AED",
  showHomepage: true,
  showCategoryPage: true,
  showSavingsBadge: true,
  highTrafficProtection: true,
  activityLog: true,
  adminApproval: false,
  maintenanceMode: false,
  autoCleanup: true,
  cleanupDays: 30,
  rateLimiting: "strict",
};

let current = { ...DEFAULTS };

function getFlashDropSettings() {
  return { settings: { ...current } };
}

function saveFlashDropSettings(body = {}) {
  current = { ...current, ...body };
  return getFlashDropSettings();
}

function resetFlashDropSettings() {
  current = { ...DEFAULTS };
  return getFlashDropSettings();
}

module.exports = {
  DEFAULTS,
  getFlashDropSettings,
  saveFlashDropSettings,
  resetFlashDropSettings,
};
