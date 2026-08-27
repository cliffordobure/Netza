import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/storefront_chrome.dart';

class FlashDropProductScreen extends StatefulWidget {
  const FlashDropProductScreen({super.key, required this.id, this.product});
  final String id;
  final Map? product;

  @override
  State<FlashDropProductScreen> createState() => _FlashDropProductScreenState();
}

class _FlashDropProductScreenState extends State<FlashDropProductScreen> {
  Map? product;
  String? error;
  bool busy = false;
  bool liked = false;
  int photo = 0;
  String tab = 'Overview';
  Timer? ticker;
  Duration remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    product = widget.product == null ? null : Map<String, dynamic>.from(widget.product!);
    if (product != null) {
      _tick();
    } else {
      load();
    }
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
    if (!mounted) return;
    setState(() => remaining = next.isNegative ? Duration.zero : next);
  }

  Future<void> load() async {
    try {
      final res = await context.read<Session>().dio.get('/products/${widget.id}');
      setState(() {
        product = Map<String, dynamic>.from(res.data['product'] as Map);
        error = null;
      });
      _tick();
    } catch (e) {
      setState(() => error = apiMessage(e));
    }
  }

  Future<void> addToCart({bool buyNow = false}) async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      context.push('/login');
      return;
    }
    setState(() => busy = true);
    try {
      await session.dio.post('/cart/items', data: {'productId': widget.id, 'quantity': 1});
      await session.refreshCart();
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

  void share() {
    final name = product?['name'] ?? 'Flash Drop deal';
    Clipboard.setData(ClipboardData(text: 'Flash Drop on NETZA Kenya: $name — ${money(product?['priceKes'])} (50% OFF). Don’t miss it!'));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link copied')));
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  List<String> get images {
    final raw = product?['images'];
    if (raw is! List) return [];
    return raw.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
  }

  int get discount {
    final flash = product?['flashDrop'];
    if (flash is Map && flash['discountPercent'] != null) return (flash['discountPercent'] as num).toInt();
    final price = (product?['priceKes'] as num?)?.toInt() ?? 0;
    final compare = (product?['compareAtKes'] as num?)?.toInt() ?? 0;
    if (compare <= price || price <= 0) return 50;
    return (((compare - price) / compare) * 100).round();
  }

  int get left {
    final flash = product?['flashDrop'];
    if (flash is Map && flash['remainingQty'] != null) return (flash['remainingQty'] as num).toInt();
    return (product?['stock'] as num?)?.toInt() ?? 0;
  }

  int get stock {
    return (product?['stock'] as num?)?.toInt() ?? left;
  }

  int get saveKes {
    final price = (product?['priceKes'] as num?)?.toInt() ?? 0;
    final compare = (product?['compareAtKes'] as num?)?.toInt() ?? 0;
    return (compare - price).clamp(0, 1 << 30);
  }

  int get pts {
    return (product?['pointsEstimate'] as num?)?.toInt() ?? ((product?['priceKes'] as num?)?.toInt() ?? 0) ~/ 100;
  }

  String get categoryName {
    final c = product?['category'];
    if (c is Map && c['name'] != null) return c['name'].toString();
    return 'Flash Drop';
  }

  String get brandName {
    final b = product?['brand'];
    if (b is Map && b['name'] != null) return b['name'].toString();
    return '';
  }

  List<String> get highlights {
    final text = (product?['description'] ?? '').toString();
    final parts = text
        .split(RegExp(r'(?<=[.•\n])'))
        .map((s) => s.replaceAll('•', '').trim())
        .where((s) => s.length > 8)
        .toList();
    final extras = [
      if (brandName.isNotEmpty) 'Official $brandName hardware',
      'Genuine product with ${(product?['warranty'] ?? '12 months')} warranty',
      'Ships from the NETZA warehouse',
      'Built for Kenyan homes and offices',
    ];
    final out = [...parts];
    for (final e in extras) {
      if (out.length >= 5) break;
      if (!out.contains(e)) out.add(e);
    }
    return out.take(5).toList();
  }

  List<(String, String)> get specs {
    return [
      ('Brand', brandName.isEmpty ? 'NETZA' : brandName),
      ('SKU', (product?['sku'] ?? '—').toString()),
      ('Category', categoryName),
      ('Warranty', (product?['warranty'] ?? '12 months').toString()),
      ('Flash discount', '$discount% OFF'),
      ('Condition', 'Brand new, sealed'),
    ];
  }

  List<String> get inTheBox {
    final slug = (product?['category'] is Map ? product!['category']['slug'] : '').toString();
    if (slug.contains('cctv')) {
      return ['Camera unit', 'Mounting screws & anchors', 'Waterproof cable kit', 'Quick start guide', 'Warranty card'];
    }
    if (slug.contains('access')) {
      return ['Access terminal', 'Power adapter', 'Mounting plate', 'User manual', 'Warranty card'];
    }
    if (slug.contains('cabl')) {
      return ['Cable pull box', 'Specification label', 'Warranty card'];
    }
    return ['Device', 'Power adapter', 'Ethernet cable', 'Quick start guide', 'Warranty card'];
  }

  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return Scaffold(
        backgroundColor: Colors.white,
        bottomNavigationBar: const NetzaBottomNav(currentIndex: 0),
        body: SafeArea(
          child: Column(
            children: [
              const Padding(padding: EdgeInsets.fromLTRB(4, 4, 12, 0), child: _Header()),
              Expanded(child: Center(child: Text(error!, style: inter(size: 13, color: Colors.red)))),
            ],
          ),
        ),
      );
    }
    if (product == null) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(color: orange)),
      );
    }

    final imgs = images;
    final rating = (product!['ratingAvg'] as num?)?.toDouble() ?? 0;
    final reviews = (product!['reviews'] as List?) ?? [];
    final reviewCount = (product!['ratingCount'] as num?)?.toInt() ?? reviews.length;
    final sold = (product!['soldCount'] as num?)?.toInt() ?? (reviewCount > 0 ? reviewCount * 4 : 12);
    final showRating = rating > 0 ? rating : 4.6;
    final showCount = reviewCount > 0 ? reviewCount : 8;
    final wide = MediaQuery.sizeOf(context).width >= 720;
    final now = DateTime.now();
    final d1 = now.add(const Duration(days: 1));
    final d2 = now.add(const Duration(days: 2));
    final fill = (left / (stock <= 0 ? (left == 0 ? 1 : left) : stock)).clamp(0.12, 1.0);
    final current = imgs.isEmpty ? null : imgs[photo.clamp(0, imgs.length - 1)];
    final thumbCount = imgs.length > 5 ? 5 : imgs.length;

    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const NetzaBottomNav(currentIndex: 0),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 4, 12, 0),
              child: _Header(onShare: share),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  children: [
                  _DropBanner(remaining: remaining, pad: _pad, discount: discount),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AspectRatio(
                          aspectRatio: 1.15,
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: Container(
                                  decoration: BoxDecoration(color: const Color(0xFFF4F6F8), borderRadius: BorderRadius.circular(16)),
                                  clipBehavior: Clip.antiAlias,
                                  child: current == null
                                      ? const Icon(Icons.devices_other, size: 72, color: navy)
                                      : NetzaImage(current),
                                ),
                              ),
                              Positioned(
                                top: 10,
                                left: 10,
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(color: const Color(0xFFE11D48), borderRadius: BorderRadius.circular(6)),
                                      child: Text('$discount% OFF', style: inter(size: 10, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: purple),
                                      ),
                                      child: Text('LIMITED STOCK', style: inter(size: 9, weight: FontWeight.w800, color: purple, height: 1.0)),
                                    ),
                                  ],
                                ),
                              ),
                              if (imgs.length > 1) ...[
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: _NavBtn(icon: Icons.chevron_left, onTap: () => setState(() => photo = photo == 0 ? imgs.length - 1 : photo - 1)),
                                ),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: _NavBtn(icon: Icons.chevron_right, onTap: () => setState(() => photo = (photo + 1) % imgs.length)),
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (thumbCount > 0) ...[
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 58,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: thumbCount,
                              separatorBuilder: (_, _) => const SizedBox(width: 8),
                              itemBuilder: (_, i) {
                                final overflow = imgs.length > 5 && i == 4;
                                final selected = !overflow && i == photo;
                                return GestureDetector(
                                  onTap: overflow ? null : () => setState(() => photo = i),
                                  child: Container(
                                    width: 58,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: selected ? purple : const Color(0xFFE5E9EF), width: selected ? 2 : 1),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: overflow
                                        ? Stack(
                                            fit: StackFit.expand,
                                            children: [
                                              NetzaImage(imgs[i]),
                                              ColoredBox(
                                                color: const Color(0x99000000),
                                                child: Center(child: Text('+${imgs.length - 4}', style: inter(size: 13, weight: FontWeight.w800, color: Colors.white))),
                                              ),
                                            ],
                                          )
                                        : NetzaImage(imgs[i]),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: purple, borderRadius: BorderRadius.circular(99)),
                          child: Text(categoryName, style: inter(size: 9, weight: FontWeight.w700, color: Colors.white, height: 1.0)),
                        ),
                        const SizedBox(height: 8),
                        Text(product!['name'] ?? '', style: T.pdpTitle),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.star, size: 16, color: Color(0xFFFBBF24)),
                            const SizedBox(width: 4),
                            Text('${showRating.toStringAsFixed(1)} ($showCount reviews)', style: T.rating),
                            const SizedBox(width: 10),
                            const Icon(Icons.inventory_2_outlined, size: 14, color: muted),
                            const SizedBox(width: 4),
                            Text('$sold sold', style: T.rating),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text('$left units left', style: inter(size: 12, weight: FontWeight.w700, color: const Color(0xFF16A34A))),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: fill,
                            minHeight: 6,
                            color: const Color(0xFF22C55E),
                            backgroundColor: const Color(0xFFE9EDF2),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text('Original Price', style: inter(size: 11, color: muted)),
                        Text(
                          money(product!['compareAtKes']),
                          style: inter(size: 14, color: const Color(0xFF8A97A6)).copyWith(decoration: TextDecoration.lineThrough),
                        ),
                        const SizedBox(height: 4),
                        Text('Flash Drop Price', style: inter(size: 11, weight: FontWeight.w700, color: const Color(0xFFE11D48))),
                        Text(money(product!['priceKes']), style: inter(size: 28, weight: FontWeight.w800, color: orange, height: 1.1)),
                        if (saveKes > 0) ...[
                          const SizedBox(height: 8),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(color: const Color(0xFFFFF4D6), borderRadius: BorderRadius.circular(10)),
                            child: Text('You Save ${money(saveKes)} ($discount%)', style: inter(size: 13, weight: FontWeight.w800, color: const Color(0xFFB45309))),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF5F0FF),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFDDD6FE)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.bolt, color: purple, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text.rich(TextSpan(children: [
                                  TextSpan(text: 'Random $discount% Discount Applied: ', style: inter(size: 12, weight: FontWeight.w800, color: navy, height: 1.35)),
                                  TextSpan(text: 'This product was randomly selected for today’s Flash Drop!', style: inter(size: 12, color: navy, height: 1.35)),
                                ])),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        const _FeatureRow(),
                        const SizedBox(height: 14),
                        _TrustList(
                          delivery: 'Tomorrow, ${DateFormat('d MMM').format(d1)} - ${DateFormat('EEE, d MMM').format(d2)}',
                        ),
                        const SizedBox(height: 16),
                        _Tabs(
                          tab: tab,
                          reviews: showCount,
                          onSelect: (t) => setState(() => tab = t),
                        ),
                        const SizedBox(height: 12),
                        if (tab == 'Overview')
                          wide
                              ? Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(child: _Highlights(items: highlights)),
                                    const SizedBox(width: 12),
                                    SizedBox(width: 260, child: _PointsCard(pts: pts)),
                                  ],
                                )
                              : Column(
                                  children: [
                                    _Highlights(items: highlights),
                                    const SizedBox(height: 10),
                                    _PointsCard(pts: pts),
                                  ],
                                )
                        else if (tab == 'Specifications')
                          _Specs(rows: specs)
                        else if (tab == 'What’s in the Box')
                          _BoxList(items: inTheBox)
                        else
                          _Reviews(reviews: reviews, rating: showRating, count: showCount),
                      ],
                    ),
                  ),
                ],
                ),
              ),
            ),
            _Urgency(),
            _Actions(
              busy: busy,
              liked: liked,
              price: product!['priceKes'],
              enabled: left > 0,
              onLike: () => setState(() => liked = !liked),
              onAdd: () => addToCart(),
              onBuy: () => addToCart(buyNow: true),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({this.onShare});
  final VoidCallback? onShare;

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<Session>().cartCount;
    return Row(
      children: [
        IconButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/flash');
            }
          },
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          icon: const Icon(Icons.arrow_back, color: navy, size: 22),
        ),
        const NetzaLogo(),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            'Flash Drop Product',
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: inter(size: 13, weight: FontWeight.w800, color: navy),
          ),
        ),
        InkWell(onTap: onShare, child: const Icon(Icons.share_outlined, color: navy, size: 20)),
        const SizedBox(width: 10),
        InkWell(
          onTap: () => context.push('/cart'),
          child: Badge(
            isLabelVisible: cartCount > 0,
            label: Text('$cartCount', style: inter(size: 9, weight: FontWeight.w700, color: Colors.white)),
            backgroundColor: const Color(0xFFE53935),
            child: const Icon(Icons.shopping_cart_outlined, color: navy, size: 22),
          ),
        ),
      ],
    );
  }
}

