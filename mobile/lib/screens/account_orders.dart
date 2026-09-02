import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/storefront_chrome.dart';
import 'order_success_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List orders = [];
  bool loading = true;
  String? error;
  String filter = 'all';

  static const filters = [
    ('all', 'All'),
    ('pending', 'Pending'),
    ('processing', 'Processing'),
    ('shipped', 'Shipped'),
    ('delivered', 'Delivered'),
    ('cancelled', 'Cancelled'),
  ];

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      setState(() {
        loading = false;
        orders = [];
        error = null;
      });
      return;
    }
    setState(() => loading = true);
    try {
      final res = await session.dio.get('/orders');
      if (!mounted) return;
      setState(() {
        orders = res.data['orders'] as List? ?? [];
        error = null;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  List get filtered {
    if (filter == 'all') return orders;
    return orders.where((raw) {
      final s = (raw is Map ? raw['status'] : '').toString().toUpperCase();
      switch (filter) {
        case 'pending':
          return s == 'PENDING';
        case 'processing':
          return s == 'PROCESSING' || s == 'PAID';
        case 'shipped':
          return s == 'SHIPPED' || s == 'IN_TRANSIT';
        case 'delivered':
          return s == 'DELIVERED';
        case 'cancelled':
          return s == 'CANCELLED';
        default:
          return true;
      }
    }).toList();
  }

  int _count(String key) {
    if (key == 'all') return orders.length;
    return orders.where((raw) {
      final s = (raw is Map ? raw['status'] : '').toString().toUpperCase();
      switch (key) {
        case 'pending':
          return s == 'PENDING';
        case 'processing':
          return s == 'PROCESSING' || s == 'PAID';
        case 'shipped':
          return s == 'SHIPPED' || s == 'IN_TRANSIT';
        case 'delivered':
          return s == 'DELIVERED';
        case 'cancelled':
          return s == 'CANCELLED';
        default:
          return false;
      }
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    if (!session.isLoggedIn) {
      return Scaffold(
        backgroundColor: paper,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(color: Color(0xFFFFE8D6), shape: BoxShape.circle),
                    child: const Icon(Icons.receipt_long_rounded, color: orange, size: 36),
                  ),
                  const SizedBox(height: 14),
                  Text('Your Orders', style: inter(size: 20, weight: FontWeight.w800, color: navy)),
                  const SizedBox(height: 8),
                  Text(
                    'Sign in to track purchases, deliveries and points earned from every order.',
                    textAlign: TextAlign.center,
                    style: T.memberMeta.copyWith(fontSize: 13),
                  ),
                  const SizedBox(height: 18),
                  FilledButton(onPressed: () => context.push('/login'), child: const Text('Sign in')),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final list = filtered;
    final cartCount = session.cartCount;

    return Scaffold(
      backgroundColor: paper,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              child: Row(
                children: [
                  Expanded(child: Text('My Orders', style: inter(size: 20, weight: FontWeight.w800, color: navy))),
                  InkWell(
                    onTap: () => context.push('/cart'),
                    borderRadius: BorderRadius.circular(99),
                    child: Badge(
                      isLabelVisible: cartCount > 0,
                      label: Text('$cartCount', style: inter(size: 9, weight: FontWeight.w700, color: Colors.white)),
                      backgroundColor: const Color(0xFFE53935),
                      child: const Icon(Icons.shopping_cart_outlined, color: navy, size: 22),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: filters.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final (key, label) = filters[i];
                  final on = filter == key;
                  final n = _count(key);
                  return ChoiceChip(
                    label: Text(n > 0 && key != 'all' ? '$label ($n)' : label),
                    selected: on,
                    onSelected: (_) => setState(() => filter = key),
                    selectedColor: orange,
                    backgroundColor: Colors.white,
                    side: BorderSide(color: on ? orange : const Color(0xFFE5E7EB)),
                    labelStyle: inter(
                      size: 12,
                      weight: FontWeight.w700,
                      color: on ? Colors.white : navy,
                      height: 1.0,
                    ),
                    showCheckmark: false,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    visualDensity: VisualDensity.compact,
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: RefreshIndicator(
                color: orange,
                onRefresh: load,
                child: loading && orders.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 120),
                          Center(child: CircularProgressIndicator(color: orange)),
                        ],
                      )
                    : error != null && orders.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(24),
                            children: [
                              const SizedBox(height: 48),
                              Text(error!, textAlign: TextAlign.center, style: inter(size: 13, color: Colors.red)),
                              const SizedBox(height: 12),
                              Center(
                                child: OutlinedButton(onPressed: load, child: const Text('Try again')),
                              ),
                            ],
                          )
                        : list.isEmpty
                            ? ListView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
                                children: [
                                  const Icon(Icons.inventory_2_outlined, size: 48, color: muted),
                                  const SizedBox(height: 12),
                                  Text(
                                    filter == 'all' ? 'No orders yet' : 'No $filter orders',
                                    textAlign: TextAlign.center,
                                    style: inter(size: 16, weight: FontWeight.w800, color: navy),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    filter == 'all'
                                        ? 'When you shop or grab a Flash Drop, your orders will show up here.'
                                        : 'Try another filter or pull down to refresh.',
                                    textAlign: TextAlign.center,
                                    style: T.memberMeta,
                                  ),
                                  const SizedBox(height: 16),
                                  Center(
                                    child: FilledButton(
                                      onPressed: () => context.go('/'),
                                      child: const Text('Start shopping'),
                                    ),
                                  ),
                                ],
                              )
                            : ListView.separated(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                                itemCount: list.length,
                                separatorBuilder: (_, _) => const SizedBox(height: 10),
                                itemBuilder: (_, i) {
                                  final o = Map<String, dynamic>.from(list[i] as Map);
                                  return _OrderCard(
                                    order: o,
                                    onTap: () => context.push('/order/${o['id'] ?? o['orderNumber']}'),
                                  );
                                },
                              ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onTap});
  final Map order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final items = (order['items'] as List?) ?? [];
    final first = items.isNotEmpty ? items.first as Map : <String, dynamic>{};
    final name = (first['name'] ?? order['orderNumber'] ?? 'Order').toString();
    final image = first['image']?.toString();
    final qty = items.fold<int>(0, (s, e) => s + ((e as Map)['quantity'] as int? ?? 1));
    final status = (order['status'] ?? '').toString();
    final pay = (order['paymentStatus'] ?? '').toString();
    final created = DateTime.tryParse(order['createdAt']?.toString() ?? '');
    final pts = (order['pointsEarned'] as num?)?.toInt() ?? ((order['totalKes'] as num?)?.toInt() ?? 0) ~/ 100;
    final style = _statusStyle(status);
    final payStyle = _payStyle(pay);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFEEF1F5)),
            boxShadow: const [BoxShadow(color: Color(0x0F071526), blurRadius: 10, offset: Offset(0, 3))],
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Row(
                  children: [
                    Text(
                      '#${order['orderNumber'] ?? ''}',
                      style: inter(size: 12, weight: FontWeight.w800, color: purple),
                    ),
                    const Spacer(),
                    Text(
                      created == null ? '' : DateFormat('d MMM yyyy · h:mm a').format(created.toLocal()),
                      style: T.memberMeta.copyWith(fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: SizedBox(
                        width: 56,
                        height: 56,
                        child: TajiraImage(image, fallback: Icons.inventory_2_outlined),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: inter(size: 14, weight: FontWeight.w800, color: navy, height: 1.25),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            qty <= 1 ? '1 item' : '$qty items',
                            style: T.memberMeta.copyWith(fontSize: 11),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              _Pill(label: style.$1, bg: style.$2, fg: style.$3),
                              _Pill(label: payStyle.$1, bg: payStyle.$2, fg: payStyle.$3),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: muted),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F8FA),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Text('Total', style: inter(size: 12, weight: FontWeight.w600, color: muted)),
                      const Spacer(),
                      Text(money(order['totalKes']), style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEDE9FE),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          '+${_pts(pts)} pts',
                          style: inter(size: 11, weight: FontWeight.w800, color: purple, height: 1.0),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.bg, required this.fg});
  final String label;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: inter(size: 10, weight: FontWeight.w800, color: fg, height: 1.0)),
    );
  }
}

(String, Color, Color) _statusStyle(String raw) {
  final s = raw.toUpperCase();
  if (s == 'DELIVERED' || s == 'COMPLETED') return ('Delivered', const Color(0xFFDCFCE7), const Color(0xFF166534));
  if (s == 'SHIPPED' || s == 'IN_TRANSIT') return ('Shipped', const Color(0xFFDBEAFE), const Color(0xFF1D4ED8));
  if (s == 'CANCELLED') return ('Cancelled', const Color(0xFFFEE2E2), const Color(0xFFB91C1C));
  if (s == 'PROCESSING' || s == 'PAID') return ('Processing', const Color(0xFFDBEAFE), const Color(0xFF1D4ED8));
  if (s == 'PENDING') return ('Pending', const Color(0xFFFFEDD5), const Color(0xFFC2410C));
  return ('Processing', const Color(0xFFFFEDD5), const Color(0xFFC2410C));
}

(String, Color, Color) _payStyle(String raw) {
  final s = raw.toUpperCase();
  if (s == 'COMPLETED' || s == 'PAID') return ('Paid', const Color(0xFFDCFCE7), const Color(0xFF166534));
  if (s == 'FAILED') return ('Failed', const Color(0xFFFEE2E2), const Color(0xFFB91C1C));
  return ('Payment pending', const Color(0xFFFFEDD5), const Color(0xFFC2410C));
}

String _pts(int n) => NumberFormat('#,###').format(n);

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) => OrderSuccessScreen(id: id);
}
