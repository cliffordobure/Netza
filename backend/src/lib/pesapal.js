const config = require("../config");

let cachedToken = null;
let tokenExpiresAt = 0;
let cachedIpnId = config.pesapal.ipnId || null;

function baseUrl() {
  return config.pesapal.env === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";
}

function configured() {
  return Boolean(config.pesapal.consumerKey && config.pesapal.consumerSecret);
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

function pesapalOrderId(order) {
  const raw = String(order.orderNumber || order.id || "").replace(/[^a-zA-Z0-9:._-]/g, "-");
  return raw.slice(0, 50) || `NZ-${Date.now()}`;
}

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${baseUrl()}/api/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    const msg = data.message || data.error?.message || `Pesapal request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

async function getToken() {
  if (!configured()) throw new Error("Pesapal is not configured. Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.");
  if (cachedToken && Date.now() < tokenExpiresAt - 15000) return cachedToken;

  const data = await api("Auth/RequestToken", {
    method: "POST",
    body: {
      consumer_key: config.pesapal.consumerKey,
      consumer_secret: config.pesapal.consumerSecret,
    },
  });
  cachedToken = data.token;
  tokenExpiresAt = data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 4 * 60 * 1000;
  if (!cachedToken) throw new Error(data.message || "Could not obtain Pesapal access token");
  return cachedToken;
}

async function ensureIpnId(token) {
  if (cachedIpnId) return cachedIpnId;
  const ipnUrl = `${config.publicBaseUrl}/api/v1/payments/pesapal/ipn`;
  const data = await api("URLSetup/RegisterIPN", {
    method: "POST",
    token,
    body: {
      url: ipnUrl,
      ipn_notification_type: "GET",
    },
  });
  cachedIpnId = data.ipn_id || data.ipnId;
  if (!cachedIpnId) throw new Error(data.message || "Could not register Pesapal IPN URL");
  return cachedIpnId;
}

async function submitOrder(order, user, { channel = "MPESA" } = {}) {
  const token = await getToken();
  const notificationId = await ensureIpnId(token);
  const addr = order.address || {};
  const phone = normalizePhone(addr.phone || user.phone);
  const email = user.email || `customer+${order.orderNumber}@netza.co.ke`;
  const callbackUrl = `${config.publicBaseUrl}/api/v1/payments/pesapal/return?orderId=${order.id}`;

  const payload = {
    id: pesapalOrderId(order),
    currency: "KES",
    amount: Number(order.totalKes),
    description: `NETZA order ${order.orderNumber}`.slice(0, 100),
    callback_url: callbackUrl,
    notification_id: notificationId,
    redirect_mode: "TOP_WINDOW",
    billing_address: {
      email_address: email,
      phone_number: phone || "254700000000",
      country_code: "KE",
      first_name: user.firstName || "NETZA",
      middle_name: "",
      last_name: user.lastName || "Customer",
      line_1: addr.street || "Nairobi",
      line_2: "",
      city: addr.city || addr.county || "Nairobi",
      state: addr.county || "Nairobi",
      postal_code: "",
      zip_code: "",
    },
  };

  const data = await api("Transactions/SubmitOrderRequest", {
    method: "POST",
    token,
    body: payload,
  });

  if (!data.redirect_url) {
    throw new Error(data.message || "Pesapal did not return a payment URL");
  }

  return {
    redirectUrl: data.redirect_url,
    orderTrackingId: data.order_tracking_id,
    merchantReference: payload.id,
    channel,
    raw: data,
  };
}

async function getTransactionStatus(orderTrackingId) {
  const token = await getToken();
  return api(`Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, { token });
}

function isPaidStatus(status) {
  const code = Number(status?.status_code ?? status?.payment_status_code);
  const desc = String(status?.payment_status_description || status?.message || "").toUpperCase();
  return code === 1 || desc.includes("COMPLETED") || desc.includes("SUCCESS");
}

function isFailedStatus(status) {
  const code = Number(status?.status_code ?? status?.payment_status_code);
  const desc = String(status?.payment_status_description || status?.message || "").toUpperCase();
  return code === 2 || (code === 0 && desc.includes("FAILED")) || desc.includes("INVALID");
}

module.exports = {
  configured,
  submitOrder,
  getTransactionStatus,
  isPaidStatus,
  isFailedStatus,
  normalizePhone,
};
