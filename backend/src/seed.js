const bcrypt = require("bcryptjs");
const {
  User,
  Cart,
  Address,
  Category,
  Brand,
  Product,
  AttributeGroup,
  Attribute,
  FlashDrop,
  PointsRule,
  PointsTransaction,
  Setting,
  Order,
  Competition,
} = require("./models");

const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80&sig=${sig}`;

function specsFor(p) {
  if (p.sku.startsWith("NET-") && p.name.includes("Router")) {
    return [
      { name: "Port Speed", value: "1 Gbps" },
      { name: "Number of Ports", value: "5" },
      { name: "Wi-Fi Standard", value: "802.11ax" },
      { name: "PoE Support", value: "No" },
    ];
  }
  if (p.sku.includes("SG108") || p.sku.includes("SG350")) {
    return [
      { name: "Port Speed", value: "1 Gbps" },
      { name: "Number of Ports", value: p.sku.includes("SG350") ? "10" : "8" },
      { name: "PoE Support", value: p.sku.includes("SG350") ? "Yes" : "No" },
    ];
  }
  if (p.name.includes("Access Point") || p.name.includes("Mesh")) {
    return [
      { name: "Wi-Fi Standard", value: "802.11ax" },
      { name: "Port Speed", value: "1 Gbps" },
    ];
  }
  if (p.category === "cctv" && p.name.includes("NVR")) {
    return [{ name: "Number of Ports", value: "8" }, { name: "Capacity", value: "4TB" }];
  }
  if (p.category === "cctv") {
    return [
      { name: "Resolution", value: p.name.includes("8MP") ? "8MP" : "4MP" },
      { name: "Housing", value: p.name.includes("PTZ") ? "PTZ" : "Dome" },
    ];
  }
  if (p.sku.includes("CAT6A")) return [{ name: "Cable Type", value: "Cat6a" }, { name: "Length", value: "305m" }];
  if (p.sku.includes("CAT6")) return [{ name: "Cable Type", value: "Cat6" }, { name: "Length", value: "305m" }];
  if (p.category === "cabling") return [{ name: "Cable Type", value: "Cat6" }];
  if (p.category === "power") return [{ name: "VA Rating", value: "650VA" }];
  if (p.category === "access-control") return [{ name: "Auth Method", value: "Fingerprint" }];
  return [];
}

async function seed() {
  await Promise.all([
    PointsTransaction.deleteMany({}),
    User.deleteMany({}),
    Address.deleteMany({}),
    Cart.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    AttributeGroup.deleteMany({}),
    Attribute.deleteMany({}),
    FlashDrop.deleteMany({}),
    PointsRule.deleteMany({}),
    Setting.deleteMany({}),
    Order.deleteMany({}),
    Competition.deleteMany({}),
  ]);

  await PointsRule.insertMany([
    { key: "PURCHASE", name: "Purchase Points", points: 1, ruleType: "purchase", trigger: "amount_spent", conditionValue: "100", limit: "none", priority: 1, isActive: true, description: "Award 1 NETZA Point for every KSh 100 spent.", configJson: JSON.stringify({ kesPerPoint: 100 }) },
    { key: "FIRST_PURCHASE", name: "First Purchase", points: 200, ruleType: "purchase", trigger: "first_purchase", limit: "once", priority: 2, isActive: true, description: "Bonus when a customer completes their first paid order." },
    { key: "DAILY_LOGIN", name: "Daily Login Bonus", points: 5, ruleType: "engagement", trigger: "daily_login", limit: "once_per_day", priority: 3, isActive: true, description: "Points awarded once per day when a customer signs in." },
    { key: "STREAK_7", name: "7-Day Streak", points: 50, ruleType: "engagement", trigger: "login_streak", conditionValue: "7", limit: "once_per_week", priority: 4, isActive: true, description: "Bonus for logging in 7 days in a row." },
    { key: "REFERRAL", name: "Referral Bonus", points: 100, ruleType: "referral", trigger: "referral_signup", limit: "none", priority: 5, isActive: true, description: "Awarded when a new customer registers with a referral code." },
    { key: "REVIEW", name: "Product Review", points: 20, ruleType: "engagement", trigger: "product_review", limit: "once", priority: 6, isActive: true, description: "Points for posting a product review." },
    { key: "COMPLETE_PROFILE", name: "Complete Profile", points: 50, ruleType: "engagement", trigger: "complete_profile", limit: "once", priority: 7, isActive: true, description: "One-time bonus for completing the customer profile." },
    { key: "WELCOME", name: "Welcome Bonus", points: 50, ruleType: "special", trigger: "signup", limit: "once", priority: 8, isActive: true, description: "Welcome points when a new customer account is created." },
    { key: "COMPETITION", name: "Competition Entry", points: 10, ruleType: "competition", trigger: "competition_entry", limit: "none", priority: 9, isActive: true, description: "Points for entering an active NETZA competition." },
    { key: "COMPETITION_WIN", name: "Competition Win", points: 500, ruleType: "competition", trigger: "competition_win", limit: "once", priority: 10, isActive: true, description: "Winner bonus for a completed competition." },
    { key: "BIRTHDAY", name: "Birthday Bonus", points: 150, ruleType: "promotion", trigger: "birthday", limit: "once_per_year", priority: 11, isActive: false, description: "Annual birthday gift of NETZA Points." },
    { key: "INSTALLATION_PHOTO", name: "Installation Photo", points: 30, ruleType: "engagement", trigger: "photo_upload", limit: "once", priority: 12, isActive: false, description: "Bonus for sharing an installation photo. Currently paused." },
    { key: "REDEEM_OFF500", name: "KSh 500 Voucher", points: 5000, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 4125, priority: 1, isActive: true, description: "KSh 500 off your next NETZA order.", imageUrl: img("photo-1556742049-0cfed4f6a45d", 71), configJson: JSON.stringify({ kind: "redeem", valueKes: 500 }) },
    { key: "REDEEM_SHIP", name: "Free Delivery Coupon", points: 2000, ruleType: "redeem", trigger: "redeem", category: "shipping", conditionValue: "Promotions", stock: -1, redeemedCount: 3782, priority: 2, isActive: true, description: "Free standard delivery on one order.", imageUrl: img("photo-1586528116311-ad8dd3c8310d", 72), configJson: JSON.stringify({ kind: "redeem", shipping: true }) },
    { key: "REDEEM_OFF1000", name: "KSh 1,000 Voucher", points: 10000, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 2568, priority: 3, isActive: true, description: "KSh 1,000 discount coupon.", imageUrl: img("photo-1556742049-0cfed4f6a45d", 73), configJson: JSON.stringify({ kind: "redeem", valueKes: 1000 }) },
    { key: "REDEEM_OFF250", name: "KSh 250 Discount", points: 2500, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 900, priority: 4, isActive: true, description: "KSh 250 Discount Coupon", imageUrl: img("photo-1556742049-0cfed4f6a45d", 74), configJson: JSON.stringify({ kind: "redeem", valueKes: 250 }) },
    { key: "REDEEM_CAP", name: "NETZA Cap", points: 3000, ruleType: "redeem", trigger: "redeem", category: "product", conditionValue: "General", stock: 40, redeemedCount: 412, priority: 5, isActive: true, description: "Branded NETZA Cap merchandise.", imageUrl: img("photo-1521369909029-2afed882baee", 75), configJson: JSON.stringify({ kind: "redeem", merchandise: true }) },
    { key: "REDEEM_OFF100", name: "KSh 100 Discount", points: 1000, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 380, priority: 6, isActive: true, description: "KSh 100 Discount Coupon", imageUrl: img("photo-1556742049-0cfed4f6a45d", 76), configJson: JSON.stringify({ kind: "redeem", valueKes: 100 }) },
    { key: "REDEEM_C6", name: "TP-Link Archer C6 Router", points: 28000, ruleType: "redeem", trigger: "redeem", category: "product", conditionValue: "Networking", stock: 8, redeemedCount: 86, priority: 7, isActive: true, description: "AC1200 MU-MIMO Wi-Fi router for homes and shops.", imageUrl: img("photo-1606904825846-647eb07f5be2", 11) },
    { key: "REDEEM_HK2MP", name: "Hikvision 2MP Camera", points: 18000, ruleType: "redeem", trigger: "redeem", category: "product", conditionValue: "CCTV", stock: 12, redeemedCount: 64, priority: 8, isActive: true, description: "2MP dome camera for home or shop installs.", imageUrl: img("photo-1557597774-9d273bd59043", 21) },
    { key: "REDEEM_SAMEDAY", name: "Nairobi Same-day Delivery", points: 3500, ruleType: "redeem", trigger: "redeem", category: "shipping", conditionValue: "Promotions", stock: -1, redeemedCount: 120, priority: 9, isActive: true, description: "Same-day delivery within Nairobi.", imageUrl: img("photo-1586528116311-ad8dd3c8310d", 77), configJson: JSON.stringify({ kind: "redeem", shipping: true }) },
    { key: "REDEEM_SURVEY", name: "On-site Survey Visit", points: 4000, ruleType: "redeem", trigger: "redeem", category: "experience", conditionValue: "General", stock: 15, redeemedCount: 48, priority: 10, isActive: true, description: "Technician site survey for CCTV or networking.", imageUrl: img("photo-1581092918056-0c4c3acd3789", 78) },
    { key: "REDEEM_RFID", name: "RFID Cards — Pack of 50", points: 5000, ruleType: "redeem", trigger: "redeem", category: "product", conditionValue: "Access Control", stock: 50, redeemedCount: 22, priority: 11, isActive: true, description: "125kHz proximity cards for access control.", imageUrl: img("photo-1586953208448-b95d79e6060e", 33) },
    { key: "REDEEM_TRAIN", name: "Installer Training Session", points: 6000, ruleType: "redeem", trigger: "redeem", category: "experience", conditionValue: "General", stock: 10, redeemedCount: 18, priority: 12, isActive: true, description: "Half-day installer training at a NETZA partner site.", imageUrl: img("photo-1581092918056-0c4c3acd3789", 79) },
    { key: "REDEEM_CCTVFUND", name: "Community CCTV Fund", points: 10000, ruleType: "redeem", trigger: "redeem", category: "donation", conditionValue: "Community", stock: -1, redeemedCount: 14, priority: 13, isActive: true, description: "Donate points toward a community CCTV project.", imageUrl: img("photo-1557597774-9d273bd59043", 80) },
    { key: "REDEEM_OFF200", name: "KSh 200 Voucher", points: 2000, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 210, priority: 14, isActive: true, description: "KSh 200 off your next order.", imageUrl: img("photo-1556742049-0cfed4f6a45d", 81), configJson: JSON.stringify({ kind: "redeem", valueKes: 200 }) },
    { key: "REDEEM_OFF2000", name: "KSh 2,000 Voucher", points: 20000, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 40, priority: 15, isActive: true, description: "KSh 2,000 discount coupon.", imageUrl: img("photo-1556742049-0cfed4f6a45d", 82), configJson: JSON.stringify({ kind: "redeem", valueKes: 2000 }) },
    { key: "REDEEM_AX55", name: "TP-Link Archer AX55 Router", points: 32000, ruleType: "redeem", trigger: "redeem", category: "product", conditionValue: "Networking", stock: 6, redeemedCount: 12, priority: 16, isActive: true, description: "Wi-Fi 6 router redeemed from the NETZA catalog.", imageUrl: img("photo-1606904825846-647eb07f5be2", 12) },
    { key: "REDEEM_POE", name: "PoE Injector Kit", points: 8000, ruleType: "redeem", trigger: "redeem", category: "product", conditionValue: "Networking", stock: 25, redeemedCount: 8, priority: 17, isActive: true, description: "Gigabit PoE injector kit for access points and cameras.", imageUrl: img("photo-1544197150-b99a5804f08d", 42) },
    { key: "REDEEM_UPS", name: "UPS Health Check Visit", points: 3500, ruleType: "redeem", trigger: "redeem", category: "experience", conditionValue: "Power", stock: 20, redeemedCount: 7, priority: 18, isActive: true, description: "On-site UPS inspection and battery health check.", imageUrl: img("photo-1581092918056-0c4c3acd3789", 83) },
    { key: "REDEEM_EXPRESS", name: "CBD Express Delivery", points: 2500, ruleType: "redeem", trigger: "redeem", category: "shipping", conditionValue: "Promotions", stock: -1, redeemedCount: 0, priority: 19, isActive: false, description: "Express delivery within Nairobi CBD. Currently paused.", imageUrl: img("photo-1586528116311-ad8dd3c8310d", 84) },
    { key: "REDEEM_CAT6", name: "Cat6 UTP Cable 305m Box", points: 12000, ruleType: "redeem", trigger: "redeem", category: "product", conditionValue: "Cabling", stock: 20, redeemedCount: 1, priority: 20, isActive: false, description: "305m Cat6 pull box. Currently paused.", imageUrl: img("photo-1544197150-b99a5804f08d", 41) },
    { key: "REDEEM_OFF750", name: "KSh 750 Voucher", points: 7500, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 0, priority: 21, isActive: false, description: "KSh 750 discount coupon. Currently inactive.", imageUrl: img("photo-1556742049-0cfed4f6a45d", 85), configJson: JSON.stringify({ kind: "redeem", valueKes: 750 }) },
    { key: "REDEEM_WEEKEND", name: "Weekend 10% Off", points: 1500, ruleType: "redeem", trigger: "redeem", category: "voucher", conditionValue: "Promotions", stock: -1, redeemedCount: 0, priority: 22, isActive: false, description: "Weekend-only 10% off coupon. Currently inactive.", imageUrl: img("photo-1556742049-0cfed4f6a45d", 86) },
    { key: "REDEEM_INSTALL", name: "Installation Assist", points: 8000, ruleType: "redeem", trigger: "redeem", category: "experience", conditionValue: "General", stock: 6, redeemedCount: 1, priority: 23, isActive: false, description: "Guided installation support visit.", imageUrl: img("photo-1581092918056-0c4c3acd3789", 87) },
    { key: "REDEEM_DONATE", name: "School Lab Cabling Kit", points: 15000, ruleType: "redeem", trigger: "redeem", category: "donation", conditionValue: "Community", stock: 4, redeemedCount: 0, priority: 24, isActive: false, description: "Donate a starter cabling kit to a partner school.", imageUrl: img("photo-1509062522246-3755977927d7", 88) },
  ]);

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const customerHash = await bcrypt.hash("Customer@123", 10);

  await User.create({
    firstName: "Francis",
    lastName: "Admin",
    email: "admin@netza.co.ke",
    phone: "0700000000",
    passwordHash,
    role: "SUPER_ADMIN",
    referralCode: "NETZAADMIN",
    profileCompleted: true,
    membershipLevel: "PLATINUM",
  });

  const customer = await User.create({
    firstName: "Amina",
    lastName: "Otieno",
    email: "amina@example.com",
    phone: "0712345678",
    passwordHash: customerHash,
    role: "CUSTOMER",
    referralCode: "NETZAAMINA",
    profileCompleted: true,
    membershipLevel: "PLATINUM",
    pointsBalance: 50,
    customerNumber: "CUST-00012",
    gender: "Female",
    dateOfBirth: new Date("1995-03-18"),
    preferredPayment: "MPESA",
    adminNotes: "Original demo customer account.",
    lastLoginAt: new Date("2026-08-25T08:00:00.000Z"),
    avatarUrl: "https://ui-avatars.com/api/?name=Amina+Otieno&background=6D28D9&color=fff",
  });
  await Cart.create({ user: customer._id, items: [] });
  await Address.create({
    user: customer._id,
    label: "Home",
    county: "Nairobi",
    city: "South B",
    street: "Ole Shapara Avenue, House 12",
    phone: "0712345678",
    isDefault: true,
  });
  await Address.create({
    user: customer._id,
    label: "Office",
    county: "Nairobi",
    city: "Westlands",
    street: "ABC Place, 3rd Floor, Waiyaki Way",
    phone: "0722000111",
    isDefault: false,
  });
  await PointsTransaction.create({
    user: customer._id,
    type: "WELCOME",
    points: 50,
    description: "Welcome to NETZA Kenya",
    createdAt: new Date("2026-05-10T10:02:00.000Z"),
  });

  const extraPeople = [
    { firstName: "Brian", lastName: "Otieno", email: "brian.otieno@gmail.com", phone: "0712345671", street: "Ngong Road, Building 14", city: "Nairobi", postal: "00100", level: "GOLD", points: 5240, gender: "Male", dob: "1992-01-12", pay: "MPESA", notes: "Very loyal customer. Prefers networking and CCTV products.", n: 1, referral: "BRIAN2026", lastLogin: "2026-05-25T06:15:00.000Z", joinedAt: "2024-01-12T06:15:00.000Z", tags: ["VIP Customer", "Networking", "Tech Lover"], segment: "loyal" },
    { firstName: "Faith", lastName: "Wanjiku", email: "faith.wanjiku@gmail.com", phone: "0722113344", street: "Thika Road, Garden City", city: "Roysambu", postal: "00600", level: "SILVER", points: 1860, gender: "Female", dob: "1996-04-03", pay: "PESAPAL", notes: "Often buys Wi-Fi kits for rental units.", n: 2 },
    { firstName: "Daniel", lastName: "Mwangi", email: "daniel.mwangi@gmail.com", phone: "0733556677", street: "Mombasa Road, Sameer Business Park", city: "Nairobi", postal: "00200", level: "GOLD", points: 3120, gender: "Male", dob: "1988-09-21", pay: "MPESA", notes: "Office CCTV rollouts.", n: 3 },
    { firstName: "Lucy", lastName: "Njeri", email: "lucy.njeri@gmail.com", phone: "0744889900", street: "Argwings Kodhek Road", city: "Hurlingham", postal: "00100", level: "BRONZE", points: 240, gender: "Female", dob: "1999-02-14", pay: "CARD", notes: "", n: 4 },
    { firstName: "Samuel", lastName: "Kariuki", email: "samuel.kariuki@gmail.com", phone: "0700112233", street: "Kimathi Street, I&M Building", city: "CBD", postal: "00100", level: "SILVER", points: 980, gender: "Male", dob: "1991-11-08", pay: "POINTS", notes: "Redeems points on cabling.", n: 5 },
    { firstName: "Grace", lastName: "Achieng", email: "grace.achieng@gmail.com", phone: "0711887766", street: "Kisumu Rd, Milimani", city: "Kisumu", postal: "40100", level: "BRONZE", points: 80, gender: "Female", dob: "1994-07-19", pay: "MPESA", notes: "", n: 6 },
    { firstName: "Peter", lastName: "Kamau", email: "peter.kamau@gmail.com", phone: "0799001122", street: "Nakuru-Nairobi Hwy", city: "Nakuru", postal: "20100", level: "BRONZE", points: 80, gender: "Male", dob: "1985-03-30", pay: "MPESA", notes: "", n: 7 },
    { firstName: "Mary", lastName: "Wambui", email: "mary.wambui@gmail.com", phone: "0711223344", street: "Ngara Road", city: "Nairobi", postal: "00100", level: "SILVER", points: 640, gender: "Female", dob: "1993-06-11", pay: "MPESA", notes: "School lab networking.", n: 8 },
    { firstName: "John", lastName: "Omondi", email: "john.omondi@gmail.com", phone: "0722334455", street: "Kisumu Airport Road", city: "Kisumu", postal: "40100", level: "BRONZE", points: 120, gender: "Male", dob: "1990-12-02", pay: "PESAPAL", notes: "", n: 9 },
    { firstName: "Alice", lastName: "Chebet", email: "alice.chebet@gmail.com", phone: "0733445566", street: "Eldoret CBD", city: "Eldoret", postal: "30100", level: "GOLD", points: 2200, gender: "Female", dob: "1987-05-05", pay: "MPESA", notes: "Hotel access control installs.", n: 10 },
    { firstName: "Kevin", lastName: "Mutua", email: "kevin.mutua@gmail.com", phone: "0744556677", street: "Mombasa Nyali", city: "Mombasa", postal: "80100", level: "BRONZE", points: 0, gender: "Male", dob: "1998-08-16", pay: "CARD", notes: "Chargebacks on last order.", n: 11, inactive: true, blacklisted: true },
  ];
  const extraCustomers = [];
  for (const p of extraPeople) {
    const u = await User.create({
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone,
      passwordHash: customerHash,
      role: "CUSTOMER",
      referralCode: p.referral || `NETZA${p.firstName.toUpperCase().slice(0, 4)}${p.phone.slice(-3)}`,
      profileCompleted: true,
      membershipLevel: p.level || "BRONZE",
      pointsBalance: p.points ?? 80,
      customerNumber: `CUST-${String(p.n).padStart(5, "0")}`,
      gender: p.gender || "",
      dateOfBirth: p.dob ? new Date(p.dob) : undefined,
      preferredPayment: p.pay || "MPESA",
      adminNotes: p.notes || "",
      isActive: !p.inactive,
      blacklisted: Boolean(p.blacklisted),
      lastLoginAt: new Date(p.lastLogin || "2026-08-24T07:12:00.000Z"),
      tags: p.tags || [],
      segment: p.segment || "",
      notesLog: p.notes
        ? [{ body: p.n === 1 ? "Active and engaged customer. Likes networking products." : p.notes, at: new Date("2026-05-24T09:00:00.000Z"), author: "Admin" }]
        : [],
      sentMessages: p.n === 1 ? [{ body: "Thanks for being a Gold member.", at: new Date("2026-05-23T12:05:00.000Z") }] : [],
      createdAt: p.joinedAt ? new Date(p.joinedAt) : undefined,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.firstName} ${p.lastName}`)}&background=6D28D9&color=fff`,
    });
    await Cart.create({ user: u._id, items: [] });
    await Address.create({
      user: u._id,
      label: "Home",
      county: p.city === "Kisumu" ? "Kisumu" : p.city === "Nakuru" ? "Nakuru" : p.city === "Mombasa" ? "Mombasa" : p.city === "Eldoret" ? "Uasin Gishu" : "Nairobi",
      city: p.city,
      street: p.street,
      phone: p.phone,
      isDefault: true,
    });
    extraCustomers.push({ user: u, meta: p });
  }

  const categories = await Category.insertMany([
    { name: "Networking", slug: "networking", description: "Routers, switches, access points, firewalls and PoE.", sortOrder: 1, imageUrl: img("photo-1558494949-ef010cbdcc31", 1) },
    { name: "CCTV", slug: "cctv", description: "IP cameras, NVRs, DVRs, storage and monitors.", sortOrder: 2, imageUrl: img("photo-1557597774-9d273bd59043", 2) },
    { name: "Access Control", slug: "access-control", description: "Biometrics, RFID, maglocks and controllers.", sortOrder: 3, imageUrl: img("photo-1558002038-1055907df827", 3) },
    { name: "Cabling", slug: "cabling", description: "Cat6, fiber, patch cords and connectors.", sortOrder: 4, imageUrl: img("photo-1544197150-b99a5804f08d", 4) },
    { name: "Power & UPS", slug: "power", description: "UPS systems, PDUs and backup power.", sortOrder: 5, imageUrl: img("photo-1473341304170-971dccb5ac1e", 5) },
    { name: "Wi-Fi & Computers", slug: "computers", description: "Mesh Wi-Fi, laptops and office computing.", sortOrder: 6, imageUrl: img("photo-1517336714731-489689fd1ca8", 6) },
  ]);
  const cat = Object.fromEntries(categories.map((c) => [c.slug, c]));
  await Category.insertMany([
    { name: "Routers", slug: "routers", parent: cat.networking._id, description: "Wi-Fi and wired routers.", sortOrder: 11 },
    { name: "Switches", slug: "switches", parent: cat.networking._id, description: "Managed and unmanaged switches.", sortOrder: 12 },
    { name: "Access Points", slug: "access-points", parent: cat.networking._id, description: "Indoor and outdoor APs.", sortOrder: 13 },
    { name: "IP Cameras", slug: "ip-cameras", parent: cat.cctv._id, description: "Dome, turret and bullet cameras.", sortOrder: 21 },
    { name: "NVRs", slug: "nvrs", parent: cat.cctv._id, description: "Network video recorders.", sortOrder: 22 },
    { name: "Storage", slug: "cctv-storage", parent: cat.cctv._id, description: "Surveillance HDDs and arrays.", sortOrder: 23 },
    { name: "Biometrics", slug: "biometrics", parent: cat["access-control"]._id, description: "Fingerprint and face terminals.", sortOrder: 31 },
    { name: "Locks", slug: "locks", parent: cat["access-control"]._id, description: "Maglocks and strikes.", sortOrder: 32 },
    { name: "Copper", slug: "copper", parent: cat.cabling._id, description: "Cat6 and Cat6A cable.", sortOrder: 41 },
    { name: "Fiber", slug: "fiber", parent: cat.cabling._id, description: "Single-mode and multimode.", sortOrder: 42 },
    { name: "UPS", slug: "ups", parent: cat.power._id, description: "Backup power for racks and NVRs.", sortOrder: 51 },
    { name: "Mesh Wi-Fi", slug: "mesh-wifi", parent: cat.computers._id, description: "Whole-home mesh systems.", sortOrder: 61 },
    { name: "Clearance", slug: "clearance", description: "Seasonal clearance — hidden from the storefront.", sortOrder: 99, isActive: false },
  ]);

  const brandSeed = [
    { name: "Hikvision", slug: "hikvision", description: "IP cameras, NVRs and video security systems.", logo: img("photo-1557597774-9d273bd59043", 71) },
    { name: "Dahua", slug: "dahua", description: "CCTV cameras, recorders and analytics.", logo: img("photo-1585771724684-38269d6639fd", 72) },
    { name: "TP-Link", slug: "tp-link", description: "Routers, switches and mesh Wi-Fi for homes and SMEs.", logo: img("photo-1606904825846-647eb07f5be2", 73) },
    { name: "Ubiquiti", slug: "ubiquiti", description: "UniFi networking and wireless for offices.", logo: img("photo-1544197150-b99a5804f08d", 74) },
    { name: "MikroTik", slug: "mikrotik", description: "ISP-grade routers and wireless backhaul.", logo: img("photo-1558494949-ef010cbdcc31", 75) },
    { name: "Cisco", slug: "cisco", description: "Managed switches and enterprise networking.", logo: img("photo-1518770660439-4636190af475", 76) },
    { name: "ZKTeco", slug: "zkteco", description: "Biometrics, access control and attendance.", logo: img("photo-1563013544-824ae1b704d3", 77) },
    { name: "APC", slug: "apc", description: "UPS and power protection for racks and NVRs.", logo: img("photo-1473341304170-971dccb5ac1e", 78) },
    { name: "Seagate", slug: "seagate", description: "Surveillance HDDs for 24/7 recording.", logo: img("photo-1531492746076-161ca2bcad58", 79) },
    { name: "FS", slug: "fs", description: "Cabling, fiber and structured connectivity.", logo: img("photo-1544197150-b99a5804f08d", 80) },
  ];
  const brands = {};
  for (let i = 0; i < brandSeed.length; i += 1) {
    const b = brandSeed[i];
    brands[b.name] = await Brand.create({
      name: b.name,
      slug: b.slug,
      description: b.description,
      logoUrl: b.logo,
      sortOrder: i + 1,
    });
  }
  await Brand.create({
    name: "OEM Generic",
    slug: "oem-generic",
    description: "Unbranded and white-label stock — hidden from the storefront.",
    sortOrder: 99,
    isActive: false,
  });

  const groupSeed = [
    { name: "Networking", slug: "networking-attrs" },
    { name: "Wireless", slug: "wireless" },
    { name: "Cables & Connectors", slug: "cables-connectors" },
    { name: "Power", slug: "power-attrs" },
    { name: "CCTV", slug: "cctv-attrs" },
    { name: "Access Control", slug: "access-attrs" },
    { name: "Computers", slug: "computers-attrs" },
    { name: "Physical", slug: "physical" },
    { name: "Storage", slug: "storage" },
    { name: "Warranty", slug: "warranty" },
    { name: "Installation", slug: "installation" },
    { name: "Global Specs", slug: "global-specs", isGlobal: true },
  ];
  const groups = {};
  for (let i = 0; i < groupSeed.length; i += 1) {
    const g = groupSeed[i];
    groups[g.slug] = await AttributeGroup.create({
      name: g.name,
      slug: g.slug,
      isGlobal: Boolean(g.isGlobal),
      sortOrder: i + 1,
    });
  }
  const attrSeed = [
    { name: "Port Speed", group: "networking-attrs", type: "select", values: ["10/100 Mbps", "1 Gbps", "10 Gbps"] },
    { name: "Number of Ports", group: "networking-attrs", type: "number", values: ["1 - 48"] },
    { name: "PoE Support", group: "networking-attrs", type: "select", values: ["Yes", "No"] },
    { name: "PoE Budget", group: "networking-attrs", type: "select", values: ["15W", "30W", "60W", "90W"] },
    { name: "Management", group: "networking-attrs", type: "select", values: ["Unmanaged", "Smart", "Fully managed"] },
    { name: "Wi-Fi Standard", group: "wireless", type: "select", values: ["802.11n", "802.11ac", "802.11ax"] },
    { name: "Bands", group: "wireless", type: "select", values: ["2.4 GHz", "5 GHz", "Dual-band", "Tri-band"] },
    { name: "Mesh Support", group: "wireless", type: "select", values: ["Yes", "No"] },
    { name: "Cable Type", group: "cables-connectors", type: "select", values: ["Cat5e", "Cat6", "Cat6a", "Cat7"] },
    { name: "Length", group: "cables-connectors", type: "select", values: ["1m", "3m", "5m", "10m", "305m"] },
    { name: "Shielding", group: "cables-connectors", type: "select", values: ["UTP", "FTP", "SFTP"] },
    { name: "Resolution", group: "cctv-attrs", type: "select", values: ["2MP", "4MP", "5MP", "8MP"] },
    { name: "Lens", group: "cctv-attrs", type: "select", values: ["2.8mm", "4mm", "Varifocal"] },
    { name: "IR Range", group: "cctv-attrs", type: "select", values: ["20m", "30m", "50m"] },
    { name: "Housing", group: "cctv-attrs", type: "select", values: ["Dome", "Turret", "Bullet", "PTZ"] },
    { name: "Auth Method", group: "access-attrs", type: "select", values: ["Fingerprint", "RFID", "Face", "PIN"] },
    { name: "Relay", group: "access-attrs", type: "select", values: ["NO", "NC"] },
    { name: "VA Rating", group: "power-attrs", type: "select", values: ["650VA", "1000VA", "1500VA"] },
    { name: "Runtime", group: "power-attrs", type: "number", values: ["5 - 60"] },
    { name: "Colour", group: "physical", type: "select", values: ["Black", "White", "Grey"], displayType: "swatch" },
    { name: "Mounting", group: "physical", type: "select", values: ["Wall", "Ceiling", "Rack", "Desktop"] },
    { name: "Capacity", group: "storage", type: "select", values: ["1TB", "2TB", "4TB", "8TB"] },
    { name: "Warranty Period", group: "warranty", type: "select", values: ["12 months", "24 months", "36 months"] },
    { name: "Indoor/Outdoor", group: "installation", type: "select", values: ["Indoor", "Outdoor", "Both"] },
    { name: "Processor", group: "computers-attrs", type: "text", values: [] },
    { name: "Country of Origin", group: "global-specs", type: "select", values: ["China", "USA", "Taiwan"], isGlobal: true },
    { name: "SKU Prefix", group: "global-specs", type: "text", values: [], isGlobal: true },
    { name: "Legacy Chipset", group: "networking-attrs", type: "select", values: ["Yes", "No"], hidden: true },
  ];
  for (let i = 0; i < attrSeed.length; i += 1) {
    const a = attrSeed[i];
    await Attribute.create({
      name: a.name,
      slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      group: groups[a.group]._id,
      type: a.type,
      displayType: a.displayType || "dropdown",
      values: a.values,
      isGlobal: Boolean(a.isGlobal) || groups[a.group].isGlobal,
      isActive: !a.hidden,
      sortOrder: i + 1,
    });
  }

  const products = [
    { name: "TP-Link Archer AX55 Wi-Fi 6 Router", sku: "NET-AX55", brand: "TP-Link", category: "networking", priceKes: 12500, compareAtKes: 14900, stock: 42, trending: true, warranty: "24 months", description: "Dual-band Wi-Fi 6 router with 4-stream AX3000 speeds, 4 Gigabit LAN ports and OneMesh support. Ideal for Kenyan SMEs and home offices.", image: img("photo-1606904825846-647eb07f5be2", 11) },
    { name: "Hikvision DS-2CD2143G2-I 4MP Dome", sku: "CCTV-HK2143", brand: "Hikvision", category: "cctv", priceKes: 8900, compareAtKes: 10500, stock: 60, trending: true, warranty: "24 months", description: "4MP AcuSense turret/dome with IR up to 30m, H.265+ and IP67 housing. Built for Kenyan outdoor and indoor installs.", image: img("photo-1557597774-9d273bd59043", 21) },
    { name: "ZKTeco F18 Fingerprint Terminal", sku: "AC-F18", brand: "ZKTeco", category: "access-control", priceKes: 14500, stock: 22, trending: true, description: "Fingerprint + RFID access terminal with TCP/IP, Wiegand and time-attendance. Widely used in Kenyan offices.", image: img("photo-1563013544-824ae1b704d3", 31) },
    { name: "Cat6 UTP Cable 305m Box", sku: "CAB-CAT6-305", brand: "FS", category: "cabling", priceKes: 9800, stock: 55, trending: true, description: "305 metre solid-core Cat6 UTP pull box. CMR rated for structured cabling and CCTV IP runs.", image: img("photo-1544197150-b99a5804f08d", 41) },
  ];

  const createdProducts = [];
  for (const p of products) {
    createdProducts.push(
      await Product.create({
        name: p.name,
        slug: p.sku.toLowerCase(),
        sku: p.sku,
        description: p.description,
        brand: brands[p.brand]._id,
        category: cat[p.category]._id,
        priceKes: p.priceKes,
        compareAtKes: p.compareAtKes,
        stock: p.stock,
        warranty: p.warranty || "12 months",
        isTrending: Boolean(p.trending),
        ratingAvg: 4.4,
        ratingCount: 8,
        images: [{ url: p.image, sortOrder: 0 }],
        specs: specsFor(p),
      })
    );
  }

  const now = new Date();
  const flashPool = createdProducts.filter((p) =>
    ["NET-AX55", "CCTV-HK2143", "AC-F18", "CAB-CAT6-305"].includes(p.sku)
  );
  await FlashDrop.create({
    name: "NETZA FLASH DROP",
    discountPercent: 50,
    startsAt: now,
    endsAt: new Date(now.getTime() + 18 * 60 * 60 * 1000),
    maxQtyPerCustomer: 1,
    products: flashPool.map((p) => ({
      product: p._id,
      originalKes: p.priceKes,
      flashKes: Math.round(p.priceKes * 0.5),
      remainingQty: 8,
    })),
  });

  await Setting.insertMany([
    { key: "currency", value: "KES" },
    { key: "country", value: "KE" },
    { key: "supportPhone", value: "+254700000000" },
    { key: "pointsExpiryDays", value: "365" },
    { key: "pointsKesPerPoint", value: "10" },
    { key: "pointsExpiryType", value: "automatic" },
    { key: "pointsExpiryMinBalance", value: "100" },
    { key: "pointsAutoExpiry", value: "true" },
    { key: "pointsRemindersEnabled", value: "true" },
    {
      key: "pointsExpiryReminders",
      value: JSON.stringify([
        { at: "2026-08-20T09:00:00.000Z", customer: "Brian Otieno", channel: "Email", points: 2300, status: "Sent" },
        { at: "2026-08-18T09:00:00.000Z", customer: "Faith Wanjiku", channel: "SMS", points: 900, status: "Sent" },
        { at: "2026-08-12T09:00:00.000Z", customer: "Daniel Mwangi", channel: "Email", points: 1500, status: "Sent" },
      ]),
    },
  ]);

  const sku = Object.fromEntries(createdProducts.map((p) => [p.sku, p]));
  function linesFrom(pairs) {
    return pairs.map(([code, qty]) => {
      const p = sku[code];
      return {
        product: p._id,
        name: p.name,
        sku: p.sku,
        unitPriceKes: p.priceKes,
        quantity: qty,
        lineTotalKes: p.priceKes * qty,
      };
    });
  }
  function money(items, deliveryKes = 300) {
    const subtotalKes = items.reduce((s, i) => s + i.lineTotalKes, 0);
    const vatKes = Math.round(subtotalKes * 0.16);
    return { subtotalKes, deliveryKes, vatKes, totalKes: subtotalKes + deliveryKes + vatKes };
  }

  const brian = extraCustomers[0];
  const faith = extraCustomers[1];
  const daniel = extraCustomers[2];
  const lucy = extraCustomers[3];
  const samuel = extraCustomers[4];
  const grace = extraCustomers[5];
  const peter = extraCustomers[6];
  const mary = extraCustomers[7];
  const alice = extraCustomers[9];
  const kevin = extraCustomers[10];

  await User.updateMany(
    { _id: { $in: [faith.user._id, daniel.user._id, lucy.user._id] } },
    { referredBy: brian.user._id }
  );

  const eat = (iso) => new Date(iso);
  await PointsTransaction.create([
    { user: brian.user._id, type: "PURCHASE", points: 4820, description: "Purchase Points", reference: "NETZA-2026-1246", createdAt: new Date("2026-01-15T08:00:00.000Z"), expiresAt: eat("2026-09-21T20:59:00.000Z") },
    { user: faith.user._id, type: "PURCHASE", points: 1775, description: "Purchase Points", reference: "NETZA-2026-1247", createdAt: new Date("2026-01-18T08:00:00.000Z"), expiresAt: eat("2026-09-02T20:59:00.000Z") },
    { user: daniel.user._id, type: "PURCHASE", points: 3030, description: "Purchase Points", reference: "NETZA-2026-1245", createdAt: new Date("2026-01-20T08:00:00.000Z"), expiresAt: eat("2026-08-28T20:59:00.000Z") },
    { user: lucy.user._id, type: "PURCHASE", points: 190, description: "Purchase Points", createdAt: new Date("2026-02-02T08:00:00.000Z"), expiresAt: eat("2026-09-10T20:59:00.000Z") },
    { user: samuel.user._id, type: "PURCHASE", points: 1280, description: "Purchase Points", createdAt: new Date("2026-02-08T08:00:00.000Z"), expiresAt: eat("2026-09-21T20:59:00.000Z") },
    { user: mary.user._id, type: "PURCHASE", points: 620, description: "Purchase Points", createdAt: new Date("2026-03-01T08:00:00.000Z"), expiresAt: eat("2026-08-20T20:59:00.000Z"), status: "EXPIRED" },
    { user: alice.user._id, type: "PURCHASE", points: 2200, description: "Purchase Points", createdAt: new Date("2026-03-11T08:00:00.000Z"), expiresAt: eat("2026-10-25T20:59:00.000Z") },
    { user: customer._id, type: "WELCOME", points: 50, description: "Welcome Bonus", createdAt: new Date("2026-05-10T10:02:00.000Z"), expiresAt: eat("2026-09-02T20:59:00.000Z") },
    { user: kevin.user._id, type: "WELCOME", points: 80, description: "Welcome to NETZA Kenya", createdAt: new Date("2026-04-02T08:00:00.000Z"), expiresAt: eat("2026-08-10T20:59:00.000Z"), status: "EXPIRED" },
    { user: grace.user._id, type: "WELCOME", points: 80, description: "Welcome to NETZA Kenya", createdAt: new Date("2026-04-10T08:00:00.000Z") },
    { user: peter.user._id, type: "WELCOME", points: 80, description: "Welcome to NETZA Kenya", createdAt: new Date("2026-04-12T08:00:00.000Z") },
    { user: brian.user._id, type: "ORDER", points: 120, description: "Points from order NETZA-2026-1248", reference: "NETZA-2026-1248", createdAt: new Date("2026-05-25T07:33:00.000Z"), expiresAt: eat("2026-11-20T20:59:00.000Z") },
    { user: faith.user._id, type: "ORDER", points: 85, description: "Points from order NETZA-2026-1247", reference: "NETZA-2026-1247", createdAt: new Date("2026-05-24T11:18:00.000Z") },
    { user: samuel.user._id, type: "REDEEM", points: -300, description: "Redeemed for Discount", reference: "OFF100", createdAt: new Date("2026-08-24T08:05:00.000Z") },
    { user: lucy.user._id, type: "ADMIN", points: 50, description: "Manual point adjustment", reference: "ADJ-2041", createdAt: new Date("2026-08-21T13:40:00.000Z") },
    { user: daniel.user._id, type: "ORDER", points: 90, description: "Points from order NETZA-2026-1245", reference: "NETZA-2026-1245", createdAt: new Date("2026-05-18T08:12:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -80, description: "Points expired", status: "EXPIRED", createdAt: new Date("2026-08-16T05:20:00.000Z") },
    { user: mary.user._id, type: "EXPIRE", points: -620, description: "Auto-expired purchase points", status: "EXPIRED", createdAt: new Date("2026-08-21T05:00:00.000Z") },
    { user: mary.user._id, type: "REVIEW", points: 20, description: "Product review reward", reference: "REV-441", createdAt: new Date("2026-05-12T12:15:00.000Z") },
    { user: brian.user._id, type: "DAILY_LOGIN", points: 5, description: "Daily login bonus", createdAt: new Date("2026-07-12T06:10:00.000Z") },
    { user: faith.user._id, type: "DAILY_LOGIN", points: 5, description: "Daily login bonus", createdAt: new Date("2026-07-18T06:10:00.000Z") },
    { user: daniel.user._id, type: "REVIEW", points: 20, description: "Product review reward", createdAt: new Date("2026-07-22T09:00:00.000Z") },
    { user: brian.user._id, type: "DAILY_LOGIN", points: 5, description: "Daily login bonus", createdAt: new Date("2026-08-04T06:10:00.000Z") },
    { user: alice.user._id, type: "REVIEW", points: 20, description: "Product review reward", createdAt: new Date("2026-08-12T09:22:00.000Z") },
    { user: faith.user._id, type: "DAILY_LOGIN", points: 5, description: "Daily login bonus", createdAt: new Date("2026-08-18T06:10:00.000Z") },
    { user: brian.user._id, type: "ORDER", points: 40, description: "Points from order NETZA-2026-1255", reference: "NETZA-2026-1255", createdAt: new Date("2026-08-22T08:40:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -2100, description: "Auto-expired points", status: "EXPIRED", createdAt: new Date("2025-12-18T05:00:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -2800, description: "Auto-expired points", status: "EXPIRED", createdAt: new Date("2026-01-20T05:00:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -1900, description: "Auto-expired points", status: "EXPIRED", createdAt: new Date("2026-02-16T05:00:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -3400, description: "Auto-expired points", status: "EXPIRED", createdAt: new Date("2026-03-18T05:00:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -2600, description: "Auto-expired points", status: "EXPIRED", createdAt: new Date("2026-04-15T05:00:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -4100, description: "Auto-expired points", status: "EXPIRED", createdAt: new Date("2026-05-19T05:00:00.000Z") },
    { user: kevin.user._id, type: "EXPIRE", points: -5620, description: "Auto-expired points", status: "EXPIRED", createdAt: new Date("2026-07-22T05:00:00.000Z") },
  ]);
  for (const [who, at] of [
    [faith.user, "2026-02-01T08:00:00.000Z"],
    [daniel.user, "2026-03-12T08:00:00.000Z"],
    [lucy.user, "2026-04-04T08:00:00.000Z"],
  ]) {
    await PointsTransaction.create({
      user: brian.user._id,
      type: "REFERRAL",
      points: 100,
      description: `Referral reward for ${who.firstName} ${who.lastName}`,
      createdAt: new Date(at),
    });
  }

  const orderSeed = [
    {
      n: "NETZA-2026-1248",
      user: brian.user,
      meta: brian.meta,
      items: linesFrom([["NET-AX55", 1], ["CCTV-HK2143", 1]]),
      status: "PROCESSING",
      paymentMethod: "MPESA",
      paymentStatus: "COMPLETED",
      ref: "QKU7F9K3J2",
      at: "2026-05-25T07:30:00.000Z",
    },
    {
      n: "NETZA-2026-1247",
      user: faith.user,
      meta: faith.meta,
      items: linesFrom([["CAB-CAT6-305", 1]]),
      status: "SHIPPED",
      paymentMethod: "PESAPAL",
      paymentStatus: "COMPLETED",
      ref: "PSL9K21A8",
      at: "2026-05-24T11:15:00.000Z",
    },
    {
      n: "NETZA-2026-1246",
      user: daniel.user,
      meta: daniel.meta,
      items: linesFrom([["AC-F18", 1], ["CAB-CAT6-305", 1]]),
      status: "PENDING_PAYMENT",
      paymentMethod: "MPESA",
      paymentStatus: "PENDING",
      ref: "QKX0WAIT01",
      at: "2026-05-24T08:40:00.000Z",
    },
    {
      n: "NETZA-2026-1245",
      user: lucy.user,
      meta: lucy.meta,
      items: linesFrom([["NET-AX55", 1]]),
      status: "CANCELLED",
      paymentMethod: "CARD",
      paymentStatus: "FAILED",
      ref: "CARDFAIL12",
      at: "2026-05-23T14:05:00.000Z",
    },
    {
      n: "NETZA-2026-1244",
      user: samuel.user,
      meta: samuel.meta,
      items: linesFrom([["AC-F18", 1], ["CAB-CAT6-305", 1]]),
      status: "DELIVERED",
      paymentMethod: "POINTS",
      paymentStatus: "COMPLETED",
      ref: "PTS441992",
      at: "2026-05-22T09:12:00.000Z",
    },
    {
      n: "NETZA-2026-1243",
      user: customer,
      meta: { street: "Ole Shapara Avenue, House 12", city: "South B", postal: "00200", phone: "0712345678" },
      items: linesFrom([["CCTV-HK2143", 2], ["CAB-CAT6-305", 1]]),
      status: "PROCESSING",
      paymentMethod: "MPESA",
      paymentStatus: "COMPLETED",
      ref: "QKAMINA99",
      at: "2026-06-02T10:00:00.000Z",
    },
    {
      n: "NETZA-2026-1242",
      user: grace.user,
      meta: grace.meta,
      items: linesFrom([["AC-F18", 1]]),
      status: "SHIPPED",
      paymentMethod: "MPESA",
      paymentStatus: "COMPLETED",
      ref: "QKGRACE77",
      at: "2026-06-08T13:22:00.000Z",
    },
    {
      n: "NETZA-2026-1241",
      user: peter.user,
      meta: peter.meta,
      items: linesFrom([["NET-AX55", 1], ["CAB-CAT6-305", 1]]),
      status: "DELIVERED",
      paymentMethod: "PESAPAL",
      paymentStatus: "COMPLETED",
      ref: "PSLPETER1",
      at: "2026-06-12T07:48:00.000Z",
    },
    {
      n: "NETZA-2026-1240",
      user: faith.user,
      meta: faith.meta,
      items: linesFrom([["CCTV-HK2143", 2]]),
      status: "PENDING_PAYMENT",
      paymentMethod: "MPESA",
      paymentStatus: "PENDING",
      ref: "QKFAITH02",
      at: "2026-07-01T15:10:00.000Z",
    },
    {
      n: "NETZA-2026-1239",
      user: brian.user,
      meta: brian.meta,
      items: linesFrom([["AC-F18", 1]]),
      status: "DELIVERED",
      paymentMethod: "MPESA",
      paymentStatus: "COMPLETED",
      ref: "QKBRIAN02",
      at: "2026-07-18T06:30:00.000Z",
      returnStatus: "REQUESTED",
    },
    {
      n: "NETZA-2026-1238",
      user: lucy.user,
      meta: lucy.meta,
      items: linesFrom([["NET-AX55", 1]]),
      status: "PROCESSING",
      paymentMethod: "CARD",
      paymentStatus: "COMPLETED",
      ref: "CARDLUCY8",
      at: "2026-08-03T12:05:00.000Z",
    },
    {
      n: "NETZA-2026-1237",
      user: daniel.user,
      meta: daniel.meta,
      items: linesFrom([["CCTV-HK2143", 1], ["CAB-CAT6-305", 2]]),
      status: "SHIPPED",
      paymentMethod: "PESAPAL",
      paymentStatus: "COMPLETED",
      ref: "PSLDAN12",
      at: "2026-08-10T09:40:00.000Z",
    },
    {
      n: "NETZA-2026-1236",
      user: samuel.user,
      meta: samuel.meta,
      items: linesFrom([["NET-AX55", 1]]),
      status: "CANCELLED",
      paymentMethod: "MPESA",
      paymentStatus: "FAILED",
      ref: "QKSAMFAIL",
      at: "2026-08-14T16:18:00.000Z",
    },
    {
      n: "NETZA-2026-1235",
      user: grace.user,
      meta: grace.meta,
      items: linesFrom([["CAB-CAT6-305", 3]]),
      status: "DELIVERED",
      paymentMethod: "POINTS",
      paymentStatus: "COMPLETED",
      ref: "PTSGRACE5",
      at: "2026-08-20T08:00:00.000Z",
    },
  ];

  for (const row of orderSeed) {
    const items = row.items.filter((i) => i.product);
    if (!items.length) continue;
    const m = money(items, 300);
    const paidAt = row.paymentStatus === "COMPLETED" ? new Date(row.at) : null;
    await Order.create({
      orderNumber: row.n,
      user: row.user._id,
      address: {
        label: "Home",
        county: row.meta.city === "Kisumu" ? "Kisumu" : row.meta.city === "Nakuru" ? "Nakuru" : "Nairobi",
        city: row.meta.city,
        street: row.meta.street,
        phone: row.user.phone,
        postalCode: row.meta.postal || "00100",
      },
      status: row.status,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      returnStatus: row.returnStatus || "NONE",
      ...m,
      pointsEarned: row.status === "DELIVERED" ? Math.floor(m.totalKes / 100) : 0,
      paidAt,
      createdAt: new Date(row.at),
      updatedAt: new Date(row.at),
      items,
      payments: [
        {
          provider: row.paymentMethod,
          reference: row.ref,
          amountKes: m.totalKes,
          phone: row.user.phone,
          status: row.paymentStatus,
          createdAt: new Date(row.at),
        },
      ],
    });
  }

  await seedCompetitions();

  console.log("Seeded NETZA Kenya into MongoDB");
  console.log("Admin:     admin@netza.co.ke / Admin@123");
  console.log("Customer:  0712345678 / Customer@123");
  console.log(`Products:  ${createdProducts.length}`);
}

function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff`;
}

