import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/storefront_chrome.dart';

class FlashDropScreen extends StatefulWidget {
  const FlashDropScreen({super.key});

  @override
  State<FlashDropScreen> createState() => _FlashDropScreenState();
}

class _FlashDropScreenState extends State<FlashDropScreen> {
  final howKey = GlobalKey();
  Timer? ticker;
  bool loading = true;
  bool notifyMe = true;
  String tab = 'Upcoming Drops';
  String? error;
  Map? flashDrop;
  List products = [];
  Duration nextDrop = const Duration(hours: 0, minutes: 28, seconds: 45);
  Duration liveEnds = Duration.zero;

  static const collage = [
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
  ];

  static const winners = [
    _Winner('Brian K.', 'Oraimo FreePods 4', 2500, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80'),
    _Winner('Sharon A.', 'Smart Fitness Watch', 4500, 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=80'),
    _Winner('Kevin O.', 'Kitchen Blender Pro', 3200, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'),
    _Winner('Mercy W.', '20,000mAh Power Bank', 2100, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=200&q=80'),
  ];

  static const past = [
    _Past('Home Power Drop', 'Power & UPS', 'Yesterday', 9800, 4900),
    _Past('CCTV Surprise Drop', 'CCTV & Security', '2 days ago', 17800, 8900),
    _Past('Cabling Bundle Drop', 'Cabling', 'Last week', 8400, 4200),
  ];

  @override
  void initState() {
    super.initState();
    load();
    ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (nextDrop.inSeconds > 0) nextDrop -= const Duration(seconds: 1);
        if (liveEnds.inSeconds > 0) liveEnds -= const Duration(seconds: 1);
      });
    });
  }

