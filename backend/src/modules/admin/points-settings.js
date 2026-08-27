function getPointsSettings() {
  return {
    settings: {
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
    },
    summary: {
      activeMembers: 18256,
      pointsIssued: 2845600,
      pointsRedeemed: 1256780,
      availableBalance: 713500,
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
