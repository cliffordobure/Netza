const { Router } = require("express");
const { z } = require("zod");
const { Order, Product, Cart, FlashDrop } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { awardPurchasePoints } = require("../../services/points.service");
const { randomCode } = require("../../lib/utils");

const router = Router();

async function markPaid(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw httpError(404, "Order not found");
  if (order.paymentStatus === "COMPLETED") return order;

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product || product.stock < item.quantity) {
      throw httpError(400, `Insufficient stock for ${item.name}`);
    }
    product.stock -= item.quantity;
    await product.save();
    if (item.wasFlashDrop) {
      await FlashDrop.updateOne(
        { "products.product": item.product, "products.remainingQty": { $gt: 0 } },
        { $inc: { "products.$.remainingQty": -item.quantity } }
      );
    }
  }

  order.payments.forEach((p) => {
    p.status = "COMPLETED";
  });
  await Cart.updateOne({ user: order.user }, { $set: { items: [] } });
  order.status = "PAID";
  order.paymentStatus = "COMPLETED";
  order.paidAt = new Date();
  await order.save();

  const points = await awardPurchasePoints(order.user, order);
  order.pointsEarned = points;
  await order.save();
  return order;
}

router.post(
  "/mpesa/stk",
  auth(),
  asyncHandler(async (req, res) => {
    const body = z.object({ orderId: z.string(), phone: z.string().optional() }).parse(req.body);
    const order = await Order.findOne({ _id: body.orderId, user: req.user._id });
    if (!order) throw httpError(404, "Order not found");
    if (order.paymentMethod !== "MPESA") throw httpError(400, "Order is not an M-Pesa checkout");
    const checkoutRequestId = randomCode("STK");
    if (order.payments[0]) {
      order.payments[0].phone = body.phone || req.user.phone;
      order.payments[0].rawPayload = JSON.stringify({ checkoutRequestId, simulated: true });
      order.payments[0].status = "PENDING";
    }
    await order.save();
    res.json({
      message: "STK push initiated (sandbox/simulated). Confirm with /payments/mpesa/simulate in development.",
      checkoutRequestId,
      orderId: order.id,
      amountKes: order.totalKes,
    });
  })
);

router.post(
  "/mpesa/simulate",
  auth(),
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      throw httpError(403, "Simulation is disabled in production");
    }
    const body = z.object({ orderId: z.string() }).parse(req.body);
    const order = await Order.findOne({ _id: body.orderId, user: req.user._id });
    if (!order) throw httpError(404, "Order not found");
    const paid = await markPaid(order.id);
    res.json({ message: "Payment simulated and verified server-side", order: paid });
  })
);

router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const reference = req.body.reference || req.body.CheckoutRequestID;
    if (!reference) throw httpError(400, "Missing payment reference");
    const order = await Order.findOne({
      $or: [
        { "payments.reference": reference },
        { "payments.rawPayload": new RegExp(reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) },
      ],
    });
    if (!order) throw httpError(404, "Payment not found");
    const resultCode = Number(req.body.ResultCode ?? req.body.resultCode ?? 0);
    if (resultCode === 0) {
      const paid = await markPaid(order.id);
      return res.json({ ok: true, orderId: paid.id });
    }
    order.payments.forEach((p) => {
      p.status = "FAILED";
      p.rawPayload = JSON.stringify(req.body);
    });
    order.paymentStatus = "FAILED";
    await order.save();
    res.json({ ok: true, status: "FAILED" });
  })
);

module.exports = { router, markPaid };