  @override
  void dispose() {
    ticker?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final res = await context.read<Session>().dio.get('/flash-drops/active');
      final drop = res.data['flashDrop'] as Map?;
      final list = (res.data['products'] as List?) ?? [];
      DateTime? ends;
      if (drop?['endsAt'] != null) ends = DateTime.tryParse(drop!['endsAt'].toString());
      final now = DateTime.now();
      setState(() {
        flashDrop = drop;
        products = list;
        liveEnds = ends == null ? Duration.zero : (ends.difference(now).isNegative ? Duration.zero : ends.difference(now));
        error = null;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  void scrollToHow() {
    final ctx = howKey.currentContext;
    if (ctx == null) return;
    Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 420), curve: Curves.easeOutCubic);
  }

  void toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void setNotify(bool on) {
    setState(() => notifyMe = on);
    toast(on ? 'You will be notified before every Flash Drop' : 'Flash Drop notifications turned off');
  }

  Future<void> addToCart(Map product) async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      context.push('/login');
      return;
    }
    try {
      await session.dio.post('/cart/items', data: {'productId': product['id'], 'quantity': 1});
      await session.refreshCart();
      if (!mounted) return;
      toast('Added to cart');
    } catch (e) {
      if (mounted) toast(apiMessage(e));
    }
  }

  String? _img(Map product) {
    final images = product['images'];
    if (images is List && images.isNotEmpty) return images.first.toString();
    return null;
  }

  int _left(Map product) {
    final flash = product['flashDrop'];
    if (flash is Map && flash['remainingQty'] != null) return (flash['remainingQty'] as num).toInt();
    return (product['stock'] as num?)?.toInt() ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const TajiraBottomNav(currentIndex: 3),
      body: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(4, 4, 12, 0),
              child: _FlashHeader(),
            ),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator(color: orange))
                  : RefreshIndicator(
                      color: orange,
                      onRefresh: load,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 88),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                          if (error != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(error!, style: inter(size: 13, color: Colors.red)),
                            ),
                          _HeroBanner(
                            remaining: nextDrop,
                            pad: _pad,
                            onHow: scrollToHow,
                          ),
                          const SizedBox(height: 12),
                          const _Highlights(),
                          const SizedBox(height: 14),
                          _Tabs(
                            tab: tab,
                            notifyMe: notifyMe,
                            onTab: (t) => setState(() => tab = t),
                            onNotify: setNotify,
                          ),
                          const SizedBox(height: 12),
                          if (tab == 'Upcoming Drops')
                            _FeaturedDrop(
                              remaining: nextDrop,
                              pad: _pad,
                              images: collage,
                              onRemind: () {
                                setNotify(true);
                                toast('We’ll remind you before Tech Surprise Drop begins');
                              },
                            )
                          else if (tab == 'Past Drops')
                            ...past.map((p) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _PastCard(drop: p),
                                ))
                          else if (products.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 28),
                              child: Center(child: Text('No active drops right now. Check Upcoming.', style: T.memberMeta)),
                            )
                          else
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: products.map((p) {
                                final m = Map<String, dynamic>.from(p as Map);
                                return SizedBox(
                                  width: (MediaQuery.sizeOf(context).width - 42) / 2,
                                  height: 326,
                                  child: _LiveCard(
                                    product: m,
                                    image: _img(m),
                                    left: _left(m),
                                    discount: (flashDrop?['discountPercent'] as num?)?.toInt() ?? 50,
                                    onAdd: () => addToCart(m),
                                  ),
                                );
                              }).toList(),
                            ),
                          if (tab != 'Past Drops' && tab != 'Active Drops') ...[
                            const SizedBox(height: 18),
                            _LiveNow(
                              remaining: liveEnds,
                              pad: _pad,
                              products: products,
                              discount: (flashDrop?['discountPercent'] as num?)?.toInt() ?? 50,
                              img: _img,
                              left: _left,
                              onAdd: addToCart,
                              onViewAll: () => setState(() => tab = 'Active Drops'),
                            ),
                          ],
                          const SizedBox(height: 18),
                          _HowItWorks(key: howKey),
                          const SizedBox(height: 18),
                          _Winners(
                            winners: winners,
                            onViewAll: () => toast('Showing latest Flash Drop winners'),
                          ),
                          const SizedBox(height: 16),
                          _NotifyCta(onEnable: () => setNotify(true)),
                        ],
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FlashHeader extends StatelessWidget {
  const _FlashHeader();

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
              context.go('/');
            }
          },
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          icon: const Icon(Icons.arrow_back, color: navy, size: 22),
        ),
        const TajiraLogo(),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            children: [
              Text(
                'TAJIRA FLASH DROP ⚡',
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: inter(size: 12, weight: FontWeight.w800, color: navy, height: 1.15),
              ),
              Text(
                'Random 50% Discounts. Big Surprises!',
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: T.memberMeta.copyWith(fontSize: 9),
              ),
            ],
          ),
        ),
        InkWell(
          onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No new notifications'))),
          child: const Badge(
            smallSize: 8,
            backgroundColor: Color(0xFFE53935),
            child: Icon(Icons.notifications_outlined, color: navy, size: 22),
          ),
        ),
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

class _HeroBanner extends StatelessWidget {
  const _HeroBanner({required this.remaining, required this.pad, required this.onHow});
  final Duration remaining;
  final String Function(int) pad;
  final VoidCallback onHow;

