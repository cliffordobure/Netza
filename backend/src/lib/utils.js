function nairobiDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function randomCode(prefix, length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${out}`;
}

function membershipFromEarned(totalEarned) {
  if (totalEarned >= 15000) return "PLATINUM";
  if (totalEarned >= 5000) return "GOLD";
  if (totalEarned >= 1000) return "SILVER";
  return "BRONZE";
}

function paginate(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(query.limit || 20)));
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = {
  nairobiDateString,
  slugify,
  randomCode,
  membershipFromEarned,
  paginate,
};
