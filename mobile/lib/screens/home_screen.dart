import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../data/shop_categories.dart';
import '../state/session.dart';
import '../widgets/storefront_chrome.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final search = TextEditingController();
  final page = PageController();
  List trending = [];
  List moreProducts = [];
  Map? flash;
  List flashProducts = [];
  int slide = 0;
  String? error;
  int? challengeChoice;
  Timer? _ticker;
  Duration remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    load();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    search.dispose();
    page.dispose();
    _ticker?.cancel();
    super.dispose();
  }

  void _tick() {
    if (flash == null) return;
    final end = DateTime.tryParse(flash!['endsAt']?.toString() ?? '');
    if (end == null) return;
    final next = end.difference(DateTime.now());
    setState(() => remaining = next.isNegative ? Duration.zero : next);
  }

  Future<void> load() async {
    final session = context.read<Session>();
    try {
      final results = await Future.wait([
        session.dio.get('/products', queryParameters: {'trending': 'true', 'limit': 12}),
        session.dio.get('/flash-drops/active'),
        session.dio.get('/products', queryParameters: {'limit': 12}),
      ]);
      if (session.isLoggedIn) {
        await session.refreshWallet();
        await session.refreshCart();
      }
      final trend = (results[0].data['products'] as List?) ?? [];
      final all = (results[2].data['products'] as List?) ?? [];
      final trendIds = {
        for (final p in trend)
          if (p is Map && p['id'] != null) p['id'].toString(),
      };
      final extras = all.where((p) {
        if (p is! Map) return false;
        final id = p['id']?.toString();
        return id != null && !trendIds.contains(id);
      }).toList();
      setState(() {
        trending = trend.isNotEmpty ? trend : all;
        moreProducts = trend.isNotEmpty ? extras.take(8).toList() : all.skip(6).take(8).toList();
        flash = results[1].data['flashDrop'];
        flashProducts = results[1].data['products'] as List? ?? [];
        error = null;
      });
      _tick();
    } catch (e) {
      setState(() => error = apiMessage(e));
    }
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      drawer: const NetzaDrawer(),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: orange,
          onRefresh: load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              const StorefrontHeader(),
              const SizedBox(height: 12),
              StorefrontSearchBar(
                controller: search,
                onSearch: () {
                  final q = search.text.trim();
                  context.push('/catalog?q=${Uri.encodeQueryComponent(q)}');
                },
              ),
              const SizedBox(height: 10),
              const DeliverToRow(),
              const SizedBox(height: 12),
              const LoyaltyCard(),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(error!, style: inter(size: 13, color: Colors.red)),
                ),
              const SizedBox(height: 14),
              _FlashDropBanner(
                page: page,
                slide: slide,
                onSlide: (i) => setState(() => slide = i),
                remaining: remaining,
                pad: _pad,
                images: flashProducts.map(_firstImage).whereType<String>().toList(),
                discount: flash?['discountPercent'] ?? 50,
                onView: () => context.push('/flash'),
              ),
              const SizedBox(height: 18),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: homeQuickCats.length + 1,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 5,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 4,
                  childAspectRatio: 0.68,
                ),
                itemBuilder: (_, i) {
                  if (i == homeQuickCats.length) {
                    return InkWell(
                      onTap: () => context.go('/shop'),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          Container(
                            width: 50,
                            height: 50,
                            decoration: const BoxDecoration(color: Color(0xFFEAF3FB), shape: BoxShape.circle),
                            child: const Icon(Icons.apps, color: navy, size: 24),
                          ),
                          const SizedBox(height: 4),
                          Flexible(
                            child: Text('SEE ALL', textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis, style: T.homeCat),
                          ),
                        ],
                      ),
                    );
                  }
                  final c = homeQuickCats[i];
                  return InkWell(
                    onTap: () => context.push(c.route),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          clipBehavior: Clip.antiAlias,
                          child: NetzaImage(c.imageUrl, fallback: c.icon),
                        ),
                        const SizedBox(height: 4),
                        Flexible(
                          child: Text(
                            _homeCatLabel(c.name),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: T.homeCat,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              _ChallengeCard(
                selected: challengeChoice,
                cameraUrl: flashProducts.isNotEmpty ? _firstImage(flashProducts.first) : null,
                onSelect: (i) => setState(() => challengeChoice = i),
                onPlay: () {
                  if (challengeChoice == null) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick an answer first')));
                    return;
                  }
                  final correct = challengeChoice == 0;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(correct
                        ? 'Correct — Dome camera. Challenge points go live in Phase 4.'
                        : 'Not quite. The camera shown is a Dome.'),
                  ));
                },
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(child: Text('Recommended For You', style: T.section.copyWith(fontSize: 17))),
                  TextButton(
                    onPressed: () => context.go('/shop'),
                    child: Text('See all', style: T.seeAll),
                  ),
                ],
              ),
              if (trending.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Text('No products yet. Pull to refresh.', style: inter(size: 13, color: muted)),
                )
              else
                SizedBox(
                  height: 220,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: trending.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 12),
                    itemBuilder: (_, i) {
                      final p = Map<String, dynamic>.from(trending[i] as Map);
                      final img = _firstImage(p);
                      return InkWell(
                        onTap: () => context.push('/product/${p['id']}'),
                        child: Container(
                          width: 148,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFEEF1F5)),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Stack(
                                  children: [
                                    Positioned.fill(child: NetzaImage(img)),
                                    const Positioned(
                                      top: 8,
                                      right: 8,
                                      child: Icon(Icons.favorite_border, color: muted, size: 20),
                                    ),
                                  ],
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(p['name'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: T.productTitle),
                                    const SizedBox(height: 4),
                                    Text(money(p['priceKes']), style: T.price),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              if (moreProducts.isNotEmpty) ...[
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(child: Text('More picks', style: T.section.copyWith(fontSize: 17))),
                    TextButton(
                      onPressed: () => context.push('/catalog'),
                      child: Text('Browse', style: T.seeAll),
                    ),
                  ],
                ),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: moreProducts.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72,
                  ),
                  itemBuilder: (_, i) {
                    final p = Map<String, dynamic>.from(moreProducts[i] as Map);
                    final img = _firstImage(p);
                    return InkWell(
                      onTap: () => context.push('/product/${p['id']}'),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFEEF1F5)),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  NetzaImage(img),
                                  const Positioned(
                                    top: 8,
                                    right: 8,
                                    child: Icon(Icons.favorite_border, color: muted, size: 20),
                                  ),
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p['name'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: T.productTitle),
                                  const SizedBox(height: 4),
                                  Text(money(p['priceKes']), style: T.price),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _FlashDropBanner extends StatelessWidget {
  const _FlashDropBanner({
    required this.page,
    required this.slide,
    required this.onSlide,
    required this.remaining,
    required this.pad,
    required this.images,
    required this.discount,
    required this.onView,
  });
  final PageController page;
  final int slide;
  final ValueChanged<int> onSlide;
  final Duration remaining;
  final String Function(int) pad;
  final List<String> images;
  final int discount;
  final VoidCallback onView;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: 186,
          child: PageView(
            controller: page,
            onPageChanged: onSlide,
            children: [
              _FlashSlide(remaining: remaining, pad: pad, images: images, discount: discount, onView: onView),
              _PromoSlide(
                title: 'NETWORKING WEEK',
                subtitle: 'Routers, switches & APs',
                cta: 'Shop now',
                onTap: () => context.push('/catalog?category=networking'),
              ),
              _PromoSlide(
                title: 'EARN POINTS DAILY',
                subtitle: 'Login, shop and review',
                cta: 'Open wallet',
                onTap: () => context.go('/points'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (i) {
            final active = i == slide;
            return Container(
              width: active ? 16 : 7,
              height: 7,
              margin: const EdgeInsets.symmetric(horizontal: 3),
              decoration: BoxDecoration(
                color: active ? orange : const Color(0xFFD8DEE6),
                borderRadius: BorderRadius.circular(8),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _FlashSlide extends StatelessWidget {
  const _FlashSlide({required this.remaining, required this.pad, required this.images, required this.discount, required this.onView});
  final Duration remaining;
  final String Function(int) pad;
  final List<String> images;
  final int discount;
  final VoidCallback onView;

  @override
  Widget build(BuildContext context) {
    final h = pad(remaining.inHours);
    final m = pad(remaining.inMinutes.remainder(60));
    final s = pad(remaining.inSeconds.remainder(60));
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF0B1F3A), Color(0xFF163A66)]),
        borderRadius: BorderRadius.circular(18),
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 10, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: orange, borderRadius: BorderRadius.circular(6)),
                  child: Text('FLASH DROP', style: T.flashBadge),
                ),
                const SizedBox(height: 6),
                Text.rich(TextSpan(children: [
                  TextSpan(text: 'UP TO ', style: T.flashUpTo),
                  TextSpan(text: '$discount% OFF', style: T.flashOff),
                ])),
                Text('Random products every day!', style: T.flashSub),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _TimeBox(h, 'HRS'),
                    Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(':', style: inter(size: 14, weight: FontWeight.w800, color: Colors.white))),
                    _TimeBox(m, 'MINS'),
                    Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(':', style: inter(size: 14, weight: FontWeight.w800, color: Colors.white))),
                    _TimeBox(s, 'SECS'),
                  ],
                ),
                const Spacer(),
                SizedBox(
                  height: 30,
                  child: OutlinedButton(
                    onPressed: onView,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: navy,
                      backgroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      side: BorderSide.none,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text('View Deals', style: T.viewDeals),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 132,
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: List.generate(4, (i) {
                final url = i < images.length ? images[i] : null;
                return Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                  clipBehavior: Clip.antiAlias,
                  child: NetzaImage(url),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeBox extends StatelessWidget {
  const _TimeBox(this.value, this.label);
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 30,
          height: 22,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4)),
          child: Text(value, style: T.timer),
        ),
        const SizedBox(height: 2),
        Text(label, style: T.timerLabel),
      ],
    );
  }
}

