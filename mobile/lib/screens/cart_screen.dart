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

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  Map? cart;
  String? error;
  bool loading = true;
  final selected = <String>{};
  final promo = TextEditingController();
  int promoPercent = 0;

  static const deliveryKes = 150;

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    promo.dispose();
    super.dispose();
  }

  List get items => (cart?['items'] as List?) ?? [];

  Future<void> load() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      setState(() => loading = false);
      return;
    }
    try {
      final res = await session.dio.get('/cart');
      final next = Map<String, dynamic>.from(res.data['cart'] as Map);
      final ids = ((next['items'] as List?) ?? []).map((e) => (e as Map)['id'].toString()).toSet();
      setState(() {
        cart = next;
        error = null;
        loading = false;
        if (selected.isEmpty) {
          selected.addAll(ids);
        } else {
          selected.removeWhere((id) => !ids.contains(id));
        }
      });
      await session.refreshCart();
    } catch (e) {
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  List get chosen {
    return items.where((e) => selected.contains((e as Map)['id'].toString())).toList();
  }

  int get chosenCount => chosen.fold<int>(0, (s, e) => s + ((e as Map)['quantity'] as int? ?? 1));

  int get subtotal => chosen.fold<int>(0, (s, e) {
        final m = e as Map;
        return s + ((m['lineTotalKes'] as num?)?.toInt() ?? 0);
      });

  int get savings => chosen.fold<int>(0, (s, e) {
        final m = e as Map;
        final p = m['product'] as Map? ?? {};
        final unit = (m['unitPriceKes'] as num?)?.toInt() ?? 0;
        final compare = (p['compareAtKes'] as num?)?.toInt() ?? 0;
        final qty = (m['quantity'] as int?) ?? 1;
        if (compare <= unit) return s;
        return s + (compare - unit) * qty;
      });

  int get promoOff => (subtotal * promoPercent / 100).round();

  int get delivery => chosen.isEmpty ? 0 : deliveryKes;

  int get total => (subtotal - promoOff + delivery).clamp(0, 1 << 30);

  int get basePts => (subtotal * 0.01).round();

  bool get silverPlus {
    final level = (context.read<Session>().user?['membershipLevel'] ?? 'BRONZE').toString().toUpperCase();
    return level == 'SILVER' || level == 'GOLD' || level == 'PLATINUM';
  }

  String get memberLabel {
    final level = (context.read<Session>().user?['membershipLevel'] ?? 'BRONZE').toString();
    if (level.isEmpty) return 'Member';
    return '${level[0]}${level.substring(1).toLowerCase()} Member';
  }

  int get bonusPts => silverPlus ? (basePts * 0.10).round() : 0;

  int get earnPts => basePts + bonusPts;

  Future<void> _mutate(Future<void> Function() op) async {
    try {
      await op();
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    }
  }

  Future<void> setQty(String id, int qty) => _mutate(() async {
        await context.read<Session>().dio.patch('/cart/items/$id', data: {'quantity': qty});
      });

  Future<void> remove(String id) => _mutate(() async {
        await context.read<Session>().dio.delete('/cart/items/$id');
        selected.remove(id);
      });

  Future<void> removeAll() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove all items?'),
        content: const Text('This will empty your cart.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove')),
        ],
      ),
    );
    if (ok != true) return;
    selected.clear();
    await _mutate(() => context.read<Session>().dio.delete('/cart'));
  }

  Future<void> checkout() async {
    if (chosen.isEmpty) return;
    final session = context.read<Session>();
    try {
      for (final item in List.from(items)) {
        final id = (item as Map)['id'].toString();
        if (!selected.contains(id)) {
          await session.dio.delete('/cart/items/$id');
        }
      }
      if (!mounted) return;
      context.push('/checkout');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    }
  }

  String? _img(Map product) {
    final images = product['images'];
    if (images is List && images.isNotEmpty) return images.first.toString();
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    if (!session.isLoggedIn) {
      return Scaffold(
        backgroundColor: Colors.white,
        drawer: const NetzaDrawer(),
        bottomNavigationBar: const NetzaBottomNav(currentIndex: 1),
        body: SafeArea(
          child: Column(
            children: [
              const Padding(padding: EdgeInsets.fromLTRB(8, 4, 12, 0), child: StorefrontHeader()),
              Container(
                width: double.infinity,
                color: const Color(0xFFEEF1F5),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: const DeliverToRow(),
              ),
              const Spacer(),
              const Icon(Icons.shopping_cart_outlined, size: 48, color: muted),
              const SizedBox(height: 12),
              Text('Sign in to view your cart', style: T.memberTitle),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.push('/login'),
                style: FilledButton.styleFrom(
                  backgroundColor: orange,
                  minimumSize: const Size(220, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('Sign in', style: T.playNow.copyWith(fontSize: 14)),
              ),
              const Spacer(),
            ],
          ),
        ),
      );
    }

    final now = DateTime.now();
    final d1 = now.add(const Duration(days: 1));
    final d2 = now.add(const Duration(days: 2));
    final discount = savings + promoOff;

    return Scaffold(
      backgroundColor: Colors.white,
      drawer: const NetzaDrawer(),
      bottomNavigationBar: const NetzaBottomNav(currentIndex: 1),
      body: SafeArea(
        child: Column(
          children: [
            const Padding(padding: EdgeInsets.fromLTRB(8, 4, 12, 0), child: StorefrontHeader()),
            Container(
              width: double.infinity,
              color: const Color(0xFFEEF1F5),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: const DeliverToRow(),
            ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: Text(error!, style: inter(size: 13, color: Colors.red)),
              ),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator(color: orange))
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                      children: [
                        const LoyaltyCard(),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(child: Text('My Cart (${items.length})', style: T.section.copyWith(fontSize: 18))),
                            if (items.isNotEmpty)
                              InkWell(
                                onTap: removeAll,
                                child: Row(
                                  children: [
                                    Text('Remove all', style: inter(size: 13, weight: FontWeight.w700, color: const Color(0xFFE53935))),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.delete_outline, color: Color(0xFFE53935), size: 18),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        if (items.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 36),
                            child: Column(
                              children: [
                                const Icon(Icons.shopping_cart_outlined, size: 48, color: muted),
                                const SizedBox(height: 8),
                                Text('Your cart is empty', style: T.memberTitle),
                                TextButton(onPressed: () => context.go('/shop'), child: const Text('Browse categories')),
                              ],
                            ),
                          ),
                        ...items.map((raw) {
                          final item = raw as Map;
                          final p = item['product'] as Map? ?? {};
                          final id = item['id'].toString();
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _CartItemCard(
                              name: p['name']?.toString() ?? '',
                              image: _img(p),
                              stock: (p['stock'] as num?)?.toInt() ?? 0,
                              unit: (item['unitPriceKes'] as num?)?.toInt() ?? 0,
                              compare: (p['compareAtKes'] as num?)?.toInt(),
                              qty: item['quantity'] as int? ?? 1,
                              checked: selected.contains(id),
                              onCheck: (v) => setState(() => v ? selected.add(id) : selected.remove(id)),
                              onQty: (q) => setQty(id, q),
                              onRemove: () => remove(id),
                              onOpen: () => context.push('/product/${p['id']}'),
                            ),
                          );
                        }),
                        if (items.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          _ShadowCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Order Summary', style: inter(size: 15, weight: FontWeight.w800, color: navy)),
                                const SizedBox(height: 12),
                                _kv('Subtotal ($chosenCount items)', money(subtotal)),
                                _kv('Discount', '- ${money(discount)}', valueColor: const Color(0xFFE53935)),
                                _kv('Delivery Fee', money(delivery)),
                                const Divider(height: 20, color: Color(0xFFE8ECF1)),
                                Row(
                                  children: [
                                    Text('Total', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
                                    const Spacer(),
                                    Text(money(total), style: T.pdpPrice.copyWith(fontSize: 20)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          _ShadowCard(
                            color: const Color(0xFFF5F0FF),
                            border: const Color(0xFFE9D5FF),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.monetization_on, color: purple, size: 22),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text.rich(
                                        TextSpan(
                                          style: T.earn.copyWith(fontSize: 13, height: 1.3),
                                          children: [
                                            const TextSpan(text: 'You will earn '),
                                            TextSpan(text: '$earnPts Netza Points', style: inter(size: 13, weight: FontWeight.w800, color: purple)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text('Base Points (1%): $basePts', style: T.memberMeta.copyWith(fontSize: 12)),
                                Text('$memberLabel Bonus (10%): $bonusPts', style: T.memberMeta.copyWith(fontSize: 12)),
                                const SizedBox(height: 4),
                                Text('Total Points: $earnPts', style: T.earn.copyWith(fontSize: 13, fontWeight: FontWeight.w800)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          _ShadowCard(
                            child: Container(
                              height: 44,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF7F8FA),
                                border: Border.all(color: const Color(0xFFD5DBE3)),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: promo,
                                      style: T.searchField,
                                      textCapitalization: TextCapitalization.characters,
                                      decoration: InputDecoration(
                                        hintText: 'Enter code',
                                        hintStyle: T.searchHint,
                                        border: InputBorder.none,
                                        isDense: true,
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      ),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      final code = promo.text.trim().toUpperCase();
                                      setState(() => promoPercent = code == 'NETZA10' ? 10 : 0);
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                        content: Text(code == 'NETZA10' ? 'NETZA10 applied — 10% off' : 'Invalid promo code'),
                                      ));
                                    },
                                    child: Text('Apply', style: inter(size: 14, weight: FontWeight.w800, color: orange)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          InkWell(
                            onTap: () => context.go('/points'),
                            borderRadius: BorderRadius.circular(14),
                            child: _ShadowCard(
                              color: const Color(0xFFFFF8E8),
                              border: const Color(0xFFFFE7B8),
                              child: Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(color: const Color(0xFFFFE7B8), borderRadius: BorderRadius.circular(10)),
                                    child: const Icon(Icons.card_giftcard, color: gold, size: 20),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Redeem your points', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                                        Text('100 Points = KSh 10', style: T.memberMeta),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right, color: muted),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          _ShadowCard(
                            child: Row(
                              children: [
                                const Icon(Icons.local_shipping_outlined, color: navy, size: 22),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Estimated Delivery', style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                                      Text(
                                        'Tomorrow, ${DateFormat('d MMM').format(d1)} - ${DateFormat('EEE, d MMM').format(d2)}',
                                        style: T.memberMeta.copyWith(fontSize: 12),
                                      ),
                                      Text('Nairobi, Kenya', style: T.memberMeta.copyWith(fontSize: 12)),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    InkWell(
                                      onTap: () => context.push('/checkout'),
                                      child: Text('Change', style: T.seeAll.copyWith(fontWeight: FontWeight.w700)),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(money(delivery), style: inter(size: 14, weight: FontWeight.w800, color: const Color(0xFF16A34A))),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
            ),
            Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFEEF1F5))),
                boxShadow: [BoxShadow(color: Color(0x14000000), offset: Offset(0, -2), blurRadius: 6)],
              ),
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              child: Column(
                children: [
                  Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Total ($chosenCount items)', style: T.memberMeta),
                          Text(money(total), style: T.pdpPrice.copyWith(fontSize: 22)),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: chosen.isEmpty ? null : checkout,
                          style: FilledButton.styleFrom(
                            backgroundColor: orange,
                            disabledBackgroundColor: const Color(0xFFFFC48A),
                            minimumSize: const Size(0, 48),
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text('PROCEED TO CHECKOUT >', style: T.playNow.copyWith(fontSize: 12, letterSpacing: 0.2)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_outline, size: 12, color: muted),
                      const SizedBox(width: 4),
                      Text('Secure Checkout', style: inter(size: 11, color: muted)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, String v, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(k, style: T.memberMeta.copyWith(fontSize: 13, color: const Color(0xFF4B5563))),
          const Spacer(),
          Text(v, style: inter(size: 13, weight: FontWeight.w700, color: valueColor ?? navy)),
        ],
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({
    required this.name,
    required this.image,
    required this.stock,
    required this.unit,
    required this.compare,
    required this.qty,
    required this.checked,
    required this.onCheck,
    required this.onQty,
    required this.onRemove,
    required this.onOpen,
  });

  final String name;
  final String? image;
  final int stock;
  final int unit;
  final int? compare;
  final int qty;
  final bool checked;
  final ValueChanged<bool> onCheck;
  final ValueChanged<int> onQty;
  final VoidCallback onRemove;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final pts = unit ~/ 100;
    final inStock = stock > 0;
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 10, 10, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), offset: Offset(0, 2), blurRadius: 4)],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Checkbox(
            value: checked,
            visualDensity: VisualDensity.compact,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            side: const BorderSide(color: Color(0xFFC5CDD6), width: 1.6),
            fillColor: WidgetStateProperty.resolveWith(
              (s) => s.contains(WidgetState.selected) ? orange : Colors.white,
            ),
            checkColor: Colors.white,
            onChanged: (v) => onCheck(v == true),
          ),
          GestureDetector(
            onTap: onOpen,
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: const Color(0xFFF4F6F8), borderRadius: BorderRadius.circular(10)),
              clipBehavior: Clip.antiAlias,
              child: NetzaImage(image),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: onOpen,
                        child: Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: inter(size: 13, weight: FontWeight.w700, color: navy, height: 1.25)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    InkWell(onTap: onRemove, child: const Icon(Icons.delete_outline, size: 18, color: muted)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(inStock ? 'In Stock' : 'Out of stock', style: T.inStock.copyWith(fontSize: 11, color: inStock ? const Color(0xFF16A34A) : Colors.red)),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(20)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star, size: 11, color: purple),
                          const SizedBox(width: 3),
                          Text('Earn $pts Points', style: T.earn.copyWith(fontSize: 10)),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(money(unit), style: T.price.copyWith(fontSize: 15)),
                        if (compare != null && compare! > unit)
                          Text(money(compare), style: T.compare.copyWith(decoration: TextDecoration.lineThrough, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: Container(
                    height: 32,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFD5DBE3)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        InkWell(
                          onTap: () => onQty(qty - 1),
                          child: const SizedBox(width: 30, height: 32, child: Icon(Icons.remove, size: 14, color: navy)),
                        ),
                        SizedBox(
                          width: 22,
                          child: Text('$qty', textAlign: TextAlign.center, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                        ),
                        InkWell(
                          onTap: () => onQty(qty + 1),
                          child: const SizedBox(width: 30, height: 32, child: Icon(Icons.add, size: 14, color: navy)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ShadowCard extends StatelessWidget {
  const _ShadowCard({required this.child, this.color = Colors.white, this.border = const Color(0xFFE8ECF1)});
  final Widget child;
  final Color color;
  final Color border;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), offset: Offset(0, 2), blurRadius: 4)],
      ),
      child: child,
    );
  }
}
