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

class OrderSuccessScreen extends StatefulWidget {
  const OrderSuccessScreen({super.key, required this.id});
  final String id;

  @override
  State<OrderSuccessScreen> createState() => _OrderSuccessScreenState();
}

class _OrderSuccessScreenState extends State<OrderSuccessScreen> {
  Map? order;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await context.read<Session>().dio.get('/orders/${widget.id}');
      setState(() => order = Map<String, dynamic>.from(res.data['order'] as Map));
    } catch (e) {
      setState(() => error = apiMessage(e));
    }
  }

  List get items => (order?['items'] as List?) ?? [];

  int get itemCount => items.fold<int>(0, (s, e) => s + ((e as Map)['quantity'] as int? ?? 1));

  int get subtotal => (order?['subtotalKes'] as num?)?.toInt() ?? 0;

  int get delivery => (order?['deliveryKes'] as num?)?.toInt() ?? 0;

  int get discount => (order?['discountKes'] as num?)?.toInt() ?? 0;

  int get total => (order?['totalKes'] as num?)?.toInt() ?? 0;

  int get points {
    final earned = (order?['pointsEarned'] as num?)?.toInt() ?? 0;
    if (earned > 0) return earned;
    return (order?['pointsEstimate'] as num?)?.toInt() ?? (subtotal * 0.01).round();
  }

  DateTime get placedAt {
    return DateTime.tryParse(order?['createdAt']?.toString() ?? '')?.toLocal() ?? DateTime.now();
  }

  DateTime? get paidAt {
    return DateTime.tryParse(order?['paidAt']?.toString() ?? '')?.toLocal();
  }

  int get trackStep {
    final status = (order?['status'] ?? '').toString().toUpperCase();
    if (status == 'DELIVERED') return 3;
    if (status == 'SHIPPED' || status == 'IN_TRANSIT') return 2;
    return 1;
  }

  String get payLabel {
    try {
      final payments = order?['payments'] as List?;
      if (payments != null && payments.isNotEmpty) {
        final raw = payments.first['rawPayload']?.toString() ?? '';
        if (raw.contains('AIRTEL')) return 'Airtel Money (Pesapal)';
        if (raw.contains('CARD')) return 'Card (Pesapal)';
        if (raw.contains('MPESA')) return 'M-Pesa (Pesapal)';
      }
    } catch (_) {}
    return 'Pesapal';
  }

  Map get address => (order?['address'] as Map?) ?? {};

  String get customerName {
    final u = context.read<Session>().user;
    return '${u?['firstName'] ?? ''} ${u?['lastName'] ?? ''}'.trim();
  }

  void copyNumber() {
    final n = order?['orderNumber']?.toString() ?? '';
    Clipboard.setData(ClipboardData(text: n));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order number copied')));
  }

  void showItems() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order details', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 12),
            ...items.map((raw) {
              final i = raw as Map;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Expanded(child: Text(i['name'] ?? '', style: inter(size: 13, weight: FontWeight.w600, color: navy))),
                    Text('${i['quantity']} × ${money(i['unitPriceKes'])}', style: T.memberMeta),
                  ],
                ),
              );
            }),
            const Divider(),
            Row(
              children: [
                Text('Total paid', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                const Spacer(),
                Text(money(total), style: T.price.copyWith(fontSize: 16)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return Scaffold(
        backgroundColor: Colors.white,
        bottomNavigationBar: const NetzaBottomNav(currentIndex: 2),
        body: Center(child: Text(error!, style: const TextStyle(color: Colors.red))),
      );
    }
    if (order == null) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(color: orange)),
      );
    }

    final d1 = placedAt.add(const Duration(days: 1));
    final d2 = placedAt.add(const Duration(days: 2));
    final stamp = DateFormat('d MMM, hh:mm a').format(placedAt);
    final paidStamp = DateFormat('d MMM yyyy, hh:mm a').format(paidAt ?? placedAt);
    final step = trackStep;

    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const NetzaBottomNav(currentIndex: 2),
      body: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(8, 4, 12, 0),
              child: StorefrontHeader(leading: HeaderLeading.back),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                children: [
                  const _SuccessMark(),
                  const SizedBox(height: 12),
                  Text(
                    'Order Placed Successfully!',
                    textAlign: TextAlign.center,
                    style: inter(size: 20, weight: FontWeight.w800, color: const Color(0xFF16A34A)),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Thank you for shopping with NETZA Kenya. Your order has been received.',
                    textAlign: TextAlign.center,
                    style: T.memberMeta.copyWith(fontSize: 13, height: 1.35),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF4F6F8),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Order Number', style: T.memberMeta.copyWith(fontSize: 11)),
                              const SizedBox(height: 2),
                              Text(order!['orderNumber'] ?? '', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: copyNumber,
                          child: const Icon(Icons.copy, size: 18, color: Color(0xFF1A73C7)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: _TintCard(
                            color: const Color(0xFFF5F0FF),
                            border: const Color(0xFFE9D5FF),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const _CircleIcon(Icons.monetization_on, purple),
                                const SizedBox(height: 8),
                                Text.rich(
                                  TextSpan(
                                    style: inter(size: 12, color: navy, height: 1.35),
                                    children: [
                                      const TextSpan(text: 'You will earn '),
                                      TextSpan(text: '$points Netza Points', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                                      const TextSpan(text: ' once your order is delivered.'),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _TintCard(
                            color: const Color(0xFFFFF6EB),
                            border: const Color(0xFFFFE0B8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const _CircleIcon(Icons.card_giftcard, orange),
                                const SizedBox(height: 8),
                                Text.rich(
                                  TextSpan(
                                    style: inter(size: 12, color: navy, height: 1.35),
                                    children: [
                                      const TextSpan(text: 'You saved '),
                                      TextSpan(text: money(discount), style: inter(size: 12, weight: FontWeight.w800, color: orange)),
                                      const TextSpan(text: ' with discounts & rewards.'),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Estimated Delivery', style: inter(size: 15, weight: FontWeight.w800, color: navy)),
                            const SizedBox(height: 4),
                            Text(
                              'Tomorrow, ${DateFormat('d MMM').format(d1)} - ${DateFormat('EEE, d MMM').format(d2)}',
                              style: inter(size: 13, weight: FontWeight.w700, color: navy),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEAF8EE),
                          border: Border.all(color: const Color(0xFF16A34A)),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text('On Time', style: inter(size: 11, weight: FontWeight.w800, color: const Color(0xFF16A34A))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _OrderTrack(
                    step: step,
                    placed: stamp,
                    processing: step >= 1 ? stamp : 'Pending',
                  ),
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: () => context.go('/orders'),
                    child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAF8EE),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.local_shipping_outlined, size: 18, color: Color(0xFF16A34A)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              style: inter(size: 12, color: const Color(0xFF166534), height: 1.35),
                              children: [
                                const TextSpan(text: "We'll notify you when your order is shipped. You can track your order in real time from "),
                                TextSpan(
                                  text: 'My Orders',
                                  style: inter(size: 12, weight: FontWeight.w800, color: const Color(0xFF16A34A)),
                                ),
                                const TextSpan(text: '.'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ),
                  const SizedBox(height: 16),
                  _TintCard(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on, color: purple, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Delivery Address', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                              const SizedBox(height: 4),
                              Text(
                                '${customerName.isEmpty ? 'Customer' : customerName} · ${_phone(address['phone']?.toString())}',
                                style: inter(size: 12, weight: FontWeight.w600, color: navy),
                              ),
                              Text('${address['street'] ?? ''}', style: T.memberMeta.copyWith(fontSize: 12, height: 1.3)),
                              Text('${address['city'] ?? ''}, ${address['county'] ?? ''} County', style: T.memberMeta.copyWith(fontSize: 12)),
                              Text('${address['county'] ?? 'Nairobi'}, Kenya', style: T.memberMeta.copyWith(fontSize: 12)),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('Delivery Address'),
                                content: Text(
                                  '${customerName.isEmpty ? 'Customer' : customerName}\n${_phone(address['phone']?.toString())}\n${address['street']}\n${address['city']}, ${address['county']}\nKenya',
                                ),
                                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close'))],
                              ),
                            );
                          },
                          child: Text('View >', style: T.seeAll.copyWith(fontSize: 12, fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: _TintCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Order Summary ($itemCount Items)', style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                              const SizedBox(height: 10),
                              _kv('Subtotal', money(subtotal)),
                              _kv('Discount', '- ${money(discount)}', valueColor: const Color(0xFFE53935)),
                              _kv('Delivery Fee', money(delivery)),
                              const Divider(height: 16, color: Color(0xFFE8ECF1)),
                              Text('Total Paid', style: T.memberMeta.copyWith(fontSize: 11)),
                              const SizedBox(height: 2),
                              Text(money(total), style: T.price.copyWith(fontSize: 18)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _TintCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Payment Method', style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                              const SizedBox(height: 10),
                              Text('pesapal', style: inter(size: 14, weight: FontWeight.w900, color: const Color(0xFF00AEEF))),
                              const SizedBox(height: 6),
                              Text(payLabel, style: inter(size: 12, weight: FontWeight.w700, color: const Color(0xFF16A34A))),
                              const SizedBox(height: 12),
                              Text('Paid Amount', style: T.memberMeta.copyWith(fontSize: 10)),
                              Text(money(total), style: T.price.copyWith(fontSize: 16)),
                              const SizedBox(height: 4),
                              Text('Paid On', style: T.memberMeta.copyWith(fontSize: 10)),
                              Text(paidStamp, style: T.memberMeta.copyWith(fontSize: 10)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text("What's Next?", style: inter(size: 15, weight: FontWeight.w800, color: navy)),
                  const SizedBox(height: 12),
                  const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _NextItem(Icons.manage_search, purple, 'Processing', "We're processing your order. We'll pack it with care.")),
                      SizedBox(width: 8),
                      Expanded(child: _NextItem(Icons.local_shipping_outlined, orange, 'Shipping', "Your order will be shipped. You'll get tracking details.")),
                      SizedBox(width: 8),
                      Expanded(child: _NextItem(Icons.home, Color(0xFF16A34A), 'Enjoy', 'Enjoy your purchase. Thank you for choosing NETZA!')),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F0FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const _CircleIcon(Icons.monetization_on, purple, size: 32, iconSize: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              style: inter(size: 12, color: navy, height: 1.3),
                              children: [
                                const TextSpan(text: 'Earn more '),
                                TextSpan(text: 'points', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                                const TextSpan(text: ' on your next purchase! 100 Points = KSh 10'),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: () => context.go('/shop'),
                          style: FilledButton.styleFrom(
                            backgroundColor: purple,
                            minimumSize: const Size(0, 34),
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: Text('Shop Now >', style: T.playNow.copyWith(fontSize: 11)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: showItems,
                          icon: const Icon(Icons.description_outlined, color: orange, size: 18),
                          label: Text('VIEW ORDER DETAILS', style: inter(size: 11, weight: FontWeight.w800, color: orange)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: orange, width: 1.4),
                            minimumSize: const Size(0, 48),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => context.go('/'),
                          style: FilledButton.styleFrom(
                            backgroundColor: orange,
                            minimumSize: const Size(0, 48),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text('CONTINUE SHOPPING', style: T.playNow.copyWith(fontSize: 11)),
                        ),
                      ),
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
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(child: Text(k, style: T.memberMeta.copyWith(fontSize: 11))),
          Text(v, style: inter(size: 11, weight: FontWeight.w700, color: valueColor ?? navy)),
        ],
      ),
    );
  }
}

String _phone(String? raw) {
  final d = (raw ?? '').replaceAll(RegExp(r'\D'), '');
  var n = d;
  if (n.startsWith('254') && n.length >= 12) n = '0${n.substring(3)}';
  if (n.length == 10) return '${n.substring(0, 4)} ${n.substring(4, 7)} ${n.substring(7)}';
  return raw ?? '';
}

class _SuccessMark extends StatelessWidget {
  const _SuccessMark();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 200,
        height: 108,
        child: Stack(
          alignment: Alignment.center,
          children: [
            const Positioned(left: 18, top: 10, child: _Dot(Color(0xFFF5B400), 7)),
            const Positioned(right: 22, top: 16, child: _Dot(purple, 6)),
            const Positioned(left: 8, bottom: 22, child: _Dot(Color(0xFF38BDF8), 5)),
            const Positioned(right: 12, bottom: 18, child: _Dot(Color(0xFF16A34A), 6)),
            const Positioned(left: 48, top: 2, child: _Dot(orange, 4)),
            const Positioned(right: 52, bottom: 6, child: _Dot(Color(0xFFF5B400), 4)),
            const Positioned(left: 28, top: 48, child: _Dot(purple, 4)),
            const Positioned(right: 30, top: 44, child: _Dot(Color(0xFF38BDF8), 4)),
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(color: Color(0xFF16A34A), shape: BoxShape.circle),
              child: const Icon(Icons.check, color: Colors.white, size: 40),
            ),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot(this.color, this.size);
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(width: size, height: size, decoration: BoxDecoration(color: color, shape: BoxShape.circle));
  }
}

class _OrderTrack extends StatelessWidget {
  const _OrderTrack({required this.step, required this.placed, required this.processing});
  final int step;
  final String placed;
  final String processing;

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.description_outlined, 'Order Placed'),
      (Icons.local_shipping_outlined, 'Processing'),
      (Icons.inventory_2_outlined, 'Shipped'),
      (Icons.home_outlined, 'Delivered'),
    ];
    final subs = [placed, processing, 'Pending', 'Pending'];
    return Row(
      children: [
        for (var i = 0; i < items.length; i++)
          Expanded(
            child: Column(
              children: [
                SizedBox(
                  height: 34,
                  child: Row(
                    children: [
                      Expanded(
                        child: i == 0
                            ? const SizedBox.shrink()
                            : Container(
                                height: 2,
                                color: i <= step ? const Color(0xFF86EFAC) : const Color(0xFFE5E9EF),
                              ),
                      ),
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: i <= step ? const Color(0xFF16A34A) : const Color(0xFFE8ECF1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(items[i].$1, size: 16, color: i <= step ? Colors.white : muted),
                      ),
                      Expanded(
                        child: i == items.length - 1
                            ? const SizedBox.shrink()
                            : Container(
                                height: 2,
                                color: i < step ? const Color(0xFF86EFAC) : const Color(0xFFE5E9EF),
                              ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  items[i].$2,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: inter(size: 10, weight: FontWeight.w700, color: i <= step ? navy : muted),
                ),
                Text(
                  subs[i],
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: T.memberMeta.copyWith(fontSize: 9),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _NextItem extends StatelessWidget {
  const _NextItem(this.icon, this.color, this.title, this.body);
  final IconData icon;
  final Color color;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 26),
        const SizedBox(height: 6),
        Text(title, style: inter(size: 12, weight: FontWeight.w800, color: navy)),
        const SizedBox(height: 4),
        Text(body, textAlign: TextAlign.center, style: T.memberMeta.copyWith(fontSize: 10, height: 1.3)),
      ],
    );
  }
}

class _CircleIcon extends StatelessWidget {
  const _CircleIcon(this.icon, this.color, {this.size = 28, this.iconSize = 16});
  final IconData icon;
  final Color color;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Icon(icon, color: Colors.white, size: iconSize),
    );
  }
}

class _TintCard extends StatelessWidget {
  const _TintCard({required this.child, this.color = Colors.white, this.border = const Color(0xFFE8ECF1)});
  final Widget child;
  final Color color;
  final Color border;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: child,
    );
  }
}