function flashTechOverview() {
  return {
    pointsAwarded: 245870,
    participantsPct: 18.6,
    entriesPct: 24.3,
    pointsPct: 22.8,
    completionRate: 96.1,
    prizePoolNote: "+ Products & Points",
    remainingLabel: "2d 14h 23m",
    chartRange: "7d",
    chart: [
      { label: "20 May", participants: 210 },
      { label: "21 May", participants: 480 },
      { label: "22 May", participants: 890 },
      { label: "23 May", participants: 1410 },
      { label: "24 May", participants: 2010 },
      { label: "25 May", participants: 2680 },
      { label: "26 May", participants: 3245 },
    ],
    leaderboard: [
      { rank: 1, name: "Brian Otieno", score: 950, correct: 19, total: 20, points: 950, activity: "2 mins ago" },
      { rank: 2, name: "Faith Wanjiku", score: 920, correct: 18, total: 20, points: 880, activity: "8 mins ago" },
      { rank: 3, name: "Daniel Mwangi", score: 890, correct: 18, total: 20, points: 840, activity: "14 mins ago" },
      { rank: 4, name: "Alice Chebet", score: 860, correct: 17, total: 20, points: 790, activity: "21 mins ago" },
      { rank: 5, name: "Mary Wambui", score: 830, correct: 17, total: 20, points: 760, activity: "36 mins ago" },
      { rank: 6, name: "Samuel Kariuki", score: 800, correct: 16, total: 20, points: 710, activity: "48 mins ago" },
      { rank: 7, name: "Lucy Njeri", score: 770, correct: 16, total: 20, points: 680, activity: "1 hr ago" },
      { rank: 8, name: "John Omondi", score: 740, correct: 15, total: 20, points: 640, activity: "1 hr ago" },
      { rank: 9, name: "Grace Achieng", score: 710, correct: 15, total: 20, points: 610, activity: "2 hrs ago" },
      { rank: 10, name: "Peter Kamau", score: 680, correct: 14, total: 20, points: 570, activity: "3 hrs ago" },
    ].map((row) => ({ ...row, avatar: avatar(row.name) })),
    questions: [
      { name: "Networking Basics", pct: 94.2, attempts: 3245 },
      { name: "Wi-Fi Standards", pct: 88.6, attempts: 3180 },
      { name: "CCTV Installation", pct: 81.4, attempts: 3118 },
      { name: "IP Addressing", pct: 72.1, attempts: 2980 },
      { name: "Power & UPS Safety", pct: 64.8, attempts: 2760 },
    ],
    activity: [
      { kind: "join", title: "New participant joined", detail: "Brian Otieno entered the quiz", at: "2 mins ago" },
      { kind: "score", title: "High score achieved", detail: "Faith Wanjiku scored 18/20", at: "8 mins ago" },
      { kind: "done", title: "Entry completed", detail: "Daniel Mwangi submitted 20 answers", at: "14 mins ago" },
      { kind: "join", title: "New participant joined", detail: "Alice Chebet started the quiz", at: "21 mins ago" },
      { kind: "points", title: "Points awarded", detail: "Mary Wambui earned 760 points", at: "36 mins ago" },
      { kind: "score", title: "Leaderboard updated", detail: "Samuel Kariuki moved to rank 6", at: "48 mins ago" },
    ],
    entries: [
      { id: "ENT-8921", name: "Brian Otieno", score: 950, status: "Completed", at: "2 mins ago" },
      { id: "ENT-8918", name: "Faith Wanjiku", score: 920, status: "Completed", at: "8 mins ago" },
      { id: "ENT-8912", name: "Daniel Mwangi", score: 890, status: "Completed", at: "14 mins ago" },
      { id: "ENT-8904", name: "Alice Chebet", score: 860, status: "Completed", at: "21 mins ago" },
      { id: "ENT-8897", name: "Mary Wambui", score: 830, status: "Completed", at: "36 mins ago" },
      { id: "ENT-8881", name: "Samuel Kariuki", score: 800, status: "In progress", at: "48 mins ago" },
      { id: "ENT-8874", name: "Lucy Njeri", score: 770, status: "Completed", at: "1 hr ago" },
      { id: "ENT-8860", name: "John Omondi", score: 740, status: "Completed", at: "1 hr ago" },
    ],
    participantStats: {
      total: 3245,
      active: 2876,
      activePct: 88.6,
      completed: 1024,
      completedPct: 31.6,
      disqualified: 12,
      disqualifiedPct: 0.4,
      averageScore: 542.6,
      averageMax: 1000,
      pointsAwarded: 245870,
    },
    entryBreakdown: [
      { key: "one", label: "1 Entry", count: 1852, pct: 57.1, color: "#2563EB" },
      { key: "two", label: "2 Entries", count: 986, pct: 30.4, color: "#0B1F3A" },
      { key: "three", label: "3 Entries", count: 407, pct: 12.5, color: "#16A34A" },
    ],
    channels: [
      { key: "app", label: "App", count: 2458, pct: 75.7 },
      { key: "website", label: "Website", count: 612, pct: 18.8 },
      { key: "email", label: "Email Invite", count: 112, pct: 3.5 },
      { key: "social", label: "Social Media", count: 63, pct: 1.9 },
    ],
    participantActivity: [
      { kind: "join", title: "John Kamau joined the competition", detail: "Entered via the NETZA app", at: "2 mins ago" },
      { kind: "done", title: "Mercy Wanjiku completed an entry", detail: "Submitted 20 answers", at: "6 mins ago" },
      { kind: "points", title: "Brian Otieno achieved 950 points", detail: "Best score 19 / 20", at: "12 mins ago" },
      { kind: "join", title: "Amina Otieno joined the competition", detail: "Entered via the website", at: "18 mins ago" },
      { kind: "done", title: "Faith Wanjiku completed an entry", detail: "Score 920", at: "24 mins ago" },
      { kind: "points", title: "Daniel Mwangi earned 180 points", detail: "Quiz entry completed", at: "32 mins ago" },
    ],
  };
}

