const { Router } = require("express");
const { z } = require("zod");
const { Order, Product, Cart, FlashDrop, User } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { awardPurchasePoints } = require("../../services/points.service");
const { randomCode } = require("../../lib/utils");
const config = require("../../config");
const pesapal = require("../../lib/pesapal");
const { notifyOrderEventSafe } = require("../../services/sms.service");

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
  notifyOrderEventSafe(order, "paid");
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
    let result;
    try {
      result = await pesapal.submitOrder(order, user, {
        channel: body.channel,
        publicBase: pesapal.resolvePublicBase(req),
      });
    } catch (err) {
      throw httpError(err.status || 502, err.message || "Could not start Pesapal checkout");
    }
    const pay = order.payments[0];
    const payload = {
      channel: body.channel,
      orderTrackingId: result.orderTrackingId,
      merchantReference: result.merchantReference,
    };
    if (pay) {
      pay.reference = result.orderTrackingId || pay.reference;
      pay.rawPayload = JSON.stringify(payload);
      pay.status = "PENDING";
    } else {
      order.payments.push({
        provider: "PESAPAL",
        reference: result.orderTrackingId || randomCode("PAY"),
        amountKes: order.totalKes,
        status: "PENDING",
        rawPayload: JSON.stringify(payload),
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
          notifyOrderEventSafe(order, "payment_failed");
        }
        return res.json({ order, pesapalStatus: status });
      } catch {
        // fall through with current order state
      }
    }

    res.json({ order });
  })
);