class _DropBanner extends StatelessWidget {
  const _DropBanner({required this.remaining, required this.pad, required this.discount});
  final Duration remaining;
  final String Function(int) pad;
  final int discount;

  @override
  Widget build(BuildContext context) {
    final h = pad(remaining.inHours);
    final m = pad(remaining.inMinutes.remainder(60));
    final s = pad(remaining.inSeconds.remainder(60));
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFF4C1D95), Color(0xFF2E1065)],
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.bolt, color: Color(0xFFFFE14D), size: 22),
          const SizedBox(width: 6),
          Text('FLASH DROP', style: inter(size: 12, weight: FontWeight.w800, color: Colors.white, spacing: 0.4)),
          const Spacer(),
          Column(
            children: [
              Text('This drop ends in', style: inter(size: 9, color: const Color(0xFFE9D5FF))),
              const SizedBox(height: 4),
              Row(
                children: [
                  _TimeChip(h, 'HRS'),
                  Padding(padding: const EdgeInsets.symmetric(horizontal: 3), child: Text(':', style: inter(size: 14, weight: FontWeight.w800, color: Colors.white))),
                  _TimeChip(m, 'MINS'),
                  Padding(padding: const EdgeInsets.symmetric(horizontal: 3), child: Text(':', style: inter(size: 14, weight: FontWeight.w800, color: Colors.white))),
                  _TimeChip(s, 'SECS'),
                ],
              ),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('$discount% OFF', style: inter(size: 16, weight: FontWeight.w800, color: const Color(0xFFFFE14D), height: 1.0)),
              Text('Don’t miss out!', style: inter(size: 9, color: Colors.white)),
            ],
          ),
        ],
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  const _TimeChip(this.value, this.label);
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6)),
          child: Text(value, style: inter(size: 13, weight: FontWeight.w800, color: navy, height: 1.0)),
        ),
        const SizedBox(height: 2),
        Text(label, style: inter(size: 7, weight: FontWeight.w700, color: const Color(0xFFC4B5FD), spacing: 0.4)),
      ],
    );
  }
}

