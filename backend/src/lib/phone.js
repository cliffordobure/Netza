function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

function parsePhoneList(raw) {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((part) => normalizePhone(part))
    .filter((phone, i, all) => phone && all.indexOf(phone) === i);
}

function maskPhone(phone) {
  const n = normalizePhone(phone);
  if (n.length < 7) return n || "";
  return `${n.slice(0, 5)}***${n.slice(-3)}`;
}

module.exports = { normalizePhone, parsePhoneList, maskPhone };
