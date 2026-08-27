import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/storefront_chrome.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  List addresses = [];
  String? addressId;
  Map? cart;
  String? error;
  bool loading = true;
  bool busy = false;
  bool express = false;
  bool redeem = false;
  bool showDetails = false;
  int step = 0;
  String pay = 'MPESA';

  static const standardKes = 150;
  static const expressKes = 350;

  @override
  void initState() {
    super.initState();
    boot();
  }

  Future<void> boot() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      setState(() => loading = false);
      return;
    }
    try {
      final a = await session.dio.get('/addresses');
      final c = await session.dio.get('/cart');
      await session.refreshWallet();
      await session.refreshCart();
      final list = a.data['addresses'] as List;
      final next = Map<String, dynamic>.from(c.data['cart'] as Map);
      Map? def;
      for (final raw in list) {
        final m = raw as Map;
        if (m['isDefault'] == true) {
          def = m;
          break;
        }
      }
      setState(() {
        addresses = list;
        cart = next;
        addressId = (def?['id'] ?? (list.isNotEmpty ? (list.first as Map)['id'] : null))?.toString();
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

  List get items => (cart?['items'] as List?) ?? [];

  int get itemCount => items.fold<int>(0, (s, e) => s + ((e as Map)['quantity'] as int? ?? 1));

  int get subtotal => (cart?['subtotalKes'] as num?)?.toInt() ?? 0;

  int get savings => items.fold<int>(0, (s, e) {
        final m = e as Map;
        final p = m['product'] as Map? ?? {};
        final unit = (m['unitPriceKes'] as num?)?.toInt() ?? 0;
        final compare = (p['compareAtKes'] as num?)?.toInt() ?? 0;
        final qty = (m['quantity'] as int?) ?? 1;
        if (compare <= unit) return s;
        return s + (compare - unit) * qty;
      });

  int get delivery => items.isEmpty ? 0 : (express ? expressKes : standardKes);

  int get redeemKes {
    if (!redeem) return 0;
    final pts = context.read<Session>().pointsBalance;
    final maxKes = pts ~/ 10;
    return maxKes.clamp(0, subtotal);
  }

  int get total => (subtotal - redeemKes + delivery).clamp(0, 1 << 30);

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

  String get customerName {
    final u = context.read<Session>().user;
    return '${u?['firstName'] ?? ''} ${u?['lastName'] ?? ''}'.trim();
  }

  void goToPayment() {
    if (addressId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a delivery address')));
      return;
    }
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your cart is empty')));
      return;
    }
    setState(() {
      step = 1;
      showDetails = false;
    });
  }

  void goBack() {
    if (step == 1) {
      setState(() => step = 0);
    } else if (context.canPop()) {
      context.pop();
    } else {
      context.go('/cart');
    }
  }

  Future<void> continuePay() async {
    if (addressId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a delivery address')));
      return;
    }
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your cart is empty')));
      return;
    }
    if (pay == 'POINTS' && !redeem) {
      setState(() => redeem = true);
    }

    final method = pay == 'POINTS' ? 'MPESA' : pay;
    setState(() => busy = true);
    final dio = context.read<Session>().dio;
    try {
      final orderRes = await dio.post('/orders', data: {
        'addressId': addressId,
        'paymentMethod': method,
        'deliveryMethod': express ? 'EXPRESS' : 'STANDARD',
      });
      final order = orderRes.data['order'] as Map;
      if (method == 'MPESA') {
        await dio.post('/payments/mpesa/stk', data: {'orderId': order['id']});
        if (!mounted) return;
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('M-Pesa STK Push'),
            content: Text('Check your phone for the M-Pesa prompt and enter your PIN to pay ${money(order['totalKes'])}.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Later')),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simulate payment')),
            ],
          ),
        );
        if (confirm == true) {
          await dio.post('/payments/mpesa/simulate', data: {'orderId': order['id']});
        }
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order ${order['orderNumber']} created. Complete ${pay == 'CARD' ? 'card' : 'Pesapal'} payment to confirm.')),
        );
      }
      if (!mounted) return;
      await context.read<Session>().refreshCart();
      if (mounted) context.go('/order/${order['id']}');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> editAddress([Map? existing]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _AddressSheet(existing: existing),
    );
    if (saved == true) await boot();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    if (!session.isLoggedIn) {
      return Scaffold(
        backgroundColor: Colors.white,
        bottomNavigationBar: const NetzaBottomNav(currentIndex: 1),
        body: SafeArea(
          child: Column(
            children: [
              const Padding(padding: EdgeInsets.fromLTRB(8, 4, 12, 0), child: StorefrontHeader(leading: HeaderLeading.back)),
              const Spacer(),
              FilledButton(onPressed: () => context.push('/login'), child: const Text('Sign in to checkout')),
              const Spacer(),
            ],
          ),
        ),
      );
    }

    return PopScope(
      canPop: step == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) goBack();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        bottomNavigationBar: const NetzaBottomNav(currentIndex: 1),
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 12, 0),
                child: StorefrontHeader(leading: HeaderLeading.back, onLeadingTap: goBack),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: _CheckoutStepper(active: step),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Text(error!, style: inter(size: 13, color: Colors.red)),
                ),
              Expanded(
                child: loading
                    ? const Center(child: CircularProgressIndicator(color: orange))
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                        children: step == 0 ? _deliveryChildren(session) : _paymentChildren(session),
                      ),
              ),
              _stickyBar(),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _deliveryChildren(Session session) {
    return [
      Text('Delivery Address', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
      const SizedBox(height: 10),
      if (addresses.isEmpty)
        _Card(
          child: Text('No saved addresses yet. Add one to continue.', style: T.memberMeta.copyWith(fontSize: 13)),
        ),
      ...addresses.map((raw) {
        final a = raw as Map;
        final id = a['id'].toString();
        final on = addressId == id;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _AddressCard(
            selected: on,
            label: a['label']?.toString() ?? 'Home',
            isDefault: a['isDefault'] == true,
            name: customerName,
            phone: formatPhone(a['phone']?.toString()),
            line: '${a['street']}, ${a['city']}',
            city: '${a['city']}, ${a['county']}',
            onTap: () => setState(() => addressId = id),
            onEdit: () => editAddress(a),
          ),
        );
      }),
      InkWell(
        onTap: () => editAddress(),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              const Icon(Icons.add_circle, color: orange, size: 22),
              const SizedBox(width: 8),
              Text('Add New Address', style: inter(size: 14, weight: FontWeight.w700, color: orange)),
            ],
          ),
        ),
      ),
      const SizedBox(height: 18),
      Text('Delivery Method', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
      const SizedBox(height: 10),
      _MethodCard(
        selected: !express,
        icon: Icons.local_shipping_outlined,
        title: 'Standard Delivery',
        subtitle: '1 - 3 working days',
        price: money(standardKes),
        priceColor: const Color(0xFF16A34A),
        onTap: () => setState(() => express = false),
      ),
      const SizedBox(height: 8),
      _MethodCard(
        selected: express,
        icon: Icons.delivery_dining,
        title: 'Express Delivery',
        subtitle: 'Get it tomorrow',
        subtitleColor: orange,
        price: money(expressKes),
        onTap: () => setState(() => express = true),
      ),
      const SizedBox(height: 18),
      Row(
        children: [
          Text('Payment Method', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
          const Spacer(),
          const Icon(Icons.verified_user, size: 14, color: Color(0xFF16A34A)),
          const SizedBox(width: 4),
          Text('100% Secure', style: inter(size: 11, weight: FontWeight.w700, color: const Color(0xFF16A34A))),
        ],
      ),
      const SizedBox(height: 10),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.55,
        children: [
          _PayCard(
            selected: pay == 'MPESA',
            onTap: () => setState(() => pay = 'MPESA'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _MpessaMark(),
                const Spacer(),
                Text('Pay with M-Pesa', style: inter(size: 12, weight: FontWeight.w600, color: navy)),
              ],
            ),
          ),
          _PayCard(
            selected: pay == 'CARD',
            onTap: () => setState(() => pay = 'CARD'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    _BrandChip('VISA', Color(0xFF1A1F71)),
                    SizedBox(width: 4),
                    _BrandChip('MC', Color(0xFFEB001B)),
                  ],
                ),
                const Spacer(),
                Text('Debit / Credit Card', style: inter(size: 12, weight: FontWeight.w600, color: navy)),
              ],
            ),
          ),
          _PayCard(
            selected: pay == 'PESAPAL',
            onTap: () => setState(() => pay = 'PESAPAL'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('pesapal', style: inter(size: 16, weight: FontWeight.w800, color: const Color(0xFF00AEEF))),
                const Spacer(),
                Text('Pay with Pesapal', style: inter(size: 12, weight: FontWeight.w600, color: navy)),
              ],
            ),
          ),
          _PayCard(
            selected: pay == 'POINTS',
            onTap: () => setState(() {
              pay = 'POINTS';
              redeem = true;
            }),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.account_balance_wallet_outlined, color: purple, size: 22),
                const Spacer(),
                Text('Netza Points', style: inter(size: 12, weight: FontWeight.w700, color: navy)),
                Text(
                  'Balance: ${NumberFormatHelper.pts(session.pointsBalance)} Pts',
                  style: inter(size: 11, weight: FontWeight.w700, color: orange),
                ),
              ],
            ),
          ),
        ],
      ),
      const SizedBox(height: 16),
      _summaryPair(),
      const SizedBox(height: 10),
      _redeemBanner(session, compact: true),
    ];
  }

  List<Widget> _paymentChildren(Session session) {
    return [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF8EE),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            const Icon(Icons.lock, size: 16, color: Color(0xFF16A34A)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Your payment is 100% secure and encrypted',
                style: inter(size: 12, weight: FontWeight.w600, color: const Color(0xFF166534)),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Text('Select Payment Method', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
      const SizedBox(height: 10),
      _MpesaOption(
        selected: pay == 'MPESA',
        onTap: () => setState(() => pay = 'MPESA'),
      ),
      const SizedBox(height: 10),
      _PayRow(
        selected: pay == 'CARD',
        title: 'Debit / Credit Card',
        subtitle: 'Pay securely using your card',
        onTap: () => setState(() => pay = 'CARD'),
        leading: const Row(
          children: [
            _BrandChip('VISA', Color(0xFF1A1F71)),
            SizedBox(width: 4),
            _BrandChip('MC', Color(0xFFEB001B)),
          ],
        ),
      ),
      const SizedBox(height: 10),
      _PayRow(
        selected: pay == 'PESAPAL',
        title: 'Pay with Pesapal',
        subtitle: 'Secure payments via Pesapal',
        onTap: () => setState(() => pay = 'PESAPAL'),
        leading: Text('pesapal', style: inter(size: 15, weight: FontWeight.w800, color: const Color(0xFF00AEEF))),
      ),
      const SizedBox(height: 10),
      _PayRow(
        selected: pay == 'POINTS',
        title: 'Pay with Netza Points',
        subtitle: 'Redeem points at 100 Pts = KSh 10',
        onTap: () => setState(() {
          pay = 'POINTS';
          redeem = true;
        }),
        leading: const Icon(Icons.account_balance_wallet_outlined, color: purple, size: 26),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(20)),
          child: Text(
            'Balance: ${NumberFormatHelper.pts(session.pointsBalance)} Pts',
            style: inter(size: 10, weight: FontWeight.w800, color: purple),
          ),
        ),
      ),
      const SizedBox(height: 16),
      _summaryPair(),
      const SizedBox(height: 10),
      _redeemBanner(session, compact: false),
    ];
  }

  Widget _summaryPair() {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: _Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.shopping_cart_outlined, size: 16, color: navy),
                      const SizedBox(width: 6),
                      Expanded(child: Text('$itemCount Items', style: inter(size: 13, weight: FontWeight.w800, color: navy))),
                      const Icon(Icons.keyboard_arrow_down, size: 18, color: muted),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _kv('Subtotal', money(subtotal)),
                  _kv('Discount', '- ${money(savings + redeemKes)}', valueColor: const Color(0xFFE53935)),
                  _kv('Delivery Fee', money(delivery)),
                  const Divider(height: 16, color: Color(0xFFE8ECF1)),
                  Text(money(total), style: T.pdpPrice.copyWith(fontSize: 16)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _Card(
              color: const Color(0xFFF5F0FF),
              border: const Color(0xFFE9D5FF),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.monetization_on, color: purple, size: 18),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text('You will earn $earnPts Netza Points', style: T.earn.copyWith(fontSize: 11, fontWeight: FontWeight.w800, height: 1.25)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Base Points (1%): $basePts', style: T.memberMeta.copyWith(fontSize: 11)),
                  Text('$memberLabel Bonus (10%): $bonusPts', style: T.memberMeta.copyWith(fontSize: 11)),
                  const Spacer(),
                  Text('Total Points: $earnPts', style: T.earn.copyWith(fontSize: 12, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _redeemBanner(Session session, {required bool compact}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF6EB),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFFE0B8)),
      ),
      child: Row(
        children: [
          const Icon(Icons.card_giftcard, color: orange, size: 22),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Redeem your points & save more!', style: inter(size: 12, weight: FontWeight.w700, color: navy, height: 1.25)),
                Text('100 Points = KSh 10', style: T.memberMeta.copyWith(fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            children: [
              FilledButton(
                onPressed: () {
                  setState(() => redeem = !redeem);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(redeem ? 'Points redemption applied' : 'Points redemption removed'),
                  ));
                },
                style: FilledButton.styleFrom(
                  backgroundColor: orange,
                  minimumSize: const Size(0, 34),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Text(redeem ? 'Applied' : 'Redeem Points', style: T.playNow.copyWith(fontSize: 11)),
              ),
              if (!compact) ...[
                const SizedBox(height: 4),
                Text('Available: ${NumberFormatHelper.pts(session.pointsBalance)} Pts', style: T.memberMeta.copyWith(fontSize: 10)),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _stickyBar() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEEF1F5))),
        boxShadow: [BoxShadow(color: Color(0x14000000), offset: Offset(0, -2), blurRadius: 6)],
      ),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
      child: Column(
        children: [
          if (showDetails) ...[
            _kv('Subtotal', money(subtotal)),
            _kv('Discount', '- ${money(savings + redeemKes)}', valueColor: const Color(0xFFE53935)),
            _kv('Delivery Fee', money(delivery)),
            const SizedBox(height: 6),
          ],
          Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Total Payable', style: T.memberMeta),
                  Text(money(total), style: T.pdpPrice.copyWith(fontSize: 22)),
                  InkWell(
                    onTap: () => setState(() => showDetails = !showDetails),
                    child: Row(
                      children: [
                        Text('View Price Details', style: T.seeAll.copyWith(fontSize: 11)),
                        Icon(showDetails ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, size: 16, color: const Color(0xFF1A73C7)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: busy || addressId == null || items.isEmpty ? null : (step == 0 ? goToPayment : continuePay),
                  style: FilledButton.styleFrom(
                    backgroundColor: orange,
                    disabledBackgroundColor: const Color(0xFFFFC48A),
                    minimumSize: const Size(0, 48),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: step == 0
                      ? Text(
                          'CONTINUE TO PAYMENT >',
                          textAlign: TextAlign.center,
                          style: T.playNow.copyWith(fontSize: 11, letterSpacing: 0.2),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.lock, color: Colors.white, size: 16),
                            const SizedBox(width: 6),
                            Text(busy ? 'PROCESSING…' : 'PAY NOW', style: T.playNow.copyWith(fontSize: 13, letterSpacing: 0.3)),
                          ],
                        ),
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
              Flexible(
                child: Text(
                  step == 0 ? 'Your payment information is secure and encrypted' : 'You will be redirected to a secure payment page',
                  style: inter(size: 10, color: muted),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
          if (step == 1) ...[
            const SizedBox(height: 12),
            const Row(
              children: [
                Expanded(child: _TrustItem(Icons.verified_user, '100% Secure', 'Encrypted checkout')),
                Expanded(child: _TrustItem(Icons.replay, 'Easy Returns', '7-day returns')),
                Expanded(child: _TrustItem(Icons.headset_mic_outlined, 'Customer Support', 'We are here to help')),
              ],
            ),
          ],
        ],
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

class NumberFormatHelper {
  static String pts(int n) {
    final s = n.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final left = s.length - i;
      buf.write(s[i]);
      if (left > 1 && left % 3 == 1) buf.write(',');
    }
    return buf.toString();
  }
}

String formatPhone(String? raw) {
  final d = (raw ?? '').replaceAll(RegExp(r'\D'), '');
  var n = d;
  if (n.startsWith('254') && n.length >= 12) n = '0${n.substring(3)}';
  if (n.length == 10) return '${n.substring(0, 4)} ${n.substring(4, 7)} ${n.substring(7)}';
  return raw ?? '';
}

class _CheckoutStepper extends StatelessWidget {
  const _CheckoutStepper({required this.active});
  final int active;

  @override
  Widget build(BuildContext context) {
    const steps = [
      (Icons.location_on, 'Delivery'),
      (Icons.credit_card, 'Payment'),
      (Icons.description_outlined, 'Review'),
      (Icons.check_circle_outline, 'Confirm'),
    ];
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.only(bottom: 16),
                color: i <= active ? const Color(0xFFFFC48A) : const Color(0xFFE5E9EF),
              ),
            ),
          Column(
            children: [
              if (i < active)
                Container(
                  width: 26,
                  height: 26,
                  decoration: const BoxDecoration(color: orange, shape: BoxShape.circle),
                  child: const Icon(Icons.check, color: Colors.white, size: 15),
                )
              else
                Icon(steps[i].$1, size: 22, color: i == active ? orange : const Color(0xFFB0B8C1)),
              const SizedBox(height: 4),
              Text(
                i == active && i == 1 ? '2. Payment' : steps[i].$2,
                style: inter(
                  size: 10,
                  weight: i == active || i < active ? FontWeight.w700 : FontWeight.w500,
                  color: i == active || i < active ? orange : const Color(0xFFB0B8C1),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _TrustItem extends StatelessWidget {
  const _TrustItem(this.icon, this.title, this.sub);
  final IconData icon;
  final String title;
  final String sub;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 18, color: navy),
        const SizedBox(height: 4),
        Text(title, textAlign: TextAlign.center, style: inter(size: 10, weight: FontWeight.w800, color: navy)),
        Text(sub, textAlign: TextAlign.center, style: T.memberMeta.copyWith(fontSize: 9)),
      ],
    );
  }
}

class _MpesaOption extends StatelessWidget {
  const _MpesaOption({required this.selected, required this.onTap});
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? orange : const Color(0xFFE8ECF1), width: selected ? 1.8 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? orange : const Color(0xFFC5CDD6), size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _MpessaMark(),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE31C23),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('Safaricom', style: inter(size: 9, weight: FontWeight.w800, color: Colors.white)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text('Pay with M-Pesa', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                      Text('Pay securely via M-Pesa STK Push', style: T.memberMeta.copyWith(fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
            if (selected) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF8EE),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('How it works', style: inter(size: 12, weight: FontWeight.w800, color: const Color(0xFF166534))),
                          const SizedBox(height: 6),
                          Text('1. Click “Pay Now”', style: inter(size: 11, color: const Color(0xFF166534), height: 1.35)),
                          Text('2. You will receive an STK Push', style: inter(size: 11, color: const Color(0xFF166534), height: 1.35)),
                          Text('3. Enter your M-Pesa PIN', style: inter(size: 11, color: const Color(0xFF166534), height: 1.35)),
                        ],
                      ),
                    ),
                    Container(
                      width: 52,
                      height: 72,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.smartphone, color: Color(0xFF16A34A), size: 28),
                          Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 18),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PayRow extends StatelessWidget {
  const _PayRow({
    required this.selected,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.leading,
    this.trailing,
  });

  final bool selected;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Widget leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? orange : const Color(0xFFE8ECF1), width: selected ? 1.6 : 1),
        ),
        child: Row(
          children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? orange : const Color(0xFFC5CDD6), size: 22),
            const SizedBox(width: 10),
            leading,
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                  Text(subtitle, style: T.memberMeta.copyWith(fontSize: 11)),
                ],
              ),
            ),
            if (trailing != null) ...[trailing!, const SizedBox(width: 6)],
            const Icon(Icons.chevron_right, color: muted),
          ],
        ),
      ),
    );
  }
}

