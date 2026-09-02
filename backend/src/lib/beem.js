const config = require("../config");
const { normalizePhone, maskPhone } = require("./phone");

function configured() {
  return Boolean(config.beem.apiKey && config.beem.secretKey);
}

function statusSnapshot() {
  return {
    configured: configured(),
    senderId: config.beem.senderId,
    adminCount: config.beem.adminPhones.length,
    salesCount: config.beem.salesPhones.length,
    adminPhones: config.beem.adminPhones.map(maskPhone),
    salesPhones: config.beem.salesPhones.map(maskPhone),
  };
}

async function sendSms({ to, message }) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((phone) => normalizePhone(phone))
    .filter(Boolean);
  const text = String(message || "").trim();
  if (!configured() || !recipients.length || !text) {
    return { skipped: true, reason: configured() ? "no-recipients" : "not-configured", recipients };
  }

  const body = {
    source_addr: config.beem.senderId,
    schedule_time: "",
    encoding: 0,
    message: text,
    recipients: recipients.map((dest_addr, i) => ({
      recipient_id: String(i + 1),
      dest_addr,
    })),
  };

  const auth = Buffer.from(`${config.beem.apiKey}:${config.beem.secretKey}`).toString("base64");
  const res = await fetch(config.beem.sendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code && Number(data.code) >= 400) {
    const err = new Error(data.message || data.error || `Beem SMS failed (${res.status})`);
    err.payload = data;
    throw err;
  }
  return { skipped: false, recipients, data };
}

module.exports = { configured, statusSnapshot, sendSms };
