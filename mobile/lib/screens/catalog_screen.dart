import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../data/category_chips.dart';
import '../data/shop_categories.dart';
import '../state/session.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/catalog_product_card.dart';
import '../widgets/storefront_chrome.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key, this.category, this.query, this.flash = false});
  final String? category;
  final String? query;
  final bool flash;

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final search = TextEditingController();
  List products = [];
  String? error;
  int total = 0;
  String? categoryLabel;
  int chipIndex = 0;
  String sort = 'popular';
  final liked = <String>{};
  Map? flashDrop;
  Duration remaining = Duration.zero;
  Timer? ticker;

  List<FilterChipItem> get chips => chipsFor(category: widget.category, query: widget.query, flash: widget.flash);

  @override
  void initState() {
    super.initState();
    if (widget.query != null && widget.query!.isNotEmpty) search.text = widget.query!;
    load();
    ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void didUpdateWidget(covariant CatalogScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.category != widget.category || oldWidget.query != widget.query || oldWidget.flash != widget.flash) {
      chipIndex = 0;
      load();
    }
  }

  @override
  void dispose() {
    search.dispose();
    ticker?.cancel();
    super.dispose();
  }

  void _tick() {
    if (flashDrop == null) return;
    final end = DateTime.tryParse(flashDrop!['endsAt']?.toString() ?? '');
    if (end == null) return;
    final next = end.difference(DateTime.now());
    setState(() => remaining = next.isNegative ? Duration.zero : next);
  }

  String get title {
    if (widget.flash) return 'Flash Drop';
    if (categoryLabel != null && categoryLabel!.isNotEmpty) return categoryLabel!;
    final match = shopCategories.where((c) => c.slug == widget.category);
    if (match.isNotEmpty) return match.first.name;
    if (widget.query != null && widget.query!.isNotEmpty) return widget.query!;
    return 'Catalog';
  }

  String get countLabel => '$total products';

  Future<void> load() async {
    final session = context.read<Session>();
    final chip = chips[chipIndex.clamp(0, chips.length - 1)];
    try {
      if (widget.category != null && widget.category!.isNotEmpty) {
        try {
          final catRes = await session.dio.get('/categories');
          final cats = catRes.data['categories'] as List? ?? [];
          for (final raw in cats) {
            final c = Map<String, dynamic>.from(raw as Map);
            if (c['slug']?.toString() == widget.category) {
              categoryLabel = c['name']?.toString();
              break;
            }
          }
        } catch (_) {}
      }

      final flashRes = await session.dio.get('/flash-drops/active');
      flashDrop = flashRes.data['flashDrop'];
      _tick();

      if (widget.flash && (chip.query == null || chipIndex == 0)) {
        final list = flashRes.data['products'] as List? ?? [];
        setState(() {
          products = _sorted(list);
          total = list.length;
          error = null;
        });
        return;
      }

      final q = search.text.trim().isNotEmpty
          ? search.text.trim()
          : (chip.query ?? widget.query);
      final res = await session.dio.get('/products', queryParameters: {
        if (widget.category != null && !widget.flash) 'category': widget.category,
        if (q != null && q.isNotEmpty) 'q': q,
        'limit': 100,
      });
      final list = res.data['products'] as List;
      setState(() {
        products = _sorted(list);
        total = res.data['total'] ?? list.length;
        error = null;
      });
    } catch (e) {
      setState(() => error = apiMessage(e));
    }
  }

  List _sorted(List list) {
    final copy = [...list];
    if (sort == 'price_asc') {
      copy.sort((a, b) => ((a as Map)['priceKes'] as num).compareTo((b as Map)['priceKes'] as num));
    } else if (sort == 'price_desc') {
      copy.sort((a, b) => ((b as Map)['priceKes'] as num).compareTo((a as Map)['priceKes'] as num));
    } else if (sort == 'rating') {
      copy.sort((a, b) => ((b as Map)['ratingAvg'] as num? ?? 0).compareTo((a as Map)['ratingAvg'] as num? ?? 0));
    }
    return copy;
  }

  Future<void> _add(Map product) async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      context.push('/login');
      return;
    }
    try {
      await session.dio.post('/cart/items', data: {'productId': product['id'], 'quantity': 1});
      await session.refreshCart();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    }
  }

  void _sortSheet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(title: Text('Popular', style: inter(weight: FontWeight.w600)), onTap: () { setState(() => sort = 'popular'); Navigator.pop(context); load(); }),
            ListTile(title: Text('Price: low to high', style: inter(weight: FontWeight.w600)), onTap: () { setState(() => sort = 'price_asc'); Navigator.pop(context); load(); }),
            ListTile(title: Text('Price: high to low', style: inter(weight: FontWeight.w600)), onTap: () { setState(() => sort = 'price_desc'); Navigator.pop(context); load(); }),
            ListTile(title: Text('Top rated', style: inter(weight: FontWeight.w600)), onTap: () { setState(() => sort = 'rating'); Navigator.pop(context); load(); }),
          ],
        ),
      ),
    );
  }

  void _filterSheet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Filter', style: T.section.copyWith(fontSize: 18)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  ActionChip(label: const Text('Flash Drop only'), onPressed: () { Navigator.pop(context); context.push('/flash'); }),
                  ActionChip(label: const Text('Reset'), onPressed: () { Navigator.pop(context); setState(() { chipIndex = 0; search.clear(); }); load(); }),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const TajiraBottomNav(currentIndex: 1),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 16, 0),
              child: Column(
                children: [
                  const StorefrontHeader(leading: HeaderLeading.back),
                  const SizedBox(height: 10),
                  StorefrontSearchBar(
                    controller: search,
                    hint: 'Search in $title',
                    trailing: SearchTrailing.scan,
                    onSearch: load,
                  ),
                  const SizedBox(height: 10),
                  const DeliverToRow(),
                ],
              ),
            ),
            Expanded(
              child: error != null
                  ? Center(child: Text(error!))
                  : CustomScrollView(
                      slivers: [
                        const SliverPadding(
                          padding: EdgeInsets.fromLTRB(16, 12, 16, 0),
                          sliver: SliverToBoxAdapter(child: LoyaltyCard()),
                        ),
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          sliver: SliverToBoxAdapter(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(title, style: T.section),
                                      Text(countLabel, style: T.catCount),
                                    ],
                                  ),
                                ),
                                _IconAction(icon: Icons.swap_vert, label: 'Sort', onTap: _sortSheet),
                                const SizedBox(width: 12),
                                _IconAction(icon: Icons.tune, label: 'Filter', onTap: _filterSheet),
                              ],
                            ),
                          ),
                        ),
                        SliverToBoxAdapter(
                          child: SizedBox(
                            height: 40,
                            child: ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              scrollDirection: Axis.horizontal,
                              itemCount: chips.length,
                              separatorBuilder: (_, _) => const SizedBox(width: 8),
                              itemBuilder: (_, i) {
                                final on = i == chipIndex;
                                final chip = chips[i];
                                return ChoiceChip(
                                  label: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(chip.label),
                                      if (chip.label == 'More') const Icon(Icons.keyboard_arrow_down, size: 16),
                                    ],
                                  ),
                                  selected: on,
                                  showCheckmark: false,
                                  onSelected: (_) {
                                    if (chip.label == 'More') {
                                      _filterSheet();
                                      return;
                                    }
                                    setState(() => chipIndex = i);
                                    load();
                                  },
                                  selectedColor: Colors.white,
                                  labelStyle: on ? T.chipActive : T.chipIdle,
                                  side: BorderSide(color: on ? orange : const Color(0xFFD5DBE3)),
                                  backgroundColor: Colors.white,
                                );
                              },
                            ),
                          ),
                        ),
                        if (flashDrop != null && !widget.flash)
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                            sliver: SliverToBoxAdapter(
                              child: _ListingFlashBanner(
                                remaining: remaining,
                                pad: _pad,
                                discount: flashDrop?['discountPercent'] ?? 50,
                                onView: () => context.push('/flash'),
                              ),
                            ),
                          ),
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                          sliver: SliverGrid(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              mainAxisSpacing: 12,
                              crossAxisSpacing: 12,
                              childAspectRatio: 0.58,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (_, i) {
                                final p = Map<String, dynamic>.from(products[i] as Map);
                                final id = p['id'].toString();
                                return CatalogProductCard(
                                  product: p,
                                  liked: liked.contains(id),
                                  onLike: () => setState(() => liked.contains(id) ? liked.remove(id) : liked.add(id)),
                                  onAdd: () => _add(p),
                                );
                              },
                              childCount: products.length,
                            ),
                          ),
                        ),
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                          sliver: SliverToBoxAdapter(
                            child: InkWell(
                              onTap: () => context.go('/points'),
                              child: Container(
                                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF5F0FF),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFDDD0F5)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.monetization_on, color: purple),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text.rich(
                                        TextSpan(children: [
                                          TextSpan(text: 'You will earn ', style: T.pointsBanner),
                                          TextSpan(text: 'Tajira Points', style: T.pointsBanner.copyWith(fontWeight: FontWeight.w700)),
                                          TextSpan(text: ' with every purchase. ', style: T.pointsBanner),
                                          TextSpan(text: '1 Point = KSh 10', style: T.pointsBanner.copyWith(fontWeight: FontWeight.w800)),
                                        ]),
                                      ),
                                    ),
                                    Text('How it works >', style: T.howItWorks),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IconAction extends StatelessWidget {
  const _IconAction({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, size: 20, color: navy),
          Text(label, style: T.sortFilter),
        ],
      ),
    );
  }
}