function escapeRe(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeToken(value) {
  return String(value || "").replace(/[^a-zA-Z0-9:_-]/g, "");
}

function paymentReturnPage({ heading, copy, orderId, trackingId, poll }) {
  const id = safeToken(orderId);
  const track = safeToken(trackingId);
  const deepLink = id ? `tajira://open/order/${id}` : "tajira://open/";
  const intentLink = id
    ? `intent://open/order/${id}#Intent;scheme=tajira;package=ke.tajira.tajira_mobile;end`
    : "intent://open/#Intent;scheme=tajira;package=ke.tajira.tajira_mobile;end";
  const pollPath = poll && id && track
    ? `/api/v1/payments/pesapal/return-poll?orderId=${encodeURIComponent(id)}&OrderTrackingId=${encodeURIComponent(track)}`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payment · Tajira Kenya</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f7f8fa;color:#0b1f3a;display:grid;place-items:center;min-height:100vh;padding:24px}
  .card{max-width:420px;background:#fff;border-radius:16px;padding:28px;text-align:center;box-shadow:0 2px 12px #0001}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#64748b;line-height:1.5}
  a,button{display:inline-block;margin-top:18px;background:#ff7a00;color:#fff;text-decoration:none;border:0;border-radius:10px;padding:12px 18px;font-weight:700;font-size:14px;cursor:pointer}
</style></head><body>
<div class="card">
  <h1 id="heading">${escapeHtml(heading)}</h1>
  <p id="copy">${escapeHtml(copy)}</p>
  <a id="open" href="${deepLink}">Open Tajira app</a>
</div>
<script>
(function () {
  var deep = ${JSON.stringify(deepLink)};
  var intent = ${JSON.stringify(intentLink)};
  var poll = ${JSON.stringify(pollPath)};
  function openApp() {
    var android = /android/i.test(navigator.userAgent);
    window.location.href = android ? intent : deep;
  }
  document.getElementById("open").addEventListener("click", function (e) {
    if (/android/i.test(navigator.userAgent)) {
      e.preventDefault();
      openApp();
    }
  });
  if (!poll) {
    setTimeout(openApp, 600);
    return;
  }
  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    fetch(poll, { credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.done) {
          if (tries >= 45) {
            clearInterval(timer);
            document.getElementById("heading").textContent = "Still confirming";
            document.getElementById("copy").textContent = "Return to the app. It will update when Pesapal finishes.";
            openApp();
          }
          return;
        }
        clearInterval(timer);
        document.getElementById("heading").textContent = data.paymentStatus === "COMPLETED" ? "Payment received" : "Payment did not complete";
        document.getElementById("copy").textContent = "Returning you to the Tajira app…";
        openApp();
      })
      .catch(function () {
        if (tries >= 45) {
          clearInterval(timer);
          openApp();
        }
      });
  }, 2000);
})();
</script>
</body></html>`;
}

async function findOrderForPesapal({ trackingId, merchantReference, orderId }) {
  const clauses = [];
  if (orderId && require("../../models").isOid(orderId)) clauses.push({ _id: orderId });
  if (trackingId) {
    clauses.push({ "payments.reference": String(trackingId) });
    clauses.push({ "payments.rawPayload": new RegExp(escapeRe(trackingId)) });
  }
  if (merchantReference) {
    clauses.push({ "payments.rawPayload": new RegExp(escapeRe(merchantReference)) });
    const orderNumber = String(merchantReference).split("-")[0];
    if (orderNumber) clauses.push({ orderNumber });
  }
  if (!clauses.length) return null;
  return Order.findOne({ $or: clauses });
}

async function applyPesapalStatus(order, trackingId) {
  if (!order || !trackingId || order.paymentStatus === "COMPLETED") {
    return { order, pesapalStatus: null };
  }
  const status = await pesapal.getTransactionStatus(String(trackingId));
  if (pesapal.isPaidStatus(status)) {
    return { order: await markPaid(order.id), pesapalStatus: status };
  }
  if (pesapal.isFailedStatus(status)) {
    order.paymentStatus = "FAILED";
    if (order.payments[0]) {
      order.payments[0].status = "FAILED";
      order.payments[0].rawPayload = JSON.stringify({
        ...(() => {
          try { return JSON.parse(order.payments[0].rawPayload || "{}"); } catch { return {}; }
        })(),
        pesapalStatus: status,
      });
    }
    await order.save();
    notifyOrderEventSafe(order, "payment_failed");
  }
  return { order, pesapalStatus: status };
}

function ipnAck(req, extra = {}) {
  const trackingId = req.query.OrderTrackingId || req.query.orderTrackingId || req.body?.OrderTrackingId;
  const merchantReference = req.query.OrderMerchantReference || req.body?.OrderMerchantReference;
  return {
    orderNotificationType: req.query.OrderNotificationType || req.body?.OrderNotificationType || "IPNCHANGE",
    orderTrackingId: trackingId || "",
    orderMerchantReference: merchantReference || "",
    status: 200,
    ...extra,
  };
}

async function handleIpn(req, res) {
  const trackingId = req.query.OrderTrackingId || req.query.orderTrackingId || req.body?.OrderTrackingId;
  const merchantReference = req.query.OrderMerchantReference || req.body?.OrderMerchantReference;
  if (!trackingId) throw httpError(400, "Missing OrderTrackingId");

  const order = await findOrderForPesapal({ trackingId, merchantReference });
  if (!order) {
    return res.status(200).json(ipnAck(req, { ok: true, message: "Order not found locally" }));
  }
  await applyPesapalStatus(order, trackingId);
  return res.status(200).json(ipnAck(req, { ok: true }));
}

router.get("/pesapal/ipn", asyncHandler(handleIpn));
router.post("/pesapal/ipn", asyncHandler(handleIpn));

router.get(
  "/pesapal/return-poll",
  asyncHandler(async (req, res) => {
    const orderId = req.query.orderId;
    const trackingId = req.query.OrderTrackingId || req.query.orderTrackingId;
    if (!orderId || !trackingId) throw httpError(400, "Missing payment reference");
    const order = await findOrderForPesapal({ trackingId, orderId });
    if (!order) return res.json({ paymentStatus: "UNKNOWN", done: false });
    const { order: next } = await applyPesapalStatus(order, trackingId);
    const status = next?.paymentStatus || "PENDING";
    res.json({
      paymentStatus: status,
      done: status === "COMPLETED" || status === "FAILED",
      orderId: next?.id || order.id,
    });
  })
);

router.get(
  "/pesapal/return",
  asyncHandler(async (req, res) => {
    const orderId = req.query.orderId;
    const trackingId = req.query.OrderTrackingId || req.query.orderTrackingId;
    const merchantReference = req.query.OrderMerchantReference;
    const cancelled = String(req.query.cancelled || "") === "1";
    let heading = "Payment not completed";
    let copy = "No payment was confirmed. Returning you to the Tajira app.";
    let resolvedOrderId = orderId;
    let poll = false;
    try {
      const order = await findOrderForPesapal({ trackingId, merchantReference, orderId });
      if (order) resolvedOrderId = order.id;
      if (cancelled) {
        heading = "Payment cancelled";
        copy = "No payment was taken. Returning you to the Tajira app.";
      } else if (order && trackingId) {
        const { order: next, pesapalStatus } = await applyPesapalStatus(order, trackingId);
        if (next) resolvedOrderId = next.id;
        if (next?.paymentStatus === "COMPLETED") {
          heading = "Payment received";
          copy = "Returning you to the Tajira app to track your order.";
        } else if (next?.paymentStatus === "FAILED") {
          heading = "Payment did not complete";
          copy = "No charge was confirmed. Returning you to the app.";
        } else if (pesapal.isPendingStatus(pesapalStatus)) {
          heading = "Payment is processing";
          copy = "Confirming with Pesapal. We will open the Tajira app as soon as it clears.";
          poll = true;
        } else {
          heading = "Payment not completed";
          copy = "You left checkout before paying. Returning you to the app.";
        }
      }
    } catch {
      heading = "Payment not completed";
      copy = "Returning you to the Tajira app.";
    }
    res.type("html").send(paymentReturnPage({
      heading,
      copy,
      orderId: resolvedOrderId,
      trackingId,
      poll,
    }));
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
    notifyOrderEventSafe(order, "payment_failed");
    res.json({ ok: true, status: "FAILED" });
  })
);

module.exports = { router, markPaid };
