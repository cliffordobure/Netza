const { User } = require("../models");
const { sendSms, configured } = require("../lib/beem");
const { normalizePhone } = require("../lib/phone");
const config = require("../config");

function kes(n) {
  return `KES ${new Intl.NumberFormat("en-KE").format(Number(n) || 0)}`;
}

function itemCount(order) {
  return (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
}

function customerName(order, user) {
  const first = user?.firstName || "";
  const last = user?.lastName || "";
  return `${first} ${last}`.trim() || "Customer";
}

function customerPhone(order, user) {
  return normalizePhone(order.address?.phone || user?.phone || order.payments?.[0]?.phone);
}

async function loadUser(order) {
  if (order.user && typeof order.user === "object" && order.user.phone) return order.user;
  const id = order.user?._id || order.user;
  if (!id) return null;
  return User.findById(id).select("firstName lastName phone email").lean();
}

function customerMessage(event, order, supportPhone = "") {
  const num = order.orderNumber;
  const amt = kes(order.totalKes);
  const help = supportPhone || "support";
  switch (event) {
    case "placed":
      return `Tajira: Order ${num} received. Total ${amt}. Complete payment to confirm. We will SMS you every update.`;
    case "paid":
      return `Tajira: Payment received for ${num} (${amt}). We are preparing your order.`;
    case "payment_failed":
      return `Tajira: Payment for ${num} did not go through. Open the Tajira app to try again.`;
    case "processing":
      return `Tajira: ${num} is being packed. We will SMS you when it ships.`;
    case "shipped":
      return `Tajira: ${num} has been shipped. Expect delivery updates by SMS.`;
    case "delivered":
      return `Tajira: ${num} has been delivered. Asante for shopping Tajira Kenya.`;
    case "cancelled":
      return `Tajira: ${num} was cancelled. Call ${help} if this is unexpected.`;
    default:
      return `Tajira: Update on ${num}. Status: ${event}.`;
  }
}

function staffMessage(event, order, user) {
  const num = order.orderNumber;
  const amt = kes(order.totalKes);
  const name = customerName(order, user);
  const phone = customerPhone(order, user) || "no-phone";
  const n = itemCount(order);
  switch (event) {
    case "placed":
      return `Tajira sales: NEW order ${num} from ${name} ${phone}. ${n} item(s), ${amt}. Awaiting payment.`;
    case "paid":
      return `Tajira sales: ${num} PAID ${amt}. ${name} ${phone}. Prepare dispatch.`;
    case "payment_failed":
      return `Tajira sales: ${num} payment FAILED. ${name} ${phone}. ${amt}.`;
    case "processing":
      return `Tajira sales: ${num} marked processing. ${name} ${phone}.`;
    case "shipped":
      return `Tajira sales: ${num} SHIPPED. ${name} ${phone}.`;
    case "delivered":
      return `Tajira sales: ${num} DELIVERED. ${name} ${phone}. ${amt}.`;
    case "cancelled":
      return `Tajira sales: ${num} CANCELLED. ${name} ${phone}.`;
    default:
      return `Tajira sales: ${num} ${event}. ${name} ${phone}.`;
  }
}

async function notifyOrderEvent(order, event) {
  if (!configured() || !order || !event) return { skipped: true };
  try {
    const { getSmsRecipients } = require("../modules/admin/support-settings");
    const rec = await getSmsRecipients();
    const user = await loadUser(order);
    const customer = customerPhone(order, user);
    const staff = event === "processing" || event === "shipped"
      ? [...new Set([...rec.sales, ...rec.admin])]
      : [...new Set([...rec.admin, ...rec.sales])];
    const support = rec.support || config.beem.supportPhone;
    const results = [];
    if (customer) {
      results.push(await sendSms({ to: customer, message: customerMessage(event, order, support) }));
    }
    if (staff.length) {
      results.push(await sendSms({ to: staff, message: staffMessage(event, order, user) }));
    }
    return { skipped: false, event, results };
  } catch (err) {
    console.warn(`SMS ${event} ${order.orderNumber || order.id}: ${err.message}`);
    return { skipped: true, error: err.message };
  }
}

function notifyOrderEventSafe(order, event) {
  notifyOrderEvent(order, event).catch((err) => {
    console.warn(`SMS ${event}: ${err.message}`);
  });
}

function eventFromOrderStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "paid";
  if (s === "PROCESSING") return "processing";
  if (s === "SHIPPED") return "shipped";
  if (s === "DELIVERED") return "delivered";
  if (s === "CANCELLED") return "cancelled";
  if (s === "PENDING_PAYMENT") return "placed";
  return null;
}

module.exports = {
  notifyOrderEvent,
  notifyOrderEventSafe,
  eventFromOrderStatus,
};