class _AddressCard extends StatelessWidget {
  const _AddressCard({
    required this.selected,
    required this.label,
    required this.isDefault,
    required this.name,
    required this.phone,
    required this.line,
    required this.city,
    required this.onTap,
    required this.onEdit,
  });

  final bool selected;
  final String label;
  final bool isDefault;
  final String name;
  final String phone;
  final String line;
  final String city;
  final VoidCallback onTap;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 12, 10, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? orange : const Color(0xFFE8ECF1), width: selected ? 1.6 : 1),
          boxShadow: const [BoxShadow(color: Color(0x0F000000), offset: Offset(0, 2), blurRadius: 4)],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? orange : const Color(0xFFC5CDD6), size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(label, style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                      if (isDefault) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFFFF1E4), borderRadius: BorderRadius.circular(20)),
                          child: Text('Default', style: inter(size: 10, weight: FontWeight.w700, color: orange)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(name, style: inter(size: 13, weight: FontWeight.w600, color: navy)),
                  Text(phone, style: T.memberMeta.copyWith(fontSize: 12)),
                  Text(line, style: T.memberMeta.copyWith(fontSize: 12, height: 1.3)),
                  Text(city, style: T.memberMeta.copyWith(fontSize: 12)),
                ],
              ),
            ),
            InkWell(
              onTap: onEdit,
              child: Row(
                children: [
                  const Icon(Icons.edit_outlined, size: 14, color: muted),
                  const SizedBox(width: 4),
                  Text('Edit', style: inter(size: 12, weight: FontWeight.w600, color: muted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  const _MethodCard({
    required this.selected,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.price,
    required this.onTap,
    this.priceColor = navy,
    this.subtitleColor,
  });

  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final String price;
  final Color priceColor;
  final Color? subtitleColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? orange : const Color(0xFFE8ECF1), width: selected ? 1.6 : 1),
        ),
        child: Row(
          children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? orange : const Color(0xFFC5CDD6), size: 22),
            const SizedBox(width: 10),
            Icon(icon, color: navy, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                  Text(subtitle, style: inter(size: 12, weight: FontWeight.w600, color: subtitleColor ?? muted)),
                ],
              ),
            ),
            Text(price, style: inter(size: 13, weight: FontWeight.w800, color: priceColor)),
            const Icon(Icons.keyboard_arrow_down, size: 18, color: muted),
          ],
        ),
      ),
    );
  }
}