class _ListingFlashBanner extends StatelessWidget {
  const _ListingFlashBanner({required this.remaining, required this.pad, required this.discount, required this.onView});
  final Duration remaining;
  final String Function(int) pad;
  final int discount;
  final VoidCallback onView;

  @override
  Widget build(BuildContext context) {
    final h = pad(remaining.inHours);
    final m = pad(remaining.inMinutes.remainder(60));
    final s = pad(remaining.inSeconds.remainder(60));
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFFFF3E8), Color(0xFFFFE4C7)]),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: orange, borderRadius: BorderRadius.circular(6)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.bolt, color: Colors.white, size: 12),
                      const SizedBox(width: 2),
                      Text('FLASH DROP', style: T.flashBadge),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Text('Up to $discount% OFF', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                Text('Random products every day!', style: T.memberMeta),
              ],
            ),
          ),
          Column(
            children: [
              Text('Ends in', style: T.memberMeta),
              const SizedBox(height: 4),
              Row(
                children: [
                  _OrangeTime(h),
                  Text(' : ', style: inter(size: 12, weight: FontWeight.w800, color: navy)),
                  _OrangeTime(m),
                  Text(' : ', style: inter(size: 12, weight: FontWeight.w800, color: navy)),
                  _OrangeTime(s),
                ],
              ),
              Text('Hrs      Mins      Secs', style: inter(size: 8, weight: FontWeight.w600, color: muted)),
              const SizedBox(height: 6),
              FilledButton(
                onPressed: onView,
                style: FilledButton.styleFrom(
                  backgroundColor: navy,
                  minimumSize: const Size(0, 32),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Text('View Deals >', style: T.playNow),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OrangeTime extends StatelessWidget {
  const _OrangeTime(this.value);
  final String value;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFFE86A00), borderRadius: BorderRadius.circular(4)),
      child: Text(value, style: inter(size: 12, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
    );
  }
}