  @override
  Widget build(BuildContext context) {
    final h = pad(remaining.inHours);
    final m = pad(remaining.inMinutes.remainder(60));
    final s = pad(remaining.inSeconds.remainder(60));
    return Container(
      height: 188,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF4C1D95), Color(0xFF2E1065), Color(0xFF1E1B4B)],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          ..._confetti,
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 8, 14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('NEXT FLASH DROP IN', style: inter(size: 10, weight: FontWeight.w700, color: const Color(0xFFE9D5FF), spacing: 0.6)),
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _HeroTick(h, 'HRS'),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 2, 4, 0),
                            child: Text(':', style: inter(size: 26, weight: FontWeight.w800, color: orange)),
                          ),
                          _HeroTick(m, 'MINS'),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 2, 4, 0),
                            child: Text(':', style: inter(size: 26, weight: FontWeight.w800, color: orange)),
                          ),
                          _HeroTick(s, 'SECS'),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Get ready! Amazing products. Random 50% OFF!',
                        style: inter(size: 11, weight: FontWeight.w400, color: const Color(0xFFDDD6FE), height: 1.25),
                      ),
                      const Spacer(),
                      OutlinedButton.icon(
                        onPressed: onHow,
                        icon: const Icon(Icons.play_circle_outline, size: 16, color: Colors.white),
                        label: Text('How it Works', style: inter(size: 11, weight: FontWeight.w700, color: Colors.white, height: 1.0)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white),
                          minimumSize: const Size(0, 32),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),
                const _GiftArt(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

const _confetti = [
  Positioned(top: 12, left: 92, child: _Dot(Color(0xFFFFE14D), 6)),
  Positioned(top: 28, left: 48, child: _Dot(Color(0xFFF472B6), 5)),
  Positioned(top: 18, right: 120, child: _Dot(Color(0xFF34D399), 5)),
  Positioned(bottom: 28, left: 22, child: _Dot(Color(0xFF60A5FA), 6)),
  Positioned(top: 8, right: 36, child: _Dot(Color(0xFFFF7A00), 7)),
  Positioned(bottom: 16, right: 88, child: _Dot(Color(0xFFFFE14D), 4)),
  Positioned(top: 70, left: 8, child: _Dot(Color(0xFFC4B5FD), 4)),
];

class _Dot extends StatelessWidget {
  const _Dot(this.color, this.size);
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _HeroTick extends StatelessWidget {
  const _HeroTick(this.value, this.label);
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
                Text(value, style: inter(size: 28, weight: FontWeight.w800, color: orange, height: 1.0)),
        const SizedBox(height: 2),
        Text(label, style: inter(size: 8, weight: FontWeight.w700, color: const Color(0xFFC4B5FD), spacing: 0.6)),
      ],
    );
  }
}

