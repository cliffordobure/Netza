const mongoose = require("mongoose");

function jsonId(schema, hide = []) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id ? String(ret._id) : ret.id;
      delete ret._id;
      for (const key of hide) delete ret[key];
      return ret;
    },
  });
  schema.set("toObject", { virtuals: true, versionKey: false });
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, default: "CUSTOMER" },
    membershipLevel: { type: String, default: "BRONZE" },
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    profileCompleted: { type: Boolean, default: false },
    lastLoginDate: String,
    loginStreak: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    pointsBalance: { type: Number, default: 0 },
    customerNumber: { type: String, unique: true, sparse: true },
    gender: { type: String, default: "" },
    dateOfBirth: Date,
    preferredPayment: { type: String, default: "MPESA" },
    adminNotes: { type: String, default: "" },
    blacklisted: { type: Boolean, default: false },
    avatarUrl: { type: String, default: "" },
    lastLoginAt: Date,
    segment: { type: String, default: "" },
    tags: [{ type: String }],
    notesLog: [
      {
        body: { type: String, default: "" },
        at: { type: Date, default: Date.now },
        author: { type: String, default: "Admin" },
      },
    ],
    sentMessages: [
      {
        body: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
jsonId(userSchema, ["passwordHash"]);


const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, unique: true, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now },
});
jsonId(refreshTokenSchema);

const addressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  label: { type: String, default: "Home" },
  county: String,
  city: String,
  street: String,
  phone: String,
  isDefault: { type: Boolean, default: false },
});
jsonId(addressSchema);

const categorySchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
  description: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});
jsonId(categorySchema);

const brandSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
jsonId(brandSchema);

const attributeGroupSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
  description: { type: String, default: "" },
  isGlobal: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});
jsonId(attributeGroupSchema);

const attributeSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "AttributeGroup" },
  type: { type: String, enum: ["select", "number", "text", "boolean"], default: "select" },
  displayType: { type: String, enum: ["dropdown", "radio", "checkbox", "swatch"], default: "dropdown" },
  values: [{ type: String }],
  isGlobal: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});
jsonId(attributeSchema);

const productSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    sku: { type: String, unique: true },
    barcode: { type: String, default: "" },
    description: String,
    shortDescription: { type: String, default: "" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subCategory: { type: String, default: "" },
    tags: [{ type: String }],
    priceKes: Number,
    compareAtKes: Number,
    stock: { type: Number, default: 0 },
    lowStockAt: { type: Number, default: 5 },
    warranty: { type: String, default: "12 months" },
    deliveryInfo: { type: String, default: "Nairobi 1-2 days • Nationwide 2-5 days" },
    visibility: { type: String, enum: ["all", "hidden"], default: "all" },
    isActive: { type: Boolean, default: true },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    specs: [{ name: String, value: String }],
    notes: { type: String, default: "" },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    images: [{ url: String, sortOrder: { type: Number, default: 0 } }],
  },
  { timestamps: true }
);
jsonId(productSchema);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
      },
    ],
  },
  { timestamps: true }
);
jsonId(cartSchema);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    address: {
      id: String,
      label: String,
      county: String,
      city: String,
      street: String,
      phone: String,
      postalCode: String,
    },
    status: { type: String, default: "PENDING_PAYMENT" },
    paymentMethod: String,
    paymentStatus: { type: String, default: "PENDING" },
    returnStatus: { type: String, default: "NONE" },
    subtotalKes: Number,
    deliveryKes: { type: Number, default: 0 },
    discountKes: { type: Number, default: 0 },
    vatKes: { type: Number, default: 0 },
    totalKes: Number,
    pointsEarned: { type: Number, default: 0 },
    installationRequested: { type: Boolean, default: false },
    installationNotes: { type: String, default: "" },
    customerNote: { type: String, default: "" },
    paidAt: Date,
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        sku: String,
        unitPriceKes: Number,
        quantity: Number,
        lineTotalKes: Number,
        wasFlashDrop: { type: Boolean, default: false },
      },
    ],
    payments: [
      {
        provider: String,
        reference: String,
        amountKes: Number,
        status: { type: String, default: "PENDING" },
        phone: String,
        rawPayload: { type: String, default: "{}" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
jsonId(orderSchema);

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    rating: Number,
    title: { type: String, default: "" },
    body: { type: String, default: "" },
  },
  { timestamps: true }
);
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
jsonId(reviewSchema);

const pointsTxnSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: String,
    points: Number,
    reference: { type: String, default: "" },
    description: String,
    status: { type: String, default: "COMPLETED" },
    expiresAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
jsonId(pointsTxnSchema);

const pointsRuleSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  name: String,
  points: Number,
  configJson: { type: String, default: "{}" },
  isActive: { type: Boolean, default: true },
  ruleType: { type: String, default: "engagement" },
  trigger: { type: String, default: "" },
  conditionValue: { type: String, default: "" },
  limit: { type: String, default: "none" },
  priority: { type: Number, default: 10 },
  description: { type: String, default: "" },
  category: { type: String, default: "" },
  stock: { type: Number, default: -1 },
  redeemedCount: { type: Number, default: 0 },
  imageUrl: { type: String, default: "" },
  startsAt: Date,
  endsAt: Date,
});
jsonId(pointsRuleSchema);

