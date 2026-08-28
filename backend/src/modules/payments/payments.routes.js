const { Router } = require("express");
const { z } = require("zod");
const { Order, Product, Cart, FlashDrop, User } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { awardPurchasePoints } = require("../../services/points.service");
const { randomCode } = require("../../lib/utils");
const config = require("../../config");
const pesapal = require("../../lib/pesapal");

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
  "/pesapal/initiate",
  auth(),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        orderId: z.string(),
        channel: z.enum(["MPESA", "AIRTEL", "CARD"]).optional().default("MPESA"),
      })
      .parse(req.body);

    const order = await Order.findOne({ _id: body.orderId, user: req.user._id });
    if (!order) throw httpError(404, "Order not found");
    if (order.paymentStatus === "COMPLETED") {
      return res.json({ message: "Order already paid", orderId: order.id, paid: true });
    }
    if (order.paymentMethod !== "PESAPAL") throw httpError(400, "Order is not a Pesapal checkout");

    if (!pesapal.configured()) {
      if (config.env !== "production") {
        return res.json({
          message: "Pesapal credentials not set. Use /payments/pesapal/simulate in development.",
          orderId: order.id,
          configured: false,
        });
      }
      throw httpError(503, "Pesapal payments are not configured on the server");
    }

    const user = await User.findById(req.user._id);
    const result = await pesapal.submitOrder(order, user, { channel: body.channel });
    const pay = order.payments[0];
    if (pay) {
      pay.reference = result.orderTrackingId || pay.reference;
      pay.rawPayload = JSON.stringify({
        channel: body.channel,
        orderTrackingId: result.orderTrackingId,
        merchantReference: result.merchantReference,
      });
      pay.status = "PENDING";
    } else {
      order.payments.push({
        provider: "PESAPAL",
        reference: result.orderTrackingId || randomCode("PAY"),
        amountKes: order.totalKes,
        status: "PENDING",
        rawPayload: JSON.stringify({
          channel: body.channel,
          orderTrackingId: result.orderTrackingId,
          merchantReference: result.merchantReference,
        }),
      });
    }
    await order.save();

    res.json({
      redirectUrl: result.redirectUrl,
      orderTrackingId: result.orderTrackingId,
      orderId: order.id,
      channel: body.channel,
      configured: true,
    });
  })
);

router.get(
  "/pesapal/status/:orderId",
  auth(),
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) throw httpError(404, "Order not found");

    let trackingId = null;
    try {
      const meta = JSON.parse(order.payments?.[0]?.rawPayload || "{}");
      trackingId = meta.orderTrackingId || order.payments?.[0]?.reference;
    } catch {
      trackingId = order.payments?.[0]?.reference;
    }

    if (pesapal.configured() && trackingId && order.paymentStatus !== "COMPLETED") {
      try {
        const status = await pesapal.getTransactionStatus(trackingId);
        if (pesapal.isPaidStatus(status)) {
          await markPaid(order.id);
          const refreshed = await Order.findById(order.id);
          return res.json({ order: refreshed, pesapalStatus: status });
        }
        if (pesapal.isFailedStatus(status)) {
          order.paymentStatus = "FAILED";
          if (order.payments[0]) order.payments[0].status = "FAILED";
          await order.save();
        }
        return res.json({ order, pesapalStatus: status });
      } catch {
        // fall through with current order state
      }
    }

    res.json({ order });
  })
);

router.get(
  "/pesapal/ipn",
  asyncHandler(async (req, res) => {
    const trackingId = req.query.OrderTrackingId || req.query.orderTrackingId;
    if (!trackingId) throw httpError(400, "Missing OrderTrackingId");

    const order = await Order.findOne({
      $or: [{ "payments.reference": String(trackingId) }, { "payments.rawPayload": new RegExp(String(trackingId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }],
    });
    if (!order) {
      return res.status(200).json({ ok: true, message: "Order not found locally" });
    }

    if (order.paymentStatus !== "COMPLETED") {
      const status = await pesapal.getTransactionStatus(String(trackingId));
      if (pesapal.isPaidStatus(status)) {
        await markPaid(order.id);
      } else if (pesapal.isFailedStatus(status)) {
        order.paymentStatus = "FAILED";
        if (order.payments[0]) {
          order.payments[0].status = "FAILED";
          order.payments[0].rawPayload = JSON.stringify(status);
        }
        await order.save();
      }
    }

    res.status(200).json({ ok: true });
  })
);

router.get(
  "/pesapal/return",
  asyncHandler(async (req, res) => {
    const orderId = req.query.orderId;
    res.type("html").send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payment · NETZA</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f7f8fa;color:#0b1f3a;display:grid;place-items:center;min-height:100vh;padding:24px}
  .card{max-width:420px;background:#fff;border-radius:16px;padding:28px;text-align:center;box-shadow:0 2px 12px #0001}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#64748b;line-height:1.5}
</style></head><body>
<div class="card">
  <h1>Payment received</h1>
  <p>Thank you. You can close this page and return to the NETZA app to view your order status.</p>
  ${orderId ? `<p style="font-size:13px">Order reference saved.</p>` : ""}
</div></body></html>`);
  })
);

router.post(
  "/pesapal/simulate",
  auth(),
  asyncHandler(async (req, res) => {
    if (config.env === "production") throw httpError(403, "Simulation is disabled in production");
    const body = z.object({ orderId: z.string() }).parse(req.body);
    const order = await Order.findOne({ _id: body.orderId, user: req.user._id });
    if (!order) throw httpError(404, "Order not found");
    const paid = await markPaid(order.id);
    res.json({ message: "Pesapal payment simulated and verified server-side", order: paid });
  })
);

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
