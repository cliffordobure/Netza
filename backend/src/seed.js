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
const { normalizeEmail, normalizePhone } = require("./lib/identity");

const img = (id, sig) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80&sig=${sig}`;

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
    {
      key: "PURCHASE",
      name: "Purchase Points",
      points: 1,
      ruleType: "purchase",
      trigger: "amount_spent",
      conditionValue: "100",
      limit: "none",
      priority: 1,
      isActive: true,
      description: "1 TAJIRA Point for every KSh 100 spent.",
      configJson: JSON.stringify({ kesPerPoint: 100 }),
    },
    {
      key: "WELCOME",
      name: "Welcome Bonus",
      points: 50,
      ruleType: "special",
      trigger: "signup",
      limit: "once",
      priority: 2,
      isActive: true,
      description: "Welcome points for new customer accounts.",
    },
    {
      key: "REDEEM_OFF500",
      name: "KSh 500 Voucher",
      points: 5000,
      ruleType: "redeem",
      trigger: "redeem",
      category: "voucher",
      conditionValue: "Promotions",
      stock: -1,
      redeemedCount: 12,
      priority: 3,
      isActive: true,
      description: "KSh 500 off your next TAJIRA order.",
      imageUrl: img("photo-1556742049-0cfed4f6a45d", 71),
      configJson: JSON.stringify({ kind: "redeem", valueKes: 500 }),
    },
  ]);

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const customerHash = await bcrypt.hash("Customer@123", 10);

  await User.create({
    firstName: "Francis",
    lastName: "Admin",
    email: normalizeEmail("admin@tajira.co.ke"),
    phone: normalizePhone("0700000000"),
    passwordHash,
    role: "SUPER_ADMIN",
    referralCode: "TAJIRAADMIN",
    profileCompleted: true,
    membershipLevel: "PLATINUM",
  });

  async function makeCustomer(p) {
    const u = await User.create({
      firstName: p.firstName,
      lastName: p.lastName,
      email: normalizeEmail(p.email),
      phone: normalizePhone(p.phone),
      passwordHash: customerHash,
      role: "CUSTOMER",
      referralCode: p.referral,
      profileCompleted: true,
      membershipLevel: p.level,
      pointsBalance: p.points,
      customerNumber: p.customerNumber,
      gender: p.gender,
      preferredPayment: "MPESA",
      adminNotes: p.notes || "",
      lastLoginAt: new Date(p.lastLogin || "2026-08-24T07:12:00.000Z"),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.firstName} ${p.lastName}`)}&background=6D28D9&color=fff`,
      createdAt: p.joinedAt ? new Date(p.joinedAt) : undefined,
    });
    await Cart.create({ user: u._id, items: [] });
    await Address.create({
      user: u._id,
      label: "Home",
      county: "Nairobi",
      city: p.city,
      street: p.street,
      phone: p.phone,
      isDefault: true,
    });
    return u;
  }

  const amina = await makeCustomer({
    firstName: "Amina",
    lastName: "Otieno",
    email: "amina@example.com",
    phone: "0712345678",
    referral: "TAJIRAAMINA",
    level: "PLATINUM",
    points: 50,
    customerNumber: "CUST-00001",
    gender: "Female",
    city: "South B",
    street: "Ole Shapara Avenue, House 12",
    notes: "Primary mobile test account.",
    lastLogin: "2026-08-25T08:00:00.000Z",
  });

  const brian = await makeCustomer({
    firstName: "Brian",
    lastName: "Otieno",
    email: "brian.otieno@gmail.com",
    phone: "0712345671",
    referral: "BRIAN2026",
    level: "GOLD",
    points: 520,
    customerNumber: "CUST-00002",
    gender: "Male",
    city: "Nairobi",
    street: "Ngong Road, Building 14",
    notes: "Loyal networking customer.",
    joinedAt: "2024-01-12T06:15:00.000Z",
  });

  const faith = await makeCustomer({
    firstName: "Faith",
    lastName: "Wanjiku",
    email: "faith.wanjiku@gmail.com",
    phone: "0722113344",
    referral: "FAITH2026",
    level: "SILVER",
    points: 180,
    customerNumber: "CUST-00003",
    gender: "Female",
    city: "Roysambu",
    street: "Thika Road, Garden City",
  });

  await PointsTransaction.insertMany([
    { user: amina._id, type: "WELCOME", points: 50, description: "Welcome to Tajira Kenya", createdAt: new Date("2026-05-10T10:02:00.000Z") },
    { user: brian._id, type: "ORDER", points: 120, description: "Points from order TAJIRA-2026-1001", reference: "TAJIRA-2026-1001", createdAt: new Date("2026-07-12T08:00:00.000Z") },
    { user: faith._id, type: "WELCOME", points: 50, description: "Welcome to Tajira Kenya", createdAt: new Date("2026-06-01T09:00:00.000Z") },
  ]);

  const categories = await Category.insertMany([
    { name: "Networking", slug: "networking", description: "Routers, switches and Wi-Fi.", sortOrder: 1, imageUrl: img("photo-1558494949-ef010cbdcc31", 1) },
    { name: "CCTV", slug: "cctv", description: "Cameras and recorders.", sortOrder: 2, imageUrl: img("photo-1557597774-9d273bd59043", 2) },
    { name: "Access Control", slug: "access-control", description: "Biometrics and RFID.", sortOrder: 3, imageUrl: img("photo-1558002038-1055907df827", 3) },
  ]);
  const cat = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const brandSeed = [
    { name: "TP-Link", slug: "tp-link", description: "Wi-Fi and networking gear." },
    { name: "Hikvision", slug: "hikvision", description: "CCTV cameras and NVRs." },
    { name: "ZKTeco", slug: "zkteco", description: "Access control terminals." },
  ];
  const brands = {};
  for (const b of brandSeed) {
    brands[b.name] = await Brand.create({ ...b, isActive: true, logoUrl: img("photo-1560179707-f14e90ef3623", 70) });
  }

  const group = await AttributeGroup.create({ name: "Networking", slug: "networking-attrs", isActive: true });
  await Attribute.insertMany([
    { name: "Port Speed", slug: "port-speed", group: group._id, type: "select", values: ["1 Gbps", "10 Gbps"], isActive: true, sortOrder: 1 },
    { name: "PoE Support", slug: "poe-support", group: group._id, type: "select", values: ["Yes", "No"], isActive: true, sortOrder: 2 },
  ]);

  const productDefs = [
    {
      name: "TP-Link Archer AX55 Wi-Fi 6 Router",
      sku: "NET-AX55",
      brand: "TP-Link",
      category: "networking",
      priceKes: 12500,
      compareAtKes: 14900,
      stock: 42,
      description: "Dual-band Wi-Fi 6 router with AX3000 speeds for Kenyan SMEs and homes.",
      image: img("photo-1606904825846-647eb07f5be2", 11),
    },
    {
      name: "Hikvision DS-2CD2143G2-I 4MP Dome",
      sku: "CCTV-HK2143",
      brand: "Hikvision",
      category: "cctv",
      priceKes: 8900,
      compareAtKes: 10500,
      stock: 60,
      description: "4MP AcuSense dome with IR up to 30m and IP67 housing.",
      image: img("photo-1557597774-9d273bd59043", 21),
    },
    {
      name: "ZKTeco F18 Fingerprint Terminal",
      sku: "AC-F18",
      brand: "ZKTeco",
      category: "access-control",
      priceKes: 14500,
      stock: 22,
      description: "Fingerprint + RFID access terminal with TCP/IP.",
      image: img("photo-1563013544-824ae1b704d3", 31),
    },
  ];

  const createdProducts = [];
  for (const p of productDefs) {
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
        warranty: "12 months",
        isTrending: true,
        isActive: true,
        ratingAvg: 4.5,
        ratingCount: 3,
        images: [{ url: p.image, sortOrder: 0 }],
      })
    );
  }
  const sku = Object.fromEntries(createdProducts.map((p) => [p.sku, p]));

  const now = new Date();
  await FlashDrop.create({
    name: "TAJIRA FLASH DROP",
    discountPercent: 50,
    startsAt: now,
    endsAt: new Date(now.getTime() + 18 * 60 * 60 * 1000),
    maxQtyPerCustomer: 1,
    isActive: true,
    products: createdProducts.map((p) => ({
      product: p._id,
      originalKes: p.priceKes,
      flashKes: Math.round(p.priceKes * 0.5),
      remainingQty: 5,
    })),
  });

  await Setting.insertMany([
    { key: "currency", value: "KES" },
    { key: "country", value: "KE" },
    { key: "supportPhone", value: "+254700000000" },
    { key: "pointsKesPerPoint", value: "10" },
  ]);

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

  const orderSeed = [
    {
      n: "TAJIRA-2026-1001",
      user: brian,
      items: linesFrom([["NET-AX55", 1], ["CCTV-HK2143", 1]]),
      status: "PROCESSING",
      paymentMethod: "MPESA",
      paymentStatus: "COMPLETED",
      ref: "QKBRIAN01",
      at: "2026-07-12T08:00:00.000Z",
      city: "Nairobi",
      street: "Ngong Road, Building 14",
      phone: brian.phone,
    },
    {
      n: "TAJIRA-2026-1002",
      user: faith,
      items: linesFrom([["AC-F18", 1]]),
      status: "PENDING_PAYMENT",
      paymentMethod: "MPESA",
      paymentStatus: "PENDING",
      ref: "QKFAITH01",
      at: "2026-07-20T15:10:00.000Z",
      city: "Roysambu",
      street: "Thika Road, Garden City",
      phone: faith.phone,
    },
    {
      n: "TAJIRA-2026-1003",
      user: amina,
      items: linesFrom([["CCTV-HK2143", 2]]),
      status: "DELIVERED",
      paymentMethod: "PESAPAL",
      paymentStatus: "COMPLETED",
      ref: "PSLAMINA01",
      at: "2026-08-02T10:00:00.000Z",
      city: "South B",
      street: "Ole Shapara Avenue, House 12",
      phone: amina.phone,
    },
  ];

  for (const row of orderSeed) {
    const items = row.items;
    const m = money(items, 300);
    await Order.create({
      orderNumber: row.n,
      user: row.user._id,
      address: {
        label: "Home",
        county: "Nairobi",
        city: row.city,
        street: row.street,
        phone: row.phone,
      },
      items,
      subtotalKes: m.subtotalKes,
      deliveryKes: m.deliveryKes,
      discountKes: 0,
      vatKes: m.vatKes,
      totalKes: m.totalKes,
      status: row.status,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      deliveryMethod: "STANDARD",
      paidAt: row.paymentStatus === "COMPLETED" ? new Date(row.at) : null,
      createdAt: new Date(row.at),
      payments: [
        {
          provider: row.paymentMethod,
          reference: row.ref,
          amountKes: m.totalKes,
          phone: row.phone,
          status: row.paymentStatus,
          createdAt: new Date(row.at),
        },
      ],
    });
  }

  await Competition.insertMany([
    {
      code: "COMP-001",
      title: "Flash Tech Quiz",
      shortDescription: "Answer networking questions and win points.",
      description: "A short TAJIRA quiz on networking and CCTV basics.",
      type: "quiz",
      category: "Technology",
      status: "active",
      startsAt: new Date("2026-08-01T07:00:00.000Z"),
      endsAt: new Date("2026-09-30T20:59:00.000Z"),
      prize: "TP-Link Router + 1,000 Points",
      pointsToWin: 1000,
      participantCount: 3,
      winnerCount: 0,
      pointsAwarded: 120,
      imageUrl: img("photo-1558494949-ef010cbdcc31", 301),
      createdBy: "Admin",
      isActive: true,
      prizes: [{ name: "TP-Link Router + 1,000 Points", points: 1000, winners: 1 }],
      estimatedReach: 50,
    },
    {
      code: "COMP-002",
      title: "Referral Sprint",
      shortDescription: "Invite friends and climb the board.",
      description: "Earn entries when friends create TAJIRA accounts with your code.",
      type: "referral",
      category: "Promotions",
      status: "upcoming",
      startsAt: new Date("2026-10-01T07:00:00.000Z"),
      endsAt: new Date("2026-10-31T20:59:00.000Z"),
      prize: "KSh 5,000 Voucher",
      pointsToWin: 500,
      participantCount: 0,
      winnerCount: 0,
      pointsAwarded: 0,
      imageUrl: img("photo-1556742049-0cfed4f6a45d", 302),
      createdBy: "Admin",
      isActive: true,
      prizes: [{ name: "KSh 5,000 Voucher", points: 500, winners: 1 }],
      estimatedReach: 40,
    },
  ]);

  console.log("Seeded Tajira Kenya into MongoDB");
  console.log("Admin:     admin@tajira.co.ke / Admin@123");
  console.log("Customer:  0712345678 / Customer@123");
  console.log(`Products:  ${createdProducts.length}`);
  console.log("Customers: 3 · Orders: 3 · Competitions: 2");
}

async function seedAdminOnly() {
  const existing = await User.findOne({ role: { $in: ["SUPER_ADMIN", "ADMIN"] } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const user = await User.create({
    firstName: "Francis",
    lastName: "Admin",
    email: normalizeEmail("admin@tajira.co.ke"),
    phone: normalizePhone("0700000000"),
    passwordHash,
    role: "SUPER_ADMIN",
    referralCode: "TAJIRAADMIN",
    profileCompleted: true,
    membershipLevel: "PLATINUM",
    isActive: true,
  });
  await Cart.create({ user: user._id, items: [] });

  const rules = await PointsRule.countDocuments();
  if (rules === 0) {
    await PointsRule.insertMany([
      {
        key: "PURCHASE",
        name: "Purchase Points",
        points: 1,
        ruleType: "purchase",
        trigger: "amount_spent",
        conditionValue: "100",
        limit: "none",
        priority: 1,
        isActive: true,
        description: "1 TAJIRA Point for every KSh 100 spent.",
        configJson: JSON.stringify({ kesPerPoint: 100 }),
      },
      {
        key: "WELCOME",
        name: "Welcome Bonus",
        points: 50,
        ruleType: "special",
        trigger: "signup",
        limit: "once",
        priority: 2,
        isActive: true,
        description: "Welcome points for new customer accounts.",
      },
    ]);
  }

  const settings = await Setting.countDocuments();
  if (settings === 0) {
    await Setting.insertMany([
      { key: "currency", value: "KES" },
      { key: "country", value: "KE" },
      { key: "supportPhone", value: "+254700000000" },
      { key: "pointsKesPerPoint", value: "10" },
    ]);
  }

  return user;
}

module.exports = { seed, seedAdminOnly };

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
