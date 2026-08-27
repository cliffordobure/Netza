const crypto = require("crypto");
const { Router } = require("express");
const { z } = require("zod");
const multer = require("multer");
const { Quote, Product, Cart, isOid, idOf } = require("../../models");
const { auth } = require("../../middleware/auth");
const { asyncHandler, httpError } = require("../../middleware/error");
const { uploadBuffer } = require("../../lib/cloudinary");

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

const itemSchema = z.object({
  kind: z.enum(["catalog", "custom"]).default("custom"),
  productId: z.string().optional().nullable(),
  name: z.string().min(1).max(200),
  imageUrl: z.string().optional().default(""),
  unitPriceKes: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
});

const upsertSchema = z.object({
  companyName: z.string().max(120).optional(),
  logoUrl: z.string().max(500).optional(),
  clientName: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  items: z.array(itemSchema).optional(),
});

function makeToken() {
  return crypto.randomBytes(16).toString("hex");
}

function lineTotal(item) {
  return Math.round(Number(item.unitPriceKes || 0) * Number(item.quantity || 0));
}

function serializeQuote(quote, { publicView = false } = {}) {
  const items = (quote.items || []).map((item) => {
    const product = item.product && typeof item.product === "object" ? item.product : null;
    return {
      id: item.id || String(item._id),
      kind: item.kind,
      productId: product ? idOf(product) : item.product ? String(item.product) : null,
      name: item.name,
      imageUrl: item.imageUrl || (product?.images?.[0]?.url ?? ""),
      unitPriceKes: item.unitPriceKes,
      quantity: item.quantity,
      lineTotalKes: lineTotal(item),
      inStock: product ? product.isActive && product.stock > 0 : false,
      availableOnSite: item.kind === "catalog" && Boolean(product?.isActive),
    };
  });
  const totalKes = items.reduce((s, i) => s + i.lineTotalKes, 0);
  const base = {
    id: quote.id || String(quote._id),
    companyName: quote.companyName || "",
    logoUrl: quote.logoUrl || "",
    clientName: quote.clientName || "",
    note: quote.note || "",
    status: quote.status,
    shareToken: quote.shareToken || null,
    items,
    totalKes,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
  if (!publicView) base.ownerId = quote.owner ? String(quote.owner._id || quote.owner) : null;
  return base;
}

async function loadOwned(id, userId) {
  if (!isOid(id)) throw httpError(404, "Quote not found");
  const quote = await Quote.findOne({ _id: id, owner: userId }).populate("items.product");
  if (!quote) throw httpError(404, "Quote not found");
  return quote;
}

async function normalizeItems(rawItems = []) {
  const out = [];
  for (const raw of rawItems) {
    if (raw.kind === "catalog") {
      if (!raw.productId || !isOid(raw.productId)) throw httpError(400, "Catalog item needs a product");
      const product = await Product.findById(raw.productId);
      if (!product || !product.isActive) throw httpError(404, "Product not found");
      out.push({
        kind: "catalog",
        product: product._id,
        name: product.name,
        imageUrl: product.images?.[0]?.url || raw.imageUrl || "",
        unitPriceKes: product.priceKes,
        quantity: raw.quantity || 1,
      });
    } else {
      out.push({
        kind: "custom",
        product: null,
        name: raw.name,
        imageUrl: raw.imageUrl || "",
        unitPriceKes: raw.unitPriceKes,
        quantity: raw.quantity || 1,
      });
    }
  }
  return out;
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moneyKes(n) {
  return `KSh ${Math.round(Number(n) || 0).toLocaleString("en-KE")}`;
}

router.get(
  "/view/:token",
  asyncHandler(async (req, res) => {
    const quote = await Quote.findOne({ shareToken: req.params.token }).populate("items.product");
    if (!quote) throw httpError(404, "Quote not found");
    const data = serializeQuote(quote, { publicView: true });
    const rows = data.items
      .map(
        (i) => `<tr>
      <td style="padding:10px;border-bottom:1px solid #eee">${escapeHtml(i.name)}${i.availableOnSite ? ' <span style="color:#16a34a;font-size:12px">· on site</span>' : ""}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${moneyKes(i.unitPriceKes)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${moneyKes(i.lineTotalKes)}</td>
    </tr>`
      )
      .join("");
    res.type("html").send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Quote · ${escapeHtml(data.companyName || "NETZA")}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f7f8fa;color:#0b1f3a}
  .page{max-width:720px;margin:24px auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 2px 12px #0001}
  .logo{max-height:56px;max-width:160px;object-fit:contain}
  h1{font-size:22px;margin:8px 0 4px}
  .muted{color:#6b7280;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:20px;font-size:14px}
  .total{font-size:20px;font-weight:800;text-align:right;margin-top:16px}
  .actions{margin-top:24px;display:flex;gap:10px;flex-wrap:wrap}
  button,.btn{background:#f97316;color:#fff;border:0;padding:12px 18px;border-radius:10px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
  @media print{.actions{display:none} body{background:#fff} .page{box-shadow:none;margin:0;border-radius:0}}
</style></head><body>
<div class="page">
  ${data.logoUrl ? `<img class="logo" src="${escapeHtml(data.logoUrl)}" alt=""/>` : ""}
  <h1>${escapeHtml(data.companyName || "Quote")}</h1>
  ${data.clientName ? `<p class="muted">For ${escapeHtml(data.clientName)}</p>` : ""}
  ${data.note ? `<p class="muted">${escapeHtml(data.note)}</p>` : ""}
  <table>
    <thead><tr>
      <th style="text-align:left;padding:8px;border-bottom:2px solid #0b1f3a">Item</th>
      <th style="padding:8px;border-bottom:2px solid #0b1f3a">Qty</th>
      <th style="text-align:right;padding:8px;border-bottom:2px solid #0b1f3a">Price</th>
      <th style="text-align:right;padding:8px;border-bottom:2px solid #0b1f3a">Total</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="4" style="padding:16px" class="muted">No items</td></tr>`}</tbody>
  </table>
  <div class="total">${moneyKes(data.totalKes)}</div>
  <div class="actions">
    <button onclick="window.print()">Print</button>
  </div>
  <p class="muted" style="margin-top:20px">Site products marked “on site” can be added to cart in the NETZA app.</p>
</div></body></html>`);
  })
);

router.get(
  "/shared/:token",
  asyncHandler(async (req, res) => {
    const quote = await Quote.findOne({ shareToken: req.params.token }).populate("items.product");
    if (!quote) throw httpError(404, "Quote not found");
    res.json({ quote: serializeQuote(quote, { publicView: true }) });
  })
);

router.post(
  "/shared/:token/add-to-cart",
  auth(),
  asyncHandler(async (req, res) => {
    const quote = await Quote.findOne({ shareToken: req.params.token }).populate("items.product");
    if (!quote) throw httpError(404, "Quote not found");
    const cart = await getOrCreateCart(req.user._id);
    let added = 0;
    let skipped = 0;
    for (const item of quote.items) {
      if (item.kind !== "catalog" || !item.product) {
        skipped += 1;
        continue;
      }
      const product = item.product;
      const qty = item.quantity || 1;
      if (!product.isActive || product.stock < 1) {
        skipped += 1;
        continue;
      }
      const take = Math.min(qty, product.stock);
      const existing = cart.items.find((i) => idOf(i.product) === idOf(product));
      if (existing) existing.quantity += take;
      else cart.items.push({ product: product._id, quantity: take });
      added += 1;
    }
    await cart.save();
    if (quote.status === "sent") {
      quote.status = "accepted";
      await quote.save();
    }
    res.json({
      added,
      skipped,
      message:
        added > 0
          ? `${added} item(s) added to cart${skipped ? ` · ${skipped} skipped` : ""}`
          : "No site products available to add",
    });
  })
);

router.use(auth());

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const quotes = await Quote.find({ owner: req.user._id }).sort({ updatedAt: -1 }).limit(50).populate("items.product");
    res.json({ quotes: quotes.map((q) => serializeQuote(q)) });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = upsertSchema.parse(req.body || {});
    const items = await normalizeItems(body.items || []);
    const quote = await Quote.create({
      owner: req.user._id,
      companyName: body.companyName || "",
      logoUrl: body.logoUrl || "",
      clientName: body.clientName || "",
      note: body.note || "",
      items,
      status: "draft",
    });
    await quote.populate("items.product");
    res.status(201).json({ quote: serializeQuote(quote) });
  })
);

router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return next(httpError(400, err.message || "Upload failed"));
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(400, "No file uploaded");
    const result = await uploadBuffer(req.file.buffer, {
      folder: "misc",
      mimeType: req.file.mimetype,
    });
    res.status(201).json({ url: result.url });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const quote = await loadOwned(req.params.id, req.user._id);
    res.json({ quote: serializeQuote(quote) });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = upsertSchema.parse(req.body || {});
    const quote = await loadOwned(req.params.id, req.user._id);
    if (body.companyName !== undefined) quote.companyName = body.companyName;
    if (body.logoUrl !== undefined) quote.logoUrl = body.logoUrl;
    if (body.clientName !== undefined) quote.clientName = body.clientName;
    if (body.note !== undefined) quote.note = body.note;
    if (body.items !== undefined) quote.items = await normalizeItems(body.items);
    await quote.save();
    await quote.populate("items.product");
    res.json({ quote: serializeQuote(quote) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const quote = await loadOwned(req.params.id, req.user._id);
    await quote.deleteOne();
    res.json({ ok: true });
  })
);

router.post(
  "/:id/share",
  asyncHandler(async (req, res) => {
    const quote = await loadOwned(req.params.id, req.user._id);
    if (!quote.shareToken) quote.shareToken = makeToken();
    quote.status = "sent";
    await quote.save();
    await quote.populate("items.product");
    const data = serializeQuote(quote);
    const base = `${req.protocol}://${req.get("host")}`;
    res.json({
      quote: data,
      shareUrl: `${base}/api/v1/quotes/view/${quote.shareToken}`,
    });
  })
);

module.exports = router;
