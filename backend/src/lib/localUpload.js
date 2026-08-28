const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_ROOT = path.join(__dirname, "../../uploads");

function ensureUploadRoot() {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

function extFromMime(mimeType) {
  const m = String(mimeType || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

/** Save image to local /uploads when Cloudinary is not configured. */
function saveLocalBuffer(buffer, { mimeType } = {}) {
  ensureUploadRoot();
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extFromMime(mimeType)}`;
  fs.writeFileSync(path.join(UPLOAD_ROOT, name), buffer);
  return {
    url: `/uploads/${name}`,
    publicId: name,
    width: null,
    height: null,
    format: extFromMime(mimeType),
    bytes: buffer.length,
    mimeType: mimeType || "image/jpeg",
  };
}

module.exports = { UPLOAD_ROOT, saveLocalBuffer, ensureUploadRoot };