class _NavBtn extends StatelessWidget {
  const _NavBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 28,
          height: 28,
          decoration: const BoxDecoration(color: Color(0xE6FFFFFF), shape: BoxShape.circle),
          child: Icon(icon, size: 18, color: navy),
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow();

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.casino_outlined, 'Random Selection', 'Different product every drop.'),
      (Icons.sell_outlined, '50% OFF', 'Automatically applied.'),
      (Icons.inventory_2_outlined, 'Limited Stock', 'First come, first served.'),
      (Icons.verified_user_outlined, 'Secure Payment', 'M-Pesa, Card, Pesapal & Points.'),
      (Icons.emoji_events_outlined, 'Earn Points', 'You’ll earn Netza Points.'),
    ];
    return Row(
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          Expanded(
            child: Column(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(color: const Color(0xFFEEE7FB), borderRadius: BorderRadius.circular(10)),
                  child: Icon(items[i].$1, color: purple, size: 16),
                ),
                const SizedBox(height: 6),
                Text(items[i].$2, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 8, weight: FontWeight.w800, color: navy, height: 1.15)),
                Text(items[i].$3, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 7, color: muted, height: 1.15)),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _TrustList extends StatelessWidget {
  const _TrustList({required this.delivery});
  final String delivery;

  @override
  Widget build(BuildContext context) {
    final rows = [
      (Icons.local_shipping_outlined, 'Estimated Delivery', delivery, 'Nairobi & surrounding areas'),
      (Icons.verified_outlined, '7 Days Easy Returns', 'Change of mind? We’ve got you.', ''),
      (Icons.settings_suggest_outlined, '100% Original', 'Genuine products you can trust.', ''),
    ];
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEEF1F5)),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) const Divider(height: 1, color: Color(0xFFEEF1F5)),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Row(
                children: [
                  Icon(rows[i].$1, color: purple, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(rows[i].$2, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                        Text(rows[i].$3, style: T.memberMeta.copyWith(fontSize: 12)),
                        if (rows[i].$4.isNotEmpty) Text(rows[i].$4, style: T.memberMeta.copyWith(fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.tab, required this.reviews, required this.onSelect});
  final String tab;
  final int reviews;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final labels = ['Overview', 'Specifications', 'What’s in the Box', 'Reviews ($reviews)'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: labels.map((t) {
          final key = t.startsWith('Reviews') ? 'Reviews' : t;
          final on = tab == key || (tab == 'Reviews' && t.startsWith('Reviews'));
          return Padding(
            padding: const EdgeInsets.only(right: 16),
            child: InkWell(
              onTap: () => onSelect(key),
              child: Column(
                children: [
                  Text(t, style: inter(size: 12, weight: on ? FontWeight.w800 : FontWeight.w600, color: on ? purple : muted)),
                  const SizedBox(height: 4),
                  Container(height: 2, width: 28, color: on ? purple : Colors.transparent),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _Highlights extends StatelessWidget {
  const _Highlights({required this.items});
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Product Highlights', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
        const SizedBox(height: 8),
        ...items.map(
          (h) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.check_circle, size: 16, color: Color(0xFF16A34A)),
                const SizedBox(width: 8),
                Expanded(child: Text(h, style: inter(size: 13, color: const Color(0xFF374151), height: 1.3))),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PointsCard extends StatelessWidget {
  const _PointsCard({required this.pts});
  final int pts;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFFF7F8FA), borderRadius: BorderRadius.circular(14)),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.star, color: Color(0xFFFBBF24), size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Earn Points', style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                    Text('You’ll earn $pts Netza Points after purchase', style: T.memberMeta.copyWith(fontSize: 12, height: 1.3)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.account_balance_wallet_outlined, color: orange, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Use Points & Save', style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                    Text('You can redeem points at checkout', style: T.memberMeta.copyWith(fontSize: 12, height: 1.3)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Specs extends StatelessWidget {
  const _Specs({required this.rows});
  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: rows
          .map(
            (r) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(child: Text(r.$1, style: T.memberMeta)),
                  Text(r.$2, style: inter(size: 13, weight: FontWeight.w700, color: navy)),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _BoxList extends StatelessWidget {
  const _BoxList({required this.items});
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: items
          .map(
            (e) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, size: 16, color: purple),
                  const SizedBox(width: 8),
                  Expanded(child: Text(e, style: inter(size: 13, color: navy))),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _Reviews extends StatelessWidget {
  const _Reviews({required this.reviews, required this.rating, required this.count});
  final List reviews;
  final double rating;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(rating.toStringAsFixed(1), style: inter(size: 28, weight: FontWeight.w800, color: navy, height: 1)),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: List.generate(5, (i) => Icon(i < rating.round() ? Icons.star : Icons.star_border, size: 14, color: const Color(0xFFFBBF24)))),
                Text('Based on $count reviews', style: T.memberMeta),
              ],
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (reviews.isEmpty) Text('No written reviews yet.', style: T.memberMeta),
        ...reviews.map((r) {
          final m = r as Map;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${m['author'] ?? ''}  ·  ${m['rating']}/5', style: inter(size: 13, weight: FontWeight.w700, color: navy)),
                Text((m['body'] ?? m['title'] ?? '').toString(), style: T.memberMeta.copyWith(fontSize: 12, height: 1.3)),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _Urgency extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFF5F0FF),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        children: [
          const Icon(Icons.local_fire_department, color: Color(0xFFE11D48), size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Hurry! Stock is limited and the timer is running. Once it’s gone, it’s gone!',
              style: inter(size: 11, weight: FontWeight.w600, color: const Color(0xFF5B21B6), height: 1.25),
            ),
          ),
        ],
      ),
    );
  }
}

class _Actions extends StatelessWidget {
  const _Actions({
    required this.busy,
    required this.liked,
    required this.price,
    required this.enabled,
    required this.onLike,
    required this.onAdd,
    required this.onBuy,
  });
  final bool busy;
  final bool liked;
  final dynamic price;
  final bool enabled;
  final VoidCallback onLike;
  final VoidCallback onAdd;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEEF1F5))),
      ),
      child: Column(
        children: [
          Row(
            children: [
              InkWell(
                onTap: onLike,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: purple),
                  ),
                  child: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? const Color(0xFFE11D48) : purple, size: 20),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SizedBox(
                  height: 44,
                  child: OutlinedButton.icon(
                    onPressed: busy || !enabled ? null : onAdd,
                    icon: const Icon(Icons.shopping_cart_outlined, size: 16),
                    label: Text('ADD TO CART', style: inter(size: 11, weight: FontWeight.w800, color: purple, height: 1.0)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: purple,
                      side: const BorderSide(color: purple, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SizedBox(
                  height: 44,
                  child: FilledButton(
                    onPressed: busy || !enabled ? null : onBuy,
                    style: FilledButton.styleFrom(
                      backgroundColor: purple,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.bolt, size: 14, color: Colors.white),
                            const SizedBox(width: 2),
                            Text('BUY NOW', style: inter(size: 11, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                          ],
                        ),
                        Text(money(price), style: inter(size: 9, weight: FontWeight.w700, color: const Color(0xFFE9D5FF), height: 1.0)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.verified_user, size: 12, color: purple),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  'Safe & Secure Checkout | Pay with M-Pesa, Card, Pesapal or NETZA Points',
                  textAlign: TextAlign.center,
                  style: inter(size: 9, color: muted, height: 1.2),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
