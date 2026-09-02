import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../core/config.dart';

const _cacheKey = 'tajira.catalog.v2';
const _cacheVersion = 2;

/// Seed SKUs / names from `backend/src/seed.js` — never show these as live stock.
const _demoSkus = {'NET-AX55', 'CCTV-HK2143', 'AC-F18'};
const _demoSlugs = {'net-ax55', 'cctv-hk2143', 'ac-f18'};
const _demoNames = {
  'TP-Link Archer AX55 Wi-Fi 6 Router',
  'Hikvision DS-2CD2143G2-I 4MP Dome',
  'ZKTeco F18 Fingerprint Terminal',
};

class CatalogSnapshot {
  const CatalogSnapshot({
    this.products = const [],
    this.trending = const [],
    this.categories = const [],
    this.banners = const [],
  });

  final List products;
  final List trending;
  final List categories;
  final List banners;

  bool get hasCatalog =>
      products.isNotEmpty || trending.isNotEmpty || categories.isNotEmpty;
}

bool isSeedDemoProduct(dynamic raw) {
  if (raw is! Map) return false;
  final sku = raw['sku']?.toString().toUpperCase();
  final slug = raw['slug']?.toString().toLowerCase();
  final name = raw['name']?.toString();
  if (sku != null && _demoSkus.contains(sku)) return true;
  if (slug != null && _demoSlugs.contains(slug)) return true;
  if (name != null && _demoNames.contains(name)) return true;
  return false;
}

List liveProducts(List? list) {
  if (list == null) return [];
  return [
    for (final item in list)
      if (item is Map && !isSeedDemoProduct(item)) Map<String, dynamic>.from(item),
  ];
}

List _asMaps(dynamic raw) {
  if (raw is! List) return [];
  return [
    for (final item in raw)
      if (item is Map) Map<String, dynamic>.from(item),
  ];
}

Future<CatalogSnapshot?> loadCatalogCache() async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(_cacheKey);
  if (raw == null || raw.isEmpty) return null;
  try {
    final json = jsonDecode(raw);
    if (json is! Map) return null;
    if (json['v'] != _cacheVersion) return null;
    if (json['api']?.toString() != apiBaseUrl()) return null;
    final snap = CatalogSnapshot(
      products: liveProducts(_asMaps(json['products'])),
      trending: liveProducts(_asMaps(json['trending'])),
      categories: _asMaps(json['categories']),
      banners: _asMaps(json['banners']),
    );
    return snap.hasCatalog ? snap : null;
  } catch (_) {
    return null;
  }
}

Future<void> saveCatalogCache(CatalogSnapshot snap) async {
  final live = CatalogSnapshot(
    products: liveProducts(snap.products),
    trending: liveProducts(snap.trending),
    categories: _asMaps(snap.categories),
    banners: _asMaps(snap.banners),
  );
  if (!live.hasCatalog) return;
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(
    _cacheKey,
    jsonEncode({
      'v': _cacheVersion,
      'api': apiBaseUrl(),
      'savedAt': DateTime.now().toIso8601String(),
      'products': live.products,
      'trending': live.trending,
      'categories': live.categories,
      'banners': live.banners,
    }),
  );
}
