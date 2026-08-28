/**
 * Normalize Kenyan phone + email for consistent login/register.
 * Stored phone format: 2547XXXXXXXX / 2541XXXXXXXX (no +).
 */

function normalizeEmail(value) {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive email match filter for Mongo queries. */
function emailMatchFilter(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return { email: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" } };
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

/**
 * @param {string} value
 * @returns {string} E.164-like local: 254XXXXXXXXX
 */
function normalizePhone(value) {
  let d = digitsOnly(value);
  if (!d) {
    const err = new Error("Phone number is required");
    err.status = 400;
    throw err;
  }
  if (d.startsWith("0") && d.length === 10) d = `254${d.slice(1)}`;
  else if ((d.startsWith("7") || d.startsWith("1")) && d.length === 9) d = `254${d}`;
  else if (d.startsWith("2540") && d.length === 13) d = `254${d.slice(4)}`;
  else if (d.startsWith("254") && d.length === 12) {
    /* ok */
  } else if (d.length === 12 && d.startsWith("254")) {
    /* ok */
  } else {
    const err = new Error("Enter a valid Kenyan phone (e.g. 07XX XXX XXX)");
    err.status = 400;
    throw err;
  }
  if (!/^254[17]\d{8}$/.test(d)) {
    const err = new Error("Enter a valid Kenyan phone (e.g. 07XX XXX XXX)");
    err.status = 400;
    throw err;
  }
  return d;
}

/** Formats for DB lookups when legacy rows may still use 07… */
function phoneLookupVariants(value) {
  const variants = new Set();
  const raw = String(value || "").replace(/\s+/g, "");
  if (raw) variants.add(raw);
  try {
    const n = normalizePhone(value);
    variants.add(n);
    if (n.startsWith("254") && n.length === 12) variants.add(`0${n.slice(3)}`);
  } catch {
    /* ignore */
  }
  return [...variants];
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  phoneLookupVariants,
  digitsOnly,
  escapeRegex,
  emailMatchFilter,
};