const flashDropSchema = new mongoose.Schema(
  {
    name: String,
    discountPercent: { type: Number, default: 50 },
    startsAt: Date,
    endsAt: Date,
    maxQtyPerCustomer: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        originalKes: Number,
        flashKes: Number,
        remainingQty: Number,
      },
    ],
  },
  { timestamps: true }
);
jsonId(flashDropSchema);

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String,
});
jsonId(settingSchema);

const competitionSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, default: "quiz" },
    category: { type: String, default: "General" },
    status: { type: String, default: "upcoming" },
    startsAt: Date,
    endsAt: Date,
    prize: { type: String, default: "" },
    pointsToWin: { type: Number, default: 0 },
    pointsNote: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    timezone: { type: String, default: "Africa/Nairobi" },
    visibility: { type: String, default: "public" },
    whoCanParticipate: { type: String, default: "all" },
    publishState: { type: String, default: "published" },
    estimatedReach: { type: Number, default: 0 },
    estimatedReachPct: { type: Number, default: 18.2 },
    prizes: [{ name: String, points: Number, winners: Number }],
    allowMultipleEntries: { type: Boolean, default: true },
    requireLogin: { type: Boolean, default: true },
    showLeaderboard: { type: Boolean, default: true },
    autoSelectWinners: { type: Boolean, default: true },
    winnersAnnounced: { type: String, default: "after_end" },
    resultsVisibility: { type: String, default: "public" },
    pointsAwardedType: { type: String, default: "instant" },
    detailsJson: { type: String, default: "{}" },
    overviewJson: { type: String, default: "{}" },
    totalEntries: { type: Number, default: 0 },
    completedEntries: { type: Number, default: 0 },
    prizePoolKes: { type: Number, default: 0 },
    progressPct: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 1 },
    pointsParticipation: { type: Number, default: 0 },
    pointsCorrect: { type: Number, default: 0 },
    participantCount: { type: Number, default: 0 },
    winnerCount: { type: Number, default: 0 },
    pointsAwarded: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    createdBy: { type: String, default: "Admin User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
jsonId(competitionSchema);

const quoteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyName: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    clientName: { type: String, default: "" },
    note: { type: String, default: "" },
    status: { type: String, enum: ["draft", "sent", "accepted"], default: "draft" },
    shareToken: { type: String, unique: true, sparse: true },
    items: [
      {
        kind: { type: String, enum: ["catalog", "custom"], default: "custom" },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
        name: { type: String, required: true },
        imageUrl: { type: String, default: "" },
        unitPriceKes: { type: Number, required: true },
        quantity: { type: Number, default: 1 },
      },
    ],
  },
  { timestamps: true }
);
jsonId(quoteSchema);

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    ctaLabel: { type: String, default: "Shop now" },
    link: { type: String, default: "/catalog" },
    imageUrl: { type: String, default: "" },
    placement: { type: String, default: "home", index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
  },
  { timestamps: true }
);
jsonId(bannerSchema);

const User = mongoose.model("User", userSchema);
const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
const Address = mongoose.model("Address", addressSchema);
const Category = mongoose.model("Category", categorySchema);
const Brand = mongoose.model("Brand", brandSchema);
const AttributeGroup = mongoose.model("AttributeGroup", attributeGroupSchema);
const Attribute = mongoose.model("Attribute", attributeSchema);
const Product = mongoose.model("Product", productSchema);
const Cart = mongoose.model("Cart", cartSchema);
const Order = mongoose.model("Order", orderSchema);
const Review = mongoose.model("Review", reviewSchema);
const PointsTransaction = mongoose.model("PointsTransaction", pointsTxnSchema);
const PointsRule = mongoose.model("PointsRule", pointsRuleSchema);
const FlashDrop = mongoose.model("FlashDrop", flashDropSchema);
const Setting = mongoose.model("Setting", settingSchema);
const Competition = mongoose.model("Competition", competitionSchema);
const Quote = mongoose.model("Quote", quoteSchema);
const Banner = mongoose.model("Banner", bannerSchema);

function isOid(id) {
  return mongoose.isValidObjectId(id);
}

function idOf(doc) {
  if (!doc) return null;
  if (typeof doc === "string") return doc;
  return doc.id || (doc._id ? String(doc._id) : null);
}

module.exports = {
  mongoose,
  User,
  RefreshToken,
  Address,
  Category,
  Brand,
  AttributeGroup,
  Attribute,
  Product,
  Cart,
  Order,
  Review,
  PointsTransaction,
  PointsRule,
  FlashDrop,
  Setting,
  Competition,
  Quote,
  Banner,
  isOid,
  idOf,
};