async function seedCompetitions() {
  await Competition.deleteMany({});
  const rows = [
    {
      code: "COMP-328",
      title: "Flash Tech Quiz",
      description: "Test your knowledge of networking, CCTV and gadgets in this timed NETZA quiz. Answer correctly to climb the leaderboard and win vouchers, routers and bonus points. Open to all customers during the competition window.",
      shortDescription: "Answer tech questions correctly and win amazing rewards!",
      type: "quiz",
      category: "Technology",
      status: "active",
      startsAt: new Date("2026-05-20T07:00:00.000Z"),
      endsAt: new Date("2026-05-27T20:59:00.000Z"),
      prize: "KSh 10,000 Voucher + 5,000 Points",
      pointsToWin: 5000,
      participantCount: 3245,
      winnerCount: 10,
      pointsAwarded: 168000,
      totalEntries: 7892,
      completedEntries: 3118,
      prizePoolKes: 40000,
      progressPct: 87,
      maxAttempts: 3,
      pointsParticipation: 10,
      pointsCorrect: 10,
      overviewJson: JSON.stringify(flashTechOverview()),
      imageUrl: img("photo-1606904825846-647eb07f5be2", 328),
      createdBy: "Admin User",
      isActive: true,
      timezone: "Africa/Nairobi",
      visibility: "public",
      whoCanParticipate: "all",
      publishState: "published",
      estimatedReach: 12450,
      estimatedReachPct: 18.2,
      prizes: [
        { name: "KSh 10,000 Voucher + 5,000 Points", points: 5000, winners: 1 },
        { name: "TP-Link Archer C6 Router + 10,000 Points", points: 10000, winners: 2 },
        { name: "KSh 5,000 Voucher + 2,000 Points", points: 2000, winners: 7 },
      ],
      allowMultipleEntries: true,
      requireLogin: true,
      showLeaderboard: true,
      autoSelectWinners: true,
      winnersAnnounced: "after_end",
      resultsVisibility: "public",
      pointsAwardedType: "instant",
    },
    {
      code: "COMP-327",
      title: "Refer & Win Router",
      description: "Refer friends who complete a first purchase to enter the router draw.",
      type: "referral",
      category: "Networking",
      status: "active",
      startsAt: new Date("2026-05-08T07:00:00.000Z"),
      endsAt: new Date("2026-09-08T20:59:00.000Z"),
      prize: "TP-Link AX55 Router + 2,000 Points",
      pointsToWin: 2000,
      participantCount: 2055,
      winnerCount: 8,
      pointsAwarded: 92000,
      imageUrl: img("photo-1558494949-ef010cbdcc31", 327),
      createdBy: "Admin User",
      isActive: true,
    },
    {
      code: "COMP-326",
      title: "Review & Earn More",
      description: "Write verified product reviews to climb the engagement board.",
      type: "engagement",
      category: "General",
      status: "active",
      startsAt: new Date("2026-07-01T07:00:00.000Z"),
      endsAt: new Date("2026-09-30T20:59:00.000Z"),
      prize: "KSh 5,000 Voucher",
      pointsToWin: 1500,
      participantCount: 2560,
      winnerCount: 15,
      pointsAwarded: 110000,
      imageUrl: img("photo-1516321318423-f06f85e504b3", 326),
      createdBy: "Admin User",
      isActive: true,
    },
    {
      code: "COMP-325",
      title: "Buy & Win CCTV Kit",
      description: "Purchase any CCTV kit to enter the September giveaway.",
      type: "purchase",
      category: "CCTV",
      status: "upcoming",
      startsAt: new Date("2026-09-01T07:00:00.000Z"),
      endsAt: new Date("2026-09-30T20:59:00.000Z"),
      prize: "Hikvision 4-cam kit",
      pointsToWin: 3000,
      participantCount: 640,
      winnerCount: 0,
      pointsAwarded: 0,
      imageUrl: img("photo-1557597774-9d273bd59043", 325),
      createdBy: "Marketing Team",
      isActive: true,
    },
    {
      code: "COMP-324",
      title: "June Grand Giveaway",
      description: "Lucky draw across app and in-store purchases.",
      type: "lucky_draw",
      category: "Promotions",
      status: "upcoming",
      startsAt: new Date("2026-09-15T07:00:00.000Z"),
      endsAt: new Date("2026-10-15T20:59:00.000Z"),
      prize: "KSh 50,000 + 10,000 Points",
      pointsToWin: 10000,
      pointsNote: "Top 10",
      participantCount: 210,
      winnerCount: 0,
      pointsAwarded: 0,
      imageUrl: img("photo-1513885535751-8b9238bd345a", 324),
      createdBy: "Marketing Team",
      isActive: true,
    },
    {
      code: "COMP-323",
      title: "Madaraka Day Promo",
      description: "Quiz and purchase challenge for Madaraka Day.",
      type: "quiz",
      category: "Promotions",
      status: "completed",
      startsAt: new Date("2026-06-01T07:00:00.000Z"),
      endsAt: new Date("2026-06-10T20:59:00.000Z"),
      prize: "KSh 5,000 Voucher",
      pointsToWin: 2000,
      participantCount: 2180,
      winnerCount: 20,
      pointsAwarded: 92000,
      imageUrl: img("photo-1521737604893-d14cc237f11d", 323),
      createdBy: "Admin User",
      isActive: false,
    },
    {
      code: "COMP-322",
      title: "March Madness Draw",
      description: "Lucky draw for March networking orders.",
      type: "lucky_draw",
      category: "Networking",
      status: "completed",
      startsAt: new Date("2026-03-01T07:00:00.000Z"),
      endsAt: new Date("2026-03-31T20:59:00.000Z"),
      prize: "Router bundle + 3,000 Points",
      pointsToWin: 3000,
      participantCount: 3800,
      winnerCount: 31,
      pointsAwarded: 86000,
      imageUrl: img("photo-1544197150-b99a5804f08d", 322),
      createdBy: "Marketing Team",
      isActive: false,
    },
    {
      code: "COMP-321",
      title: "Write & Win Blog",
      description: "Submit an installation story for a feature on the NETZA blog.",
      type: "engagement",
      category: "General",
      status: "cancelled",
      startsAt: new Date("2026-04-08T07:00:00.000Z"),
      endsAt: new Date("2026-04-30T20:59:00.000Z"),
      prize: "Blog feature + 1,000 Points",
      pointsToWin: 1000,
      participantCount: 200,
      winnerCount: 0,
      pointsAwarded: 0,
      imageUrl: img("photo-1455390582262-044cdead277a", 321),
      createdBy: "Admin User",
      isActive: false,
    },
    {
      code: "COMP-320",
      title: "Networking Pro",
      description: "Answer 10 networking questions correctly and climb the leaderboard.",
      type: "quiz",
      category: "Networking",
      status: "active",
      startsAt: new Date("2026-07-10T07:00:00.000Z"),
      endsAt: new Date("2026-09-20T20:59:00.000Z"),
      prize: "KSh 8,000 Voucher",
      pointsToWin: 2500,
      participantCount: 1490,
      winnerCount: 10,
      pointsAwarded: 74000,
      imageUrl: img("photo-1606904825846-647eb07f5be2", 320),
      createdBy: "Admin User",
      isActive: true,
    },
    {
      code: "COMP-319",
      title: "Flash Drop Shopper",
      description: "Score points on every Flash Drop purchase this season.",
      type: "purchase",
      category: "Promotions",
      status: "active",
      startsAt: new Date("2026-07-20T07:00:00.000Z"),
      endsAt: new Date("2026-08-31T20:59:00.000Z"),
      prize: "KSh 3,000 Voucher + 1,000 Points",
      pointsToWin: 1000,
      participantCount: 800,
      winnerCount: 6,
      pointsAwarded: 38000,
      imageUrl: img("photo-1558494949-ef010cbdcc31", 319),
      createdBy: "Admin User",
      isActive: true,
    },
    {
      code: "COMP-318",
      title: "Installation Photo Challenge",
      description: "Share a verified installation photo from a NETZA job.",
      type: "engagement",
      category: "General",
      status: "completed",
      startsAt: new Date("2026-04-05T07:00:00.000Z"),
      endsAt: new Date("2026-04-25T20:59:00.000Z"),
      prize: "KSh 4,000 Voucher",
      pointsToWin: 1200,
      participantCount: 1680,
      winnerCount: 18,
      pointsAwarded: 96000,
      imageUrl: img("photo-1581092918056-0c4c3acd3789", 318),
      createdBy: "Admin User",
      isActive: false,
    },
    {
      code: "COMP-317",
      title: "Valentine CCTV Bundle",
      description: "Purchase a camera bundle in February to enter the draw.",
      type: "purchase",
      category: "CCTV",
      status: "completed",
      startsAt: new Date("2026-02-10T07:00:00.000Z"),
      endsAt: new Date("2026-02-16T20:59:00.000Z"),
      prize: "2MP dome camera + 2,000 Points",
      pointsToWin: 2000,
      participantCount: 2100,
      winnerCount: 14,
      pointsAwarded: 88000,
      imageUrl: img("photo-1557597774-9d273bd59043", 317),
      createdBy: "Marketing Team",
      isActive: false,
    },
    {
      code: "COMP-316",
      title: "New Year Networking Quiz",
      description: "Kick off the year with a networking fundamentals quiz.",
      type: "quiz",
      category: "Networking",
      status: "completed",
      startsAt: new Date("2026-01-02T07:00:00.000Z"),
      endsAt: new Date("2026-01-20T20:59:00.000Z"),
      prize: "KSh 3,000 Voucher",
      pointsToWin: 1500,
      participantCount: 2780,
      winnerCount: 16,
      pointsAwarded: 220220,
      imageUrl: img("photo-1558494949-ef010cbdcc31", 316),
      createdBy: "Admin User",
      isActive: false,
    },
    {
      code: "COMP-315",
      title: "Router Rush Draw",
      description: "Lucky draw for June router purchases.",
      type: "lucky_draw",
      category: "Networking",
      status: "completed",
      startsAt: new Date("2026-06-12T07:00:00.000Z"),
      endsAt: new Date("2026-06-30T20:59:00.000Z"),
      prize: "Archer C6 Router",
      pointsToWin: 0,
      pointsNote: "N/A Top 10",
      participantCount: 2020,
      winnerCount: 10,
      pointsAwarded: 64000,
      imageUrl: img("photo-1606904825846-647eb07f5be2", 315),
      createdBy: "Marketing Team",
      isActive: false,
    },
    {
      code: "COMP-314",
      title: "Customer Review Marathon",
      description: "Write three verified reviews in April.",
      type: "engagement",
      category: "General",
      status: "completed",
      startsAt: new Date("2026-04-12T07:00:00.000Z"),
      endsAt: new Date("2026-04-28T20:59:00.000Z"),
      prize: "KSh 2,000 Voucher",
      pointsToWin: 800,
      participantCount: 980,
      winnerCount: 22,
      pointsAwarded: 41000,
      imageUrl: img("photo-1516321318423-f06f85e504b3", 314),
      createdBy: "Admin User",
      isActive: false,
    },
    {
      code: "COMP-313",
      title: "Cabling Challenge",
      description: "Purchase Cat6 or fiber and enter the April challenge.",
      type: "purchase",
      category: "Cabling",
      status: "completed",
      startsAt: new Date("2026-04-02T07:00:00.000Z"),
      endsAt: new Date("2026-04-22T20:59:00.000Z"),
      prize: "305m Cat6 box",
      pointsToWin: 2500,
      participantCount: 1320,
      winnerCount: 8,
      pointsAwarded: 52000,
      imageUrl: img("photo-1544197150-b99a5804f08d", 313),
      createdBy: "Admin User",
      isActive: false,
    },
    {
      code: "COMP-312",
      title: "Access Control Ace",
      description: "Quiz on RFID, maglocks and controllers.",
      type: "quiz",
      category: "Access Control",
      status: "completed",
      startsAt: new Date("2026-04-18T07:00:00.000Z"),
      endsAt: new Date("2026-04-30T20:59:00.000Z"),
      prize: "RFID pack + 1,000 Points",
      pointsToWin: 1000,
      participantCount: 420,
      winnerCount: 12,
      pointsAwarded: 24560,
      imageUrl: img("photo-1558002038-1055907df827", 312),
      createdBy: "Marketing Team",
      isActive: false,
    },
    {
      code: "COMP-311",
      title: "Independence Day Draw",
      description: "Lucky draw opening for Jamhuri week.",
      type: "lucky_draw",
      category: "Promotions",
      status: "upcoming",
      startsAt: new Date("2026-12-01T07:00:00.000Z"),
      endsAt: new Date("2026-12-12T20:59:00.000Z"),
      prize: "KSh 20,000 Voucher",
      pointsToWin: 5000,
      participantCount: 80,
      winnerCount: 0,
      pointsAwarded: 0,
      imageUrl: img("photo-1513885535751-8b9238bd345a", 311),
      createdBy: "Marketing Team",
      isActive: true,
    },
  ];
  await Competition.insertMany(rows.map((row) => ({
    ...row,
    shortDescription: row.shortDescription || String(row.description || "").slice(0, 150),
    prizes: row.prizes || (row.prize ? [{ name: row.prize, points: row.pointsToWin || 0, winners: 1 }] : []),
    estimatedReach: row.estimatedReach || Math.max(800, Math.round((row.participantCount || 0) * 3.8)),
  })));
}

module.exports = { seed, seedCompetitions };

if (require.main === module) {
  require("dotenv").config();
  const { connectDb, disconnectDb } = require("./lib/db");
  connectDb()
    .then(seed)
    .then(disconnectDb)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
