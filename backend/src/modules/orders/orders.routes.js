const { Router } = require("express");
const { z } = require("zod");
const { Address, Cart, Order, idOf } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { randomCode } = require("../../lib/utils");
const { resolveUnitPrice } = require("../../services/pricing.service");
const { pointsFromPurchase } = require("../../services/points.service");
const { notifyOrderEventSafe } = require("../../services/sms.service");

const router = Router();
router.use(auth());

const STANDARD_DELIVERY = 150;
const EXPRESS_DELIVERY = 350;

async function serializeOrder(order) {
  const json = order.toJSON();
  json.userId = json.user?.id || json.user;
  return {
    ...json,
    pointsEstimate: json.pointsEarned || (await pointsFromPurchase(json.totalKes)),
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).populate("items.product");
    res.json({
      orders: orders.map((order) => {
        const json = typeof order.toJSON === "function" ? order.toJSON() : order;
        json.items = (json.items || []).map((item) => {
          const p = item.product;
          const images = (p?.images || [])
            .slice()
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((i) => i.url)
            .filter(Boolean);
          return {
            product: p ? { id: p.id || p._id, name: p.name } : item.product,
            name: item.name || p?.name,
            sku: item.sku,
            unitPriceKes: item.unitPriceKes,
            quantity: item.quantity,
            lineTotalKes: item.lineTotalKes,
            wasFlashDrop: item.wasFlashDrop,
            image: images[0] || null,
          };
        });
        return json;
      }),
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const q = { user: req.user._id, $or: [{ orderNumber: req.params.id }] };
    if (require("../../models").isOid(req.params.id)) q.$or.push({ _id: req.params.id });
    const order = await Order.findOne(q);
    if (!order) throw httpError(404, "Order not found");
    res.json({ order: await serializeOrder(order) });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        addressId: z.string(),
        paymentMethod: z.enum(["PESAPAL"]).default("PESAPAL"),
        pesapalChannel: z.enum(["MPESA", "AIRTEL", "CARD"]).optional().default("MPESA"),
        deliveryMethod: z.enum(["STANDARD", "EXPRESS"]).optional().default("STANDARD"),
        installationRequested: z.boolean().optional(),
        installationNotes: z.string().optional(),
        customerNote: z.string().optional(),
      })
      .parse(req.body);

    const address = await Address.findOne({ _id: body.addressId, user: req.user._id });
    if (!address) throw httpError(400, "Delivery address not found");

    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    if (!cart || cart.items.length === 0) throw httpError(400, "Cart is empty");

    const lines = [];
    let subtotal = 0;
    for (const item of cart.items) {
      const product = item.product;
      if (!product?.isActive) throw httpError(400, `${product?.name || "Item"} is unavailable`);
      if (product.stock < item.quantity) throw httpError(400, `Insufficient stock for ${product.name}`);
      const priced = await resolveUnitPrice(product);
      const lineTotal = priced.unitPriceKes * item.quantity;
      subtotal += lineTotal;
      lines.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        unitPriceKes: priced.unitPriceKes,
        quantity: item.quantity,
        lineTotalKes: lineTotal,
        wasFlashDrop: priced.wasFlashDrop,
      });
    }

    const deliveryKes = body.deliveryMethod === "EXPRESS" ? EXPRESS_DELIVERY : STANDARD_DELIVERY;
    const totalKes = subtotal + deliveryKes;
    const order = await Order.create({
      orderNumber: randomCode("NZ"),
      user: req.user._id,
      address: {
        id: address.id,
        label: address.label,
        county: address.county,
        city: address.city,
        street: address.street,
        phone: address.phone,
      },
      paymentMethod: "PESAPAL",
      subtotalKes: subtotal,
      deliveryKes,
      totalKes,
      installationRequested: Boolean(body.installationRequested),
      installationNotes: body.installationNotes || "",
      customerNote: body.customerNote || "",
      items: lines,
      payments: [
        {
          provider: "PESAPAL",
          reference: randomCode("PAY"),
          amountKes: totalKes,
          phone: req.user.phone,
          status: "PENDING",
          rawPayload: JSON.stringify({ channel: body.pesapalChannel }),
        },
      ],
    });

    notifyOrderEventSafe(
      { ...order.toJSON(), user: { firstName: req.user.firstName, lastName: req.user.lastName, phone: req.user.phone, email: req.user.email } },
      "placed"
    );

    res.status(201).json({
      order: await serializeOrder(order),
      paymentHint: "Complete payment on the secure Pesapal page (M-Pesa, Airtel Money, or card).",
    });
  })
);

module.exports = router;
