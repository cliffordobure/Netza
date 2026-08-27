function getPointsSettings() {
  return {
    settings: {
      // General
      enabled: true,
      programName: "Netza Loyalty Program",
      programDescription: "Earn points every time you shop and redeem exciting rewards.",
      pointsSingular: "Point",
      pointsPlural: "Points",
      pointsSymbol: "pts",
      earningType: "order_amount",
      pointsPerKes: 10,
      minOrderKes: 100,
      roundingRule: "round_down",
      maxPointsPerOrder: 5000,
      signupBonus: 200,
      allowRedemption: true,
      partialRedemption: true,
      combineWithDiscounts: true,
      taxOnRewards: "taxable",
      defaultDelivery: "instant",
      programActive: true,

      // Earning Rules
      earnOnPurchase: true,
      earnOnSignup: true,
      earnOnReferral: true,
      earnOnReview: true,
      earnOnBirthday: true,
      reviewBonus: 50,
      birthdayBonus: 100,
      referralBonusReferrer: 200,
      referralBonusFriend: 100,
      earnDelayDays: 0,
      excludeDiscountedItems: false,
      excludeShipping: true,
      stackWithPromotions: true,

      // Redemption Rules
      minRedeemPoints: 100,
      maxRedeemPercent: 50,
      redeemIncrement: 10,
      pointsToKesRate: 1,
      requireLoginToRedeem: true,
      blockRedeemOnSaleItems: false,
      autoApplyBestRedeem: false,
      redeemCooldownHours: 0,

      // Expiry Settings
      pointsExpire: true,
      expiryMonths: 12,
      expiryWarningDays: 30,
      expireUnusedOnly: true,
      extendOnPurchase: true,
      gracePeriodDays: 7,
      autoExpireCron: "daily",

      // Notifications
      notifyEarn: true,
      notifyRedeem: true,
      notifyExpiry: true,
      notifyTier: true,
      notifyChannels: "email_sms",
      expiryReminderDays: 14,
      digestFrequency: "weekly",

      // Fraud & Limits
      maxEarnPerDay: 2000,
      maxRedeemPerDay: 5000,
      maxAccountsPerPhone: 1,
      flagSuspiciousEarn: true,
      requireOrderCompletion: true,
      blockVpnRedeem: false,
      manualReviewThreshold: 10000,

      // Automation
      autoWelcomeBonus: true,
      autoTierUpgrade: true,
      autoExpiryReminders: true,
      autoMonthlyDigest: false,
      syncWithOrders: true,
      webhookUrl: "",
      automationTimezone: "Africa/Nairobi",
    },
    options: {
      earningTypes: [
        { value: "order_amount", label: "Based on Order Amount" },
        { value: "per_item", label: "Based on Items Purchased" },
        { value: "fixed", label: "Fixed Points per Order" },
      ],
      roundingRules: [
        { value: "round_down", label: "Round Down" },
        { value: "round_up", label: "Round Up" },
        { value: "nearest", label: "Round to Nearest" },
      ],
      taxOptions: [
        { value: "taxable", label: "Taxable" },
        { value: "non_taxable", label: "Non-taxable" },
      ],
      deliveryOptions: [
        { value: "instant", label: "Instant" },
        { value: "manual", label: "Manual Approval" },
        { value: "scheduled", label: "Scheduled" },
      ],
      notifyChannels: [
        { value: "email", label: "Email only" },
        { value: "sms", label: "SMS only" },
        { value: "email_sms", label: "Email + SMS" },
        { value: "push", label: "Push notifications" },
        { value: "all", label: "All channels" },
      ],
      digestFrequencies: [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "off", label: "Off" },
      ],
      cronOptions: [
        { value: "hourly", label: "Hourly" },
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
      ],
      timezones: [
        { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
        { value: "UTC", label: "UTC" },
      ],
    },
    summary: {
      activeMembers: 3,
      pointsIssued: 500,
      pointsRedeemed: 200,
      availableBalance: 300,
    },
    programInfo: {
      startedOn: "01 Jan 2025",
      lastUpdated: "27 May 2026, 10:30 AM",
      lastUpdatedBy: "Admin User",
      programId: "LOY-2025-001",
    },
    notes: [
      "Changes to settings are applied immediately.",
      "Members will be notified of important changes.",
      "Expired points are removed automatically.",
      "Make sure to review earning and redemption rules regularly.",
    ],
    footerTip: "Tip: Change any setting above and click 'Save Changes' to update the loyalty program rules.",
  };
}

function savePointsSettings(body = {}) {
  return {
    ok: true,
    message: "Loyalty program settings saved.",
    settings: { ...getPointsSettings().settings, ...body },
    savedAt: "27 May 2026, 10:30 AM",
  };
}

module.exports = { getPointsSettings, savePointsSettings };
