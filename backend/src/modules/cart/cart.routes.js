const { Router } = require("express");
const { z } = require("zod");
const { Product, Cart, idOf } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { activeFlashMap, decorateProduct } = require("../../services/pricing.service");
const { pointsFromPurchase } = require("../../services/points.service");

const router = Router();
router.use(auth());

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    populate: [{ path: "brand" }, { path: "category" }],
  });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
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
  return {
    id: cart.id,
    items,
    subtotalKes: subtotal,
    pointsEstimate: await pointsFromPurchase(subtotal),
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
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
      .object({ productId: z.string(), quantity: z.number().int().min(1).default(1) })
      .parse(req.body);
    const product = await Product.findById(body.productId);
    if (!product || !product.isActive) throw httpError(404, "Product not found");
    if (product.stock < body.quantity) throw httpError(400, "Insufficient stock");
    const cart = await getOrCreateCart(req.user._id);
    const existing = cart.items.find((i) => idOf(i.product) === body.productId);
    if (existing) existing.quantity += body.quantity;
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
