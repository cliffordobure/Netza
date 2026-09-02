const { Router } = require("express");
const { z } = require("zod");
const { Product, Cart, Address, idOf } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { activeFlashMap, decorateProduct } = require("../../services/pricing.service");
const { pointsFromPurchase } = require("../../services/points.service");
const { quoteDelivery } = require("../../lib/delivery");

const router = Router();
router.use(auth());

function productKey(product) {
  if (!product) return "";
  if (typeof product === "string") return product;
  if (product._id) return String(product._id);
  if (product.id != null && typeof product.id !== "function") return String(product.id);
  return String(product);
}

function findCartItem(cart, productId) {
  const want = String(productId || "");
  return cart.items.find((item) => productKey(item.product) === want);
}

function mergeDuplicateItems(cart) {
  const first = new Map();
  const extras = [];
  for (const item of cart.items) {
    const key = productKey(item.product);
    if (!key) continue;
    const seen = first.get(key);
    if (seen) {
      seen.quantity = (Number(seen.quantity) || 0) + (Number(item.quantity) || 0);
      extras.push(item);
    } else {
      first.set(key, item);
    }
  }
  for (const item of extras) {
    if (typeof item.deleteOne === "function") item.deleteOne();
  }
  return extras.length > 0;
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    populate: [{ path: "brand" }, { path: "category" }],
  });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  if (mergeDuplicateItems(cart)) await cart.save();
  return cart;
}

async function serializeCart(cart) {
  const flash = await activeFlashMap(cart.items.map((i) => idOf(i.product)));
  const items = [];
  let subtotal = 0;
  for (const item of cart.items) {
    if (!item.product) continue;
    const product = decorateProduct(item.product, flash.get(idOf(item.product)));
    const line = product.priceKes * item.quantity;
    subtotal += line;
    items.push({
      id: item.id,
      quantity: item.quantity,
      unitPriceKes: product.priceKes,
      lineTotalKes: line,
      product,
    });
  }
  const address = cart.user
    ? (await Address.findOne({ user: cart.user, isDefault: true })) || (await Address.findOne({ user: cart.user }))
    : null;
  const [standard, express] = await Promise.all([
    quoteDelivery({ address: address || {}, method: "STANDARD", subtotalKes: subtotal }),
    quoteDelivery({ address: address || {}, method: "EXPRESS", subtotalKes: subtotal }),
  ]);
  return {
    id: cart.id,
    items,
    subtotalKes: subtotal,
    pointsEstimate: await pointsFromPurchase(subtotal),
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    deliveryKes: standard.deliveryKes,
    expressDeliveryKes: express.deliveryKes,
    deliveryZone: standard.zoneName,
    shipping: {
      standardKes: standard.deliveryKes,
      expressKes: express.deliveryKes,
      zoneName: standard.zoneName,
      eta: standard.eta,
    },
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ cart: await serializeCart(await getOrCreateCart(req.user._id)) });
  })
);

router.post(
  "/items",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        productId: z.string(),
        quantity: z.number().int().min(1).default(1),
        replace: z.boolean().optional(),
      })
      .parse(req.body);
    const product = await Product.findById(body.productId);
    if (!product || !product.isActive) throw httpError(404, "Product not found");
    const cart = await getOrCreateCart(req.user._id);
    const existing = findCartItem(cart, body.productId);
    const nextQty = existing
      ? (body.replace ? body.quantity : Number(existing.quantity || 0) + body.quantity)
      : body.quantity;
    if (product.stock < nextQty) throw httpError(400, "Insufficient stock");
    if (existing) existing.quantity = nextQty;
    else cart.items.push({ product: body.productId, quantity: body.quantity });
    await cart.save();
    res.status(201).json({ cart: await serializeCart(await getOrCreateCart(req.user._id)) });
  })
);

router.patch(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const body = z.object({ quantity: z.number().int().min(0) }).parse(req.body);
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(req.params.id);
    if (!item) throw httpError(404, "Cart item not found");
    if (body.quantity === 0) item.deleteOne();
    else {
      if (item.product.stock < body.quantity) throw httpError(400, "Insufficient stock");
      item.quantity = body.quantity;
    }
    await cart.save();
    res.json({ cart: await serializeCart(await getOrCreateCart(req.user._id)) });
  })
);

router.delete(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(req.params.id);
    if (item) item.deleteOne();
    await cart.save();
    res.json({ cart: await serializeCart(await getOrCreateCart(req.user._id)) });
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    res.json({ cart: await serializeCart(cart) });
  })
);

module.exports = router;