class _GiftArt extends StatelessWidget {
  const _GiftArt();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 128,
      height: 150,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: 18,
            top: 36,
            child: Container(
              width: 86,
              height: 78,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF7C3AED), Color(0xFF4C1D95)],
                ),
                boxShadow: const [BoxShadow(color: Color(0x66000000), blurRadius: 12, offset: Offset(0, 6))],
              ),
              child: const Center(child: Icon(Icons.bolt, color: Color(0xFFFFE14D), size: 48)),
            ),
          ),
          Positioned(
            left: 10,
            top: 22,
            child: Transform.rotate(
              angle: -0.08,
              child: Container(
                width: 102,
                height: 22,
                decoration: BoxDecoration(
                  color: const Color(0xFF8B5CF6),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFC4B5FD), width: 1.5),
                ),
              ),
            ),
          ),
          const Positioned(left: 2, top: 48, child: Icon(Icons.crop_square, color: Color(0xFF60A5FA), size: 16)),
          const Positioned(right: 8, top: 40, child: Icon(Icons.circle, color: Color(0xFFF472B6), size: 10)),
          const Positioned(right: 18, top: 18, child: Icon(Icons.change_history, color: Color(0xFFFFE14D), size: 14)),
          Positioned(
            right: 0,
            bottom: 8,
            child: Container(
              width: 58,
              height: 58,
              decoration: const BoxDecoration(
                color: Color(0xFFFFE14D),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: Color(0x66FBBF24), blurRadius: 10)],
              ),
              alignment: Alignment.center,
              child: Text('50%\nOFF', textAlign: TextAlign.center, style: inter(size: 12, weight: FontWeight.w800, color: navy, height: 1.05)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Highlights extends StatelessWidget {
  const _Highlights();

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.casino_outlined, 'Random Products', 'Different every drop'),
      (Icons.sell_outlined, 'Only 50% OFF', 'Automatically applied'),
      (Icons.card_giftcard_outlined, 'Limited Stock', 'First come, first serve'),
      (Icons.bolt, 'Don’t Miss Out', 'New drops often!'),
    ];
    return Row(
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          Expanded(
            child: Container(
              padding: const EdgeInsets.fromLTRB(4, 10, 4, 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFDDD6FE)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(color: Color(0xFFEEE7FB), shape: BoxShape.circle),
                    child: Icon(items[i].$1, color: purple, size: 16),
                  ),
                  const SizedBox(height: 6),
                  Text(items[i].$2, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 9, weight: FontWeight.w800, color: navy, height: 1.15)),
                  Text(items[i].$3, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 8, weight: FontWeight.w400, color: muted, height: 1.15)),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.tab, required this.notifyMe, required this.onTab, required this.onNotify});
  final String tab;
  final bool notifyMe;
  final ValueChanged<String> onTab;
  final ValueChanged<bool> onNotify;

  @override
  Widget build(BuildContext context) {
    const labels = ['Upcoming Drops', 'Active Drops', 'Past Drops'];
    return Row(
      children: [
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: labels.map((t) {
                final on = tab == t;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: InkWell(
                    onTap: () => onTab(t),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: on ? purple : const Color(0xFFF1F3F6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        t,
                        style: inter(size: 10, weight: FontWeight.w700, color: on ? Colors.white : muted, height: 1.0),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        const SizedBox(width: 4),
        Text('Notify Me', style: inter(size: 10, weight: FontWeight.w600, color: navy)),
        SizedBox(
          height: 28,
          child: Switch(
            value: notifyMe,
            onChanged: onNotify,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            thumbColor: WidgetStateProperty.resolveWith((s) => Colors.white),
            trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? purple : const Color(0xFFD5DBE3)),
          ),
        ),
      ],
    );
  }
}

class _FeaturedDrop extends StatelessWidget {
  const _FeaturedDrop({required this.remaining, required this.pad, required this.images, required this.onRemind});
  final Duration remaining;
  final String Function(int) pad;
  final List<String> images;
  final VoidCallback onRemind;

  @override
  Widget build(BuildContext context) {
    final clock = '${pad(remaining.inHours)} : ${pad(remaining.inMinutes.remainder(60))} : ${pad(remaining.inSeconds.remainder(60))}';
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E1538),
        borderRadius: BorderRadius.circular(18),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              SizedBox(
                height: 168,
                width: double.infinity,
                child: Column(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Expanded(child: TajiraImage(images[0], fallback: Icons.watch)),
                          Expanded(child: TajiraImage(images[1], fallback: Icons.headphones)),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Row(
                        children: [
                          Expanded(child: TajiraImage(images[2], fallback: Icons.blender)),
                          Expanded(child: TajiraImage(images[3], fallback: Icons.speaker)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                top: 12,
                left: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: const BoxDecoration(
                    color: orange,
                    borderRadius: BorderRadius.only(topRight: Radius.circular(8), bottomRight: Radius.circular(8)),
                  ),
                  child: Text('NEXT DROP', style: inter(size: 10, weight: FontWeight.w800, color: Colors.white, spacing: 0.4, height: 1.0)),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Tech Surprise Drop', style: inter(size: 16, weight: FontWeight.w800, color: Colors.white)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('Electronics & Accessories', style: inter(size: 11, color: const Color(0xFFC5D3E4))),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: purple, borderRadius: BorderRadius.circular(99)),
                      child: Text('Bundle', style: inter(size: 9, weight: FontWeight.w700, color: Colors.white, height: 1.0)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text('Original Price KSh 12,000', style: inter(size: 12, color: Colors.white70).copyWith(decoration: TextDecoration.lineThrough, decorationColor: Colors.white54)),
                Text('Flash Drop Price KSh 6,000', style: inter(size: 16, weight: FontWeight.w800, color: orange)),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2A2150),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text('Drop Starts In', style: inter(size: 11, color: const Color(0xFFC5D3E4))),
                      const SizedBox(height: 4),
                      Text(clock, style: inter(size: 20, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      gradient: const LinearGradient(colors: [Color(0xFFFF9A2F), orange]),
                    ),
                    child: FilledButton.icon(
                      onPressed: onRemind,
                      icon: const Icon(Icons.notifications_active, size: 18),
                      label: Text('REMIND ME', style: T.playNow.copyWith(fontSize: 13, letterSpacing: 0.4)),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text('You will be notified before the drop begins', style: inter(size: 10, color: const Color(0xFF9CA3AF))),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LiveNow extends StatelessWidget {
  const _LiveNow({
    required this.remaining,
    required this.pad,
    required this.products,
    required this.discount,
    required this.img,
    required this.left,
    required this.onAdd,
    required this.onViewAll,
  });
  final Duration remaining;
  final String Function(int) pad;
  final List products;
  final int discount;
  final String? Function(Map) img;
  final int Function(Map) left;
  final void Function(Map) onAdd;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    final clock = '${pad(remaining.inHours)}:${pad(remaining.inMinutes.remainder(60))}:${pad(remaining.inSeconds.remainder(60))}';
    return Column(
      children: [
        Row(
          children: [
            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text('LIVE NOW', style: inter(size: 13, weight: FontWeight.w800, color: navy, spacing: 0.3)),
            const Spacer(),
            Text('Ends in: ', style: inter(size: 11, weight: FontWeight.w600, color: const Color(0xFFDC2626))),
            Text(clock, style: inter(size: 11, weight: FontWeight.w800, color: const Color(0xFFDC2626))),
            const SizedBox(width: 10),
            InkWell(
              onTap: onViewAll,
              child: Text('View All', style: inter(size: 12, weight: FontWeight.w700, color: purple)),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (products.isEmpty)
          Text('No live products in this drop yet.', style: T.memberMeta)
        else
          SizedBox(
            height: 326,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: products.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (_, i) {
                final m = Map<String, dynamic>.from(products[i] as Map);
                return SizedBox(
                  width: 168,
                  child: _LiveCard(product: m, image: img(m), left: left(m), discount: discount, onAdd: () => onAdd(m)),
                );
              },
            ),
          ),
      ],
    );
  }
}

class _LiveCard extends StatelessWidget {
  const _LiveCard({required this.product, required this.image, required this.left, required this.discount, required this.onAdd});
  final Map product;
  final String? image;
  final int left;
  final int discount;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final rating = (product['ratingAvg'] as num?)?.toDouble() ?? 0;
    final count = (product['ratingCount'] as num?)?.toInt() ?? 0;
    final showRating = rating > 0 ? rating : 4.6;
    final showCount = count > 0 ? count : 128;
    return InkWell(
      onTap: () => context.push('/product/${product['id']}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFEEF1F5)),
          boxShadow: const [BoxShadow(color: Color(0x14071526), blurRadius: 10, offset: Offset(0, 4))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 112,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  TajiraImage(image, fallback: Icons.devices_other),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFFE11D48), borderRadius: BorderRadius.circular(6)),
                      child: Text('$discount% OFF', style: inter(size: 9, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product['name']?.toString() ?? '',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: inter(size: 11, weight: FontWeight.w700, color: navy, height: 1.2),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, size: 12, color: Color(0xFFFBBF24)),
                        const SizedBox(width: 2),
                        Text('${showRating.toStringAsFixed(1)} ($showCount)', style: T.rating.copyWith(fontSize: 10)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(money(product['priceKes']), style: inter(size: 13, weight: FontWeight.w800, color: orange, height: 1.1)),
                    if (product['compareAtKes'] != null)
                      Text(
                        money(product['compareAtKes']),
                        style: inter(size: 10, color: const Color(0xFF8A97A6)).copyWith(decoration: TextDecoration.lineThrough),
                      ),
                    Text('$left left', style: inter(size: 10, weight: FontWeight.w700, color: const Color(0xFFDC2626))),
                    const Spacer(),
                    SizedBox(
                      width: double.infinity,
                      height: 32,
                      child: FilledButton.icon(
                        onPressed: onAdd,
                        icon: const Icon(Icons.shopping_cart_outlined, size: 13),
                        label: Text('ADD TO CART', style: inter(size: 9, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                        style: FilledButton.styleFrom(
                          backgroundColor: purple,
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HowItWorks extends StatelessWidget {
  const _HowItWorks({super.key});

  @override
  Widget build(BuildContext context) {
    const steps = [
      ('1', 'Wait for the next drop', 'Check the timer'),
      ('2', 'Surprise!', 'A random product is revealed'),
      ('3', '50% OFF', 'Discount applied automatically'),
      ('4', 'Shop fast', 'Limited stock. Grab it!'),
      ('5', 'Enjoy your deal', 'Quality products at half price!'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('HOW FLASH DROP WORKS', style: inter(size: 13, weight: FontWeight.w800, color: navy, spacing: 0.3)),
        const SizedBox(height: 12),
        SizedBox(
          height: 118,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: steps.length,
            separatorBuilder: (_, _) => const Padding(
              padding: EdgeInsets.only(top: 14),
              child: Icon(Icons.arrow_forward, size: 16, color: Color(0xFF93C5FD)),
            ),
            itemBuilder: (_, i) {
              final s = steps[i];
              return SizedBox(
                width: 112,
                child: Column(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: const BoxDecoration(color: Color(0xFF2563EB), shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: Text(s.$1, style: inter(size: 14, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                    ),
                    const SizedBox(height: 8),
                    Text(s.$2, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 11, weight: FontWeight.w800, color: navy, height: 1.2)),
                    const SizedBox(height: 2),
                    Text(s.$3, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 10, color: muted, height: 1.2)),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Winners extends StatelessWidget {
  const _Winners({required this.winners, required this.onViewAll});
  final List<_Winner> winners;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            const Icon(Icons.emoji_events, color: gold, size: 20),
            const SizedBox(width: 6),
            Text('RECENT WINNERS', style: inter(size: 13, weight: FontWeight.w800, color: navy, spacing: 0.3)),
            const Spacer(),
            InkWell(
              onTap: onViewAll,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: const Color(0xFFEEE7FB), borderRadius: BorderRadius.circular(8)),
                child: Text('View All', style: inter(size: 11, weight: FontWeight.w700, color: purple, height: 1.0)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 86,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: winners.length,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (_, i) {
              final w = winners[i];
              return SizedBox(
                width: 168,
                child: Row(
                  children: [
                    ClipOval(child: SizedBox(width: 44, height: 44, child: TajiraImage(w.avatar, fallback: Icons.person))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(w.name, style: inter(size: 12, weight: FontWeight.w800, color: navy)),
                          Text(w.product, maxLines: 1, overflow: TextOverflow.ellipsis, style: inter(size: 10, color: muted)),
                          Text('Saved ${money(w.saved)}', style: inter(size: 11, weight: FontWeight.w700, color: const Color(0xFFDC2626))),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _NotifyCta extends StatelessWidget {
  const _NotifyCta({required this.onEnable});
  final VoidCallback onEnable;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1F3A),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(color: orange, shape: BoxShape.circle),
                child: const Icon(Icons.bolt, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'More Drops. More Deals. More Savings! Enable notifications so you never miss a Flash Drop.',
                  style: inter(size: 12, weight: FontWeight.w500, color: Colors.white, height: 1.3),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: FilledButton.icon(
              onPressed: onEnable,
              icon: const Icon(Icons.notifications_active, size: 18),
              label: Text('ENABLE NOTIFICATIONS', style: T.playNow.copyWith(fontSize: 12, letterSpacing: 0.3)),
              style: FilledButton.styleFrom(
                backgroundColor: orange,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PastCard extends StatelessWidget {
  const _PastCard({required this.drop});
  final _Past drop;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F8FA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEEF1F5)),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(color: const Color(0xFFEEE7FB), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.inventory_2_outlined, color: purple),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(drop.name, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                Text(drop.category, style: T.memberMeta),
                Text('Ended ${drop.ended}', style: inter(size: 10, color: muted)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(money(drop.was), style: inter(size: 10, color: muted).copyWith(decoration: TextDecoration.lineThrough)),
              Text(money(drop.now), style: inter(size: 13, weight: FontWeight.w800, color: orange)),
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(6)),
                child: Text('ENDED', style: inter(size: 8, weight: FontWeight.w800, color: muted, height: 1.0)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Winner {
  const _Winner(this.name, this.product, this.saved, this.avatar);
  final String name;
  final String product;
  final int saved;
  final String avatar;
}

class _Past {
  const _Past(this.name, this.category, this.ended, this.was, this.now);
  final String name;
  final String category;
  final String ended;
  final int was;
  final int now;
}
