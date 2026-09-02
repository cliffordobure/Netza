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

function isLive() {
  return config.pesapal.env === "live";
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

function pesapalMerchantRef(order) {
  const attempt = Date.now().toString(36);
  const raw = `${order.orderNumber || "TJ"}-${attempt}`.replace(/[^a-zA-Z0-9:._-]/g, "-");
  return raw.slice(0, 50);
}

function pesapalErrorMessage(data, fallback) {
  return (
    data?.error?.message ||
    data?.error?.error_msg ||
    data?.message ||
    fallback
  );
}

function resolvePublicBase(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl;
  if (!req) return "";
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = req.get?.("host") || req.headers?.host;
  return host ? `${proto}://${host}`.replace(/\/+$/, "") : "";
}

function assertPublicBase(publicBase) {
  if (!publicBase) {
    throw new Error("Set PUBLIC_BASE_URL to your live API origin (https://your-api.onrender.com).");
  }
  if (isLive() && !/^https:\/\//i.test(publicBase)) {
    throw new Error("Pesapal live requires PUBLIC_BASE_URL to be https, not localhost.");
  }
  if (isLive() && /localhost|127\.0\.0\.1/i.test(publicBase)) {
    throw new Error("Pesapal live cannot reach localhost. Set PUBLIC_BASE_URL to the deployed API.");
  }
  return publicBase.replace(/\/+$/, "");
}

function statusSnapshot() {
  const publicBase = config.publicBaseUrl;
  return {
    configured: configured(),
    env: config.pesapal.env,
    ipnConfigured: Boolean(cachedIpnId || config.pesapal.ipnId),
    publicBaseUrl: publicBase || "",
    liveReady:
      configured() &&
      isLive() &&
      Boolean(publicBase) &&
      /^https:\/\//i.test(publicBase) &&
      !/localhost|127\.0\.0\.1/i.test(publicBase),
  };
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
  const pesapalStatus = Number(data.status || res.status);
  const hasError = Boolean(data.error && (data.error.message || data.error.code));
  if (!res.ok || hasError || (pesapalStatus && pesapalStatus >= 400)) {
    const msg = pesapalErrorMessage(data, `Pesapal request failed (${res.status})`);
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

async function getToken() {
  if (!configured()) {
    throw new Error("Pesapal is not configured. Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET from your live merchant account.");
  }
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
  if (!cachedToken) throw new Error(pesapalErrorMessage(data, "Could not obtain Pesapal access token"));
  return cachedToken;
}

async function listIpns(token) {
  try {
    const data = await api("URLSetup/GetIpnList", { token });
    return Array.isArray(data) ? data : data?.ipns || [];
  } catch {
    return [];
  }
}

async function ensureIpnId(token, publicBase) {
  if (cachedIpnId) return cachedIpnId;
  const ipnUrl = `${assertPublicBase(publicBase)}/api/v1/payments/pesapal/ipn`;
  const existing = await listIpns(token);
  const match = existing.find((row) => String(row.url || "").replace(/\/+$/, "") === ipnUrl.replace(/\/+$/, ""));
  if (match?.ipn_id || match?.ipnId) {
    cachedIpnId = match.ipn_id || match.ipnId;
    return cachedIpnId;
  }

  const data = await api("URLSetup/RegisterIPN", {
    method: "POST",
    token,
    body: {
      url: ipnUrl,
      ipn_notification_type: "GET",
    },
  });
  cachedIpnId = data.ipn_id || data.ipnId;
  if (!cachedIpnId) throw new Error(pesapalErrorMessage(data, "Could not register Pesapal IPN URL"));
  return cachedIpnId;
}

async function submitOrder(order, user, { channel = "MPESA", publicBase } = {}) {
  const origin = assertPublicBase(publicBase || config.publicBaseUrl);
  const token = await getToken();
  const notificationId = await ensureIpnId(token, origin);
  const addr = order.address || {};
  const phone = normalizePhone(addr.phone || user.phone);
  const email = user.email || "";
  if (!phone && !email) {
    throw new Error("Customer phone or email is required for Pesapal checkout.");
  }
  const callbackUrl = `${origin}/api/v1/payments/pesapal/return?orderId=${order.id}`;
  const merchantReference = pesapalMerchantRef(order);

  const payload = {
    id: merchantReference,
    currency: "KES",
    amount: Number(Number(order.totalKes).toFixed(2)),
    description: `Tajira Kenya order ${order.orderNumber}`.slice(0, 100),
    callback_url: callbackUrl,
    cancellation_url: `${callbackUrl}&cancelled=1`,
    notification_id: notificationId,
    redirect_mode: "TOP_WINDOW",
    branch: "Tajira Kenya",
    billing_address: {
      email_address: email || undefined,
      phone_number: phone || undefined,
      country_code: "KE",
      first_name: user.firstName || "Tajira",
      middle_name: "",
      last_name: user.lastName || "Customer",
      line_1: addr.street || "Nairobi",
      line_2: "",
      city: addr.city || addr.county || "Nairobi",
      state: "",
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
    throw new Error(pesapalErrorMessage(data, "Pesapal did not return a payment URL"));
  }

  return {
    redirectUrl: data.redirect_url,
    orderTrackingId: data.order_tracking_id,
    merchantReference,
    channel,
    raw: data,
  };
}

async function getTransactionStatus(orderTrackingId) {
  const token = await getToken();
  return api(`Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, { token });
}

function paymentStatusCode(status) {
  const raw = status?.status_code ?? status?.payment_status_code;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function paymentStatusDesc(status) {
  return String(status?.payment_status_description || "").trim().toUpperCase();
}

// Pesapal GetTransactionStatus often returns message: "success" for the HTTP call
// itself, including unpaid / pending checkouts. Never treat that as paid.
function isPaidStatus(status) {
  const code = paymentStatusCode(status);
  const desc = paymentStatusDesc(status);
  return code === 1 || desc === "COMPLETED";
}

function isFailedStatus(status) {
  const code = paymentStatusCode(status);
  const desc = paymentStatusDesc(status);
  return code === 2 || code === 3 || desc === "FAILED" || desc === "INVALID" || desc === "REVERSED";
}

function isPendingStatus(status) {
  return paymentStatusDesc(status) === "PENDING";
}

module.exports = {
  configured,
  isLive,
  statusSnapshot,
  resolvePublicBase,
  submitOrder,
  getTransactionStatus,
  isPaidStatus,
  isFailedStatus,
  isPendingStatus,
  normalizePhone,
  getToken,
  ensureIpnId,
  listIpns,
};
