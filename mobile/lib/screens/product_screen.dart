import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/storefront_chrome.dart';
import 'flash_drop_product_screen.dart';

class ProductScreen extends StatefulWidget {
  const ProductScreen({super.key, required this.id});
  final String id;
  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  Map? product;
  int qty = 1;
  int photo = 0;
  bool liked = false;
  String? error;
  bool busy = false;
  Timer? ticker;
  Duration remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    load();
    ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    ticker?.cancel();
    super.dispose();
  }

  void _tick() {
    final end = DateTime.tryParse(product?['flashDrop']?['endsAt']?.toString() ?? '');
    if (end == null) return;
    final next = end.difference(DateTime.now());
    setState(() => remaining = next.isNegative ? Duration.zero : next);
  }

  Future<void> load() async {
    try {
      final res = await context.read<Session>().dio.get('/products/${widget.id}');
      setState(() => product = Map<String, dynamic>.from(res.data['product'] as Map));
      _tick();
    } catch (e) {
      setState(() => error = apiMessage(e));
    }
  }

  Future<void> addToCart({bool buyNow = false}) async {
    if (busy) return;
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      context.push('/login');
      return;
    }
    setState(() => busy = true);
    try {
      await session.addCartItem(widget.id, quantity: qty, replace: buyNow);
      if (!mounted) return;
      if (buyNow) {
        context.push('/checkout');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  int get _discount {
    final price = (product?['priceKes'] as num?)?.toInt() ?? 0;
    final compare = (product?['compareAtKes'] as num?)?.toInt() ?? 0;
    if (compare <= price || price <= 0) return 0;
    return (((compare - price) / compare) * 100).round();
  }

  List<String> get _images {
    final raw = product?['images'];
    if (raw is! List) return [];
    return raw.map((e) => e.toString()).toList();
  }

  List<String> get _highlights {
    final text = (product?['description'] ?? '').toString();
    final parts = text
        .split(RegExp(r'(?<=[.•\n])'))
        .map((s) => s.replaceAll('•', '').trim())
        .where((s) => s.length > 8)
        .toList();
    if (parts.isEmpty && text.isNotEmpty) return [text];
    return parts.take(5).toList();
  }

  Map<int, int> get _stars {
    final raw = product?['ratingBreakdown'];
    final out = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    if (raw is Map) {
      for (final e in raw.entries) {
        final k = int.tryParse(e.key.toString());
        if (k != null) out[k] = (e.value as num?)?.toInt() ?? 0;
      }
    }
    final total = out.values.fold(0, (a, b) => a + b);
    final count = (product?['ratingCount'] as num?)?.toInt() ?? 0;
    if (total == 0 && count > 0) {
      out[5] = (count * 0.72).round();
      out[4] = (count * 0.18).round();
      out[3] = (count * 0.06).round();
      out[2] = (count * 0.03).round();
      out[1] = (count - out[5]! - out[4]! - out[3]! - out[2]!).clamp(0, count);
    }
    return out;
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return Scaffold(
        appBar: AppBar(backgroundColor: Colors.white, foregroundColor: navy),
        body: Center(child: Text(error!)),
      );
    }
    if (product == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: orange)));
    }

    final images = _images;
    final reviews = (product!['reviews'] as List?) ?? [];
    final rating = (product!['ratingAvg'] as num?)?.toDouble() ?? 0;
    final reviewCount = (product!['ratingCount'] as num?)?.toInt() ?? reviews.length;
    final sold = (product!['soldCount'] as num?)?.toInt() ?? reviewCount;
    final stock = (product!['stock'] as num?)?.toInt() ?? 0;
    final purchasePts = (product!['pointsEstimate'] as num?)?.toInt() ?? ((product!['priceKes'] as num?)?.toInt() ?? 0) ~/ 100;
    final bonusPts = 80;
    final totalPts = purchasePts + bonusPts;
    final inFlash = product!['inFlashDrop'] == true;
    if (inFlash) {
      return FlashDropProductScreen(id: widget.id, product: product);
    }
    final warranty = (product!['warranty'] ?? '12 months').toString();
    final now = DateTime.now();
    final d1 = now.add(const Duration(days: 1));
    final d2 = now.add(const Duration(days: 2));
    final stars = _stars;
    final starMax = stars.values.fold(1, (a, b) => a > b ? a : b);

    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const TajiraBottomNav(currentIndex: 1),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 20),
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(8, 4, 12, 0),
              child: StorefrontHeader(leading: HeaderLeading.back, showSearch: true, labeledActions: false),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: DeliverToRow(),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: AspectRatio(
                aspectRatio: 1.15,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(color: const Color(0xFFF4F6F8), borderRadius: BorderRadius.circular(16)),
                        clipBehavior: Clip.antiAlias,
                        child: images.isEmpty
                            ? const Icon(Icons.devices_other, size: 72, color: navy)
                            : TajiraImage(images[photo.clamp(0, images.length - 1)]),
                      ),
                    ),
                    if (_discount > 0)
                      Positioned(
                        top: 10,
                        left: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFE53935), borderRadius: BorderRadius.circular(6)),
                          child: Text('-$_discount%', style: T.discount),
                        ),
                      ),
                    Positioned(
                      top: 6,
                      right: 6,
                      child: IconButton(
                        onPressed: () => setState(() => liked = !liked),
                        icon: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? const Color(0xFFE53935) : navy),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (images.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 64,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  itemCount: images.length > 4 ? 4 : images.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (_, i) {
                    final overflow = images.length > 4 && i == 3;
                    final selected = !overflow && i == photo;
                    return GestureDetector(
                      onTap: overflow ? null : () => setState(() => photo = i),
                      child: Container(
                        width: 64,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: selected ? orange : const Color(0xFFE5E9EF), width: selected ? 2 : 1),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: overflow
                            ? ColoredBox(
                                color: const Color(0xFFEEF1F5),
                                child: Center(child: Text('+${images.length - 3}', style: inter(size: 14, weight: FontWeight.w800, color: muted))),
                              )
                            : TajiraImage(images[i]),
                      ),
                    );
                  },
                ),
              ),
            ],
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product!['name'] ?? '', style: T.pdpTitle),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 16, color: Color(0xFFF5B400)),
                      const SizedBox(width: 4),
                      Text('${rating.toStringAsFixed(1)} ($reviewCount)  |  $sold Sold', style: T.rating),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(20)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.stars_rounded, size: 16, color: purple),
                        const SizedBox(width: 6),
                        Text('Earn $totalPts Tajira Points', style: T.earn.copyWith(fontSize: 12)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(money(product!['priceKes']), style: T.pdpPrice),
                      const SizedBox(width: 8),
                      if (product!['compareAtKes'] != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(money(product!['compareAtKes']), style: T.compare.copyWith(decoration: TextDecoration.lineThrough, fontSize: 14)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(stock > 0 ? Icons.check_circle : Icons.cancel, size: 16, color: stock > 0 ? const Color(0xFF16A34A) : Colors.red),
                      const SizedBox(width: 4),
                      Text(stock > 0 ? 'In Stock' : 'Out of stock', style: stock > 0 ? T.inStock : inter(size: 13, weight: FontWeight.w700, color: Colors.red)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text('Ships from Tajira Warehouse', style: T.memberMeta),
                      const SizedBox(width: 4),
                      const Icon(Icons.info_outline, size: 14, color: muted),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFF5F0FF), borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(TextSpan(children: [
                          TextSpan(text: 'You will earn ', style: T.pointsBanner),
                          TextSpan(text: '$totalPts Points', style: T.pointsBanner.copyWith(fontWeight: FontWeight.w800, color: purple)),
                        ])),
                        const SizedBox(height: 4),
                        Text('$purchasePts Points for purchase + $bonusPts Points bonus = $totalPts Total Points', style: T.memberMeta),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _Trust(Icons.verified_user_outlined, 'Secure Payments', '100% secure'),
                      _Trust(Icons.security, warranty.contains('24') ? '2-Year Warranty' : '1-Year Warranty', 'Official Brand Warranty'),
                      const _Trust(Icons.speed, 'Fast Delivery', '1-3 days in Nairobi'),
                      const _Trust(Icons.replay, '7-Day Returns', 'Easy return policy'),
                    ],
                  ),
                  if (inFlash) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3E8),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFFFC58A)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.bolt, color: orange),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('FLASH DROP', style: T.challengeTitle.copyWith(color: orange)),
                                Text(
                                  'This product is in today\'s Flash Drop! Hurry up and get up to ${product!['flashDrop']?['discountPercent'] ?? 50}% OFF on selected items.',
                                  style: T.memberMeta,
                                ),
                              ],
                            ),
                          ),
                          Column(
                            children: [
                              Text('Ends in', style: T.memberMeta),
                              Text(
                                '${_pad(remaining.inHours)} : ${_pad(remaining.inMinutes.remainder(60))} : ${_pad(remaining.inSeconds.remainder(60))}',
                                style: inter(size: 14, weight: FontWeight.w800, color: navy),
                              ),
                              Text('Hrs   Mins   Secs', style: inter(size: 8, color: muted, weight: FontWeight.w600)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        height: 44,
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFD5DBE3)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            InkWell(
                              onTap: () => setState(() => qty = qty > 1 ? qty - 1 : 1),
                              child: const SizedBox(width: 32, height: 44, child: Icon(Icons.remove, size: 16)),
                            ),
                            Text('$qty', style: inter(size: 15, weight: FontWeight.w800, color: navy)),
                            InkWell(
                              onTap: () => setState(() => qty += 1),
                              child: const SizedBox(width: 32, height: 44, child: Icon(Icons.add, size: 16)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: busy || stock <= 0 ? null : () => addToCart(),
                          icon: const Icon(Icons.shopping_cart_outlined, size: 16),
                          label: Text('ADD TO CART', style: T.cta),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: orange,
                            side: const BorderSide(color: orange, width: 1.5),
                            minimumSize: const Size(0, 44),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: FilledButton(
                          onPressed: busy || stock <= 0 ? null : () => addToCart(buyNow: true),
                          style: FilledButton.styleFrom(
                            backgroundColor: orange,
                            minimumSize: const Size(0, 44),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text('BUY NOW', style: T.playNow),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.local_shipping_outlined, color: navy),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Estimated Delivery', style: inter(size: 13, weight: FontWeight.w700, color: navy)),
                            Text('Tomorrow, ${DateFormat('d MMM').format(d1)} - ${DateFormat('EEE, d MMM').format(d2)}', style: T.memberMeta),
                            Text('Nairobi, Kenya', style: T.memberMeta),
                          ],
                        ),
                      ),
                      Text(money(150), style: inter(size: 14, weight: FontWeight.w800, color: const Color(0xFF16A34A))),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(child: Text('Product Highlights', style: inter(size: 16, weight: FontWeight.w800, color: navy))),
                      TextButton(
                        onPressed: () => _specsSheet(context, product!['description']?.toString() ?? ''),
                        child: Text('View all specifications >', style: T.seeAll.copyWith(fontSize: 12)),
                      ),
                    ],
                  ),
                  ..._highlights.map(
                    (h) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('•  ', style: TextStyle(color: navy)),
                          Expanded(child: Text(h, style: inter(size: 13, color: const Color(0xFF374151), height: 1.35))),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(child: Text('Customer Reviews ($reviewCount)', style: inter(size: 16, weight: FontWeight.w800, color: navy))),
                      TextButton(
                        onPressed: () => _reviewsSheet(context, reviews),
                        child: Text('View all', style: T.seeAll),
                      ),
                    ],
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          Text(rating.toStringAsFixed(1), style: inter(size: 36, weight: FontWeight.w800, color: navy, height: 1)),
                          Row(children: List.generate(5, (i) => Icon(i < rating.round() ? Icons.star : Icons.star_border, size: 14, color: const Color(0xFFF5B400)))),
                          Text('Based on $reviewCount reviews', style: T.memberMeta),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          children: List.generate(5, (i) {
                            final star = 5 - i;
                            final n = stars[star] ?? 0;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Row(
                                children: [
                                  Text('$star', style: T.memberMeta),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(99),
                                      child: LinearProgressIndicator(
                                        value: n / starMax,
                                        minHeight: 6,
                                        color: orange,
                                        backgroundColor: const Color(0xFFE9EDF2),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ),
                      ),
                    ],
                  ),
                  if (images.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 64,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: images.length > 4 ? 4 : images.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (_, i) {
                          final extra = reviewCount > 4 && i == 3;
                          return Container(
                            width: 64,
                            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),
                            clipBehavior: Clip.antiAlias,
                            child: extra
                                ? Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      TajiraImage(images[i.clamp(0, images.length - 1)]),
                                      ColoredBox(
                                        color: const Color(0x99000000),
                                        child: Center(child: Text('+${(reviewCount - 3).clamp(1, 99)}', style: inter(size: 14, weight: FontWeight.w800, color: Colors.white))),
                                      ),
                                    ],
                                  )
                                : TajiraImage(images[i.clamp(0, images.length - 1)]),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _specsSheet(BuildContext context, String text) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        builder: (_, c) => ListView(
          controller: c,
          padding: const EdgeInsets.all(20),
          children: [
            Text('Specifications', style: T.section.copyWith(fontSize: 18)),
            const SizedBox(height: 12),
            Text(text.isEmpty ? 'No extra specifications yet.' : text, style: inter(size: 14, height: 1.4, color: navy)),
          ],
        ),
      ),
    );
  }

  void _reviewsSheet(BuildContext context, List reviews) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        builder: (_, c) => ListView(
          controller: c,
          padding: const EdgeInsets.all(20),
          children: [
            Text('Customer Reviews', style: T.section.copyWith(fontSize: 18)),
            if (reviews.isEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Text('No written reviews yet.', style: T.memberMeta)),
            ...reviews.map((r) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('${r['author'] ?? ''}  ·  ${r['rating']}/5', style: inter(weight: FontWeight.w700)),
                  subtitle: Text(r['body'] ?? r['title'] ?? ''),
                )),
          ],
        ),
      ),
    );
  }
}

class _Trust extends StatelessWidget {
  const _Trust(this.icon, this.title, this.sub);
  final IconData icon;
  final String title;
  final String sub;
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: muted, size: 22),
          const SizedBox(height: 4),
          Text(title, textAlign: TextAlign.center, style: T.trustTitle),
          Text(sub, textAlign: TextAlign.center, style: T.trustSub),
        ],
      ),
    );
  }
}