class _PayCard extends StatelessWidget {
  const _PayCard({required this.selected, required this.onTap, required this.child});
  final bool selected;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? orange : const Color(0xFFE8ECF1), width: selected ? 1.6 : 1),
        ),
        child: child,
      ),
    );
  }
}

class _MpessaMark extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFF00A651), borderRadius: BorderRadius.circular(4)),
      child: Text('M-PESA', style: inter(size: 11, weight: FontWeight.w800, color: Colors.white, spacing: 0.4)),
    );
  }
}

class _BrandChip extends StatelessWidget {
  const _BrandChip(this.label, this.color);
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
      child: Text(label, style: inter(size: 9, weight: FontWeight.w800, color: Colors.white)),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.color = Colors.white, this.border = const Color(0xFFE8ECF1)});
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
        boxShadow: const [BoxShadow(color: Color(0x0F000000), offset: Offset(0, 2), blurRadius: 4)],
      ),
      child: child,
    );
  }
}

class _AddressSheet extends StatefulWidget {
  const _AddressSheet({this.existing});
  final Map? existing;

  @override
  State<_AddressSheet> createState() => _AddressSheetState();
}

class _AddressSheetState extends State<_AddressSheet> {
  late final label = TextEditingController(text: widget.existing?['label']?.toString() ?? 'Home');
  late final county = TextEditingController(text: widget.existing?['county']?.toString() ?? 'Nairobi');
  late final city = TextEditingController(text: widget.existing?['city']?.toString() ?? '');
  late final street = TextEditingController(text: widget.existing?['street']?.toString() ?? '');
  late final phone = TextEditingController(text: widget.existing?['phone']?.toString() ?? '');
  bool def = false;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    def = widget.existing?['isDefault'] == true || widget.existing == null;
  }

  @override
  void dispose() {
    label.dispose();
    county.dispose();
    city.dispose();
    street.dispose();
    phone.dispose();
    super.dispose();
  }

  Future<void> save() async {
    setState(() => busy = true);
    try {
      final dio = context.read<Session>().dio;
      final data = {
        'label': label.text.trim().isEmpty ? 'Home' : label.text.trim(),
        'county': county.text.trim(),
        'city': city.text.trim(),
        'street': street.text.trim(),
        'phone': phone.text.trim(),
        'isDefault': def,
      };
      if (widget.existing != null) {
        await dio.patch('/addresses/${widget.existing!['id']}', data: data);
      } else {
        await dio.post('/addresses', data: data);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.existing == null ? 'Add New Address' : 'Edit Address', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 12),
            TextField(controller: label, decoration: const InputDecoration(labelText: 'Label (Home, Office)')),
            TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone'), keyboardType: TextInputType.phone),
            TextField(controller: street, decoration: const InputDecoration(labelText: 'Street / building')),
            TextField(controller: city, decoration: const InputDecoration(labelText: 'City / area')),
            TextField(controller: county, decoration: const InputDecoration(labelText: 'County')),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Set as default'),
              value: def,
              onChanged: (v) => setState(() => def = v),
            ),
            FilledButton(onPressed: busy ? null : save, child: Text(busy ? 'Saving…' : 'Save address')),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
