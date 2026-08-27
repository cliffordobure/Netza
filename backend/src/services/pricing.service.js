const { FlashDrop, idOf } = require("../models");

async function activeFlashMap(productIds = null) {
  const now = new Date();
  const drops = await FlashDrop.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).populate("products.product");

  const allow = productIds ? new Set(productIds.map(String)) : null;
  const map = new Map();
  for (const drop of drops) {
    for (const item of drop.products) {
      if (item.remainingQty <= 0 || !item.product) continue;
      const pid = idOf(item.product);
      if (allow && !allow.has(pid)) continue;
      map.set(pid, {
        flashDropId: drop.id,
        flashDropName: drop.name,
        originalKes: item.originalKes,
        flashKes: item.flashKes,
        remainingQty: item.remainingQty,
        endsAt: drop.endsAt,
        discountPercent: drop.discountPercent,
        maxQtyPerCustomer: drop.maxQtyPerCustomer,
      });
    }
  }
  return map;
}

function decorateProduct(product, flash) {
  const images = (product.images || [])
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((i) => i.url);
  const json = typeof product.toJSON === "function" ? product.toJSON() : product;
  const base = {
    id: json.id,
    name: json.name,
    slug: json.slug,
    sku: json.sku,
    description: json.description,
    priceKes: json.priceKes,
    compareAtKes: json.compareAtKes,
    stock: json.stock,
    warranty: json.warranty,
    deliveryInfo: json.deliveryInfo,
    isTrending: json.isTrending,
    ratingAvg: json.ratingAvg,
    ratingCount: json.ratingCount,
    brand: json.brand,
    category: json.category,
    images,
    inFlashDrop: false,
    brandId: json.brand?.id || json.brand,
    categoryId: json.category?.id || json.category,
  };
  if (flash) {
    base.inFlashDrop = true;
    base.compareAtKes = flash.originalKes;
    base.priceKes = flash.flashKes;
    base.flashDrop = {
      name: flash.flashDropName,
      endsAt: flash.endsAt,
      remainingQty: flash.remainingQty,
      discountPercent: flash.discountPercent,
    };
  }
  return base;
}

async function resolveUnitPrice(product) {
  const map = await activeFlashMap([idOf(product)]);
  const flash = map.get(idOf(product));
  if (flash) {
    return { unitPriceKes: flash.flashKes, wasFlashDrop: true, flash };
  }
  return { unitPriceKes: product.priceKes, wasFlashDrop: false, flash: null };
}

module.exports = { activeFlashMap, decorateProduct, resolveUnitPrice };
