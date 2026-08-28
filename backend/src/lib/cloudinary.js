const { v2: cloudinary } = require("cloudinary");
const config = require("../config");
const { httpError } = require("../middleware/error");
const { saveLocalBuffer } = require("./localUpload");

const FOLDERS = new Set([
  "products",
  "categories",
  "brands",
  "competitions",
  "flash-drops",
  "rewards",
  "misc",
]);

function isConfigured() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw httpError(
      503,
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env"
    );
  }
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

function resolveFolder(subfolder) {
  const base = (config.cloudinary.folder || "netza").replace(/\/+$/, "");
  const key = String(subfolder || "misc").toLowerCase();
  if (!FOLDERS.has(key)) {
    throw httpError(400, `Invalid upload folder. Use one of: ${[...FOLDERS].join(", ")}`);
  }
  return `${base}/${key}`;
}

function uploadToCloudinary(buffer, { folder = "misc", publicId, mimeType } = {}) {
  ensureConfigured();
  const targetFolder = resolveFolder(folder);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: targetFolder,
        resource_type: "image",
        public_id: publicId || undefined,
        overwrite: false,
        unique_filename: true,
        format: undefined,
      },
      (err, result) => {
        if (err) {
          const message = err.message || "Cloudinary upload failed";
          return reject(httpError(502, message));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          mimeType: mimeType || result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
}

/** Prefer Cloudinary; fall back to local /uploads so quotes keep working. */
async function uploadBuffer(buffer, opts = {}) {
  if (isConfigured()) {
    try {
      return await uploadToCloudinary(buffer, opts);
    } catch (err) {
      if (opts.allowLocalFallback === false) throw err;
    }
  }
  return saveLocalBuffer(buffer, { mimeType: opts.mimeType });
}

module.exports = {
  FOLDERS,
  isConfigured,
  resolveFolder,
  uploadBuffer,
};