class _PromoSlide extends StatelessWidget {
  const _PromoSlide({required this.title, required this.subtitle, required this.cta, required this.onTap});
  final String title;
  final String subtitle;
  final String cta;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF0B1F3A), Color(0xFF1C4A7A)]),
        borderRadius: BorderRadius.circular(18),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: inter(size: 20, weight: FontWeight.w800, color: Colors.white)),
          Text(subtitle, style: T.flashSub),
          const Spacer(),
          FilledButton(onPressed: onTap, child: Text(cta, style: T.searchBtn)),
        ],
      ),
    );
  }
}

class _ChallengeCard extends StatelessWidget {
  const _ChallengeCard({required this.selected, required this.onSelect, required this.onPlay, this.cameraUrl});
  final int? selected;
  final ValueChanged<int> onSelect;
  final VoidCallback onPlay;
  final String? cameraUrl;
  static const options = ['A. Dome', 'B. Bullet', 'C. PTZ', 'D. Turret'];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E8),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFFE0C2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.emoji_events, color: orange),
              const SizedBox(width: 6),
              Text('NETZA CHALLENGE', style: T.challengeTitle),
              const Spacer(),
              Text('Win 500 Points!', style: T.challengeWin),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                clipBehavior: Clip.antiAlias,
                child: NetzaImage(cameraUrl, fallback: Icons.videocam),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text('Identify this CCTV camera type?', style: T.quiz)),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(options.length, (i) {
              final on = selected == i;
              return ChoiceChip(
                label: Text(options[i]),
                selected: on,
                onSelected: (_) => onSelect(i),
                selectedColor: orange,
                labelStyle: T.chip.copyWith(color: on ? Colors.white : navy),
                backgroundColor: Colors.white,
                side: BorderSide(color: on ? orange : const Color(0xFFE5E7EB)),
              );
            }),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              onPressed: onPlay,
              style: FilledButton.styleFrom(
                backgroundColor: navy,
                minimumSize: const Size(110, 40),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text('Play Now', style: T.playNow),
            ),
          ),
        ],
      ),
    );
  }
}

String? _firstImage(dynamic product) {
  final images = product is Map ? product['images'] : null;
  if (images is List && images.isNotEmpty) {
    final first = images.first;
    if (first is Map && first['url'] != null) return first['url'].toString();
    return first.toString();
  }
  if (product is Map && product['image'] != null) return product['image'].toString();
  return null;
}

String _homeCatLabel(String name) {
  switch (name) {
    case 'Access Control':
      return 'Access';
    case 'Access Points':
      return 'APs';
    case 'Power & UPS':
      return 'Power';
    default:
      return name;
  }
}
