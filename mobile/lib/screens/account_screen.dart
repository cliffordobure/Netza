import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/storefront_chrome.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  List orders = [];
  List addresses = [];
  Map? wallet;
  String? error;
  bool loading = true;
  bool notifyOrders = true;
  bool notifyDrops = true;
  Session? _session;
  bool _loggedIn = false;

  Map get stats => (wallet?['stats'] as Map?) ?? {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _session = context.read<Session>();
      _loggedIn = _session!.isLoggedIn;
      _session!.addListener(_onSession);
      load();
    });
  }

  @override
  void dispose() {
    _session?.removeListener(_onSession);
    super.dispose();
  }

  void _onSession() {
    final next = _session?.isLoggedIn == true;
    if (next == _loggedIn) return;
    _loggedIn = next;
    if (next) {
      load();
    } else if (mounted) {
      setState(() {
        orders = [];
        addresses = [];
        wallet = null;
        error = null;
        loading = false;
      });
    }
  }

  Future<void> load() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      setState(() => loading = false);
      return;
    }
    try {
      final results = await Future.wait([
        session.dio.get('/orders'),
        session.dio.get('/addresses'),
        session.dio.get('/points/wallet'),
      ]);
      await session.refreshWallet();
      await session.refreshCart();
      if (!mounted) return;
      setState(() {
        orders = (results[0].data['orders'] as List?) ?? [];
        addresses = (results[1].data['addresses'] as List?) ?? [];
        wallet = Map<String, dynamic>.from(results[2].data as Map);
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

  int get balance => (wallet?['balance'] as num?)?.toInt() ?? context.read<Session>().pointsBalance;
  int get earned => (wallet?['totalEarned'] as num?)?.toInt() ?? balance;
  int get kesValue => (wallet?['kesValue'] as num?)?.toInt() ?? (balance ~/ 10);
  int get vouchers => (stats['vouchers'] as num?)?.toInt() ?? 0;
  int get reviewCount => (stats['reviewCount'] as num?)?.toInt() ?? 0;

  List get delivering {
    return orders.where((o) {
      final s = ((o as Map)['status'] ?? '').toString().toUpperCase();
      return s == 'PAID' || s == 'PROCESSING' || s == 'SHIPPED' || s == 'IN_TRANSIT';
    }).toList();
  }

  void toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void sheet({required String title, required Widget child}) {
    final width = MediaQuery.sizeOf(context).width;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      constraints: BoxConstraints(maxWidth: width, minWidth: width),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, 28 + MediaQuery.viewInsetsOf(ctx).bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }

  void showAddresses() {
    sheet(
      title: 'Addresses',
      child: addresses.isEmpty
          ? Text('No saved addresses yet.', style: T.memberMeta)
          : Column(
              children: addresses.map((raw) {
                final a = raw as Map;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(a['isDefault'] == true ? Icons.home : Icons.location_on_outlined, color: purple),
                  title: Text('${a['label'] ?? 'Address'} · ${a['city'] ?? ''}', style: inter(size: 14, weight: FontWeight.w700, color: navy)),
                  subtitle: Text('${a['street'] ?? ''}, ${a['county'] ?? ''}', style: T.memberMeta),
                );
              }).toList(),
            ),
    );
  }

  void showPayments() {
    sheet(
      title: 'Payment Methods',
      child: Column(
        children: [
          _PayRow(Icons.phone_android, 'M-Pesa', 'Pay with your Safaricom number'),
          _PayRow(Icons.credit_card, 'Card', 'Visa, Mastercard'),
          _PayRow(Icons.account_balance_wallet_outlined, 'Pesapal', 'Card & mobile money'),
          _PayRow(Icons.stars_rounded, 'NETZA Points', 'Redeem at checkout'),
        ],
      ),
    );
  }

  void showVouchers() {
    sheet(
      title: 'My Vouchers',
      child: Text(
        vouchers == 0 ? 'No vouchers yet. Redeem points to get discount coupons.' : 'You have $vouchers redeemed reward${vouchers == 1 ? '' : 's'}.',
        style: T.memberMeta.copyWith(fontSize: 13, height: 1.35),
      ),
    );
  }

  void showHelp() {
    sheet(
      title: 'Help Center',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('We’re here to help you 24/7.', style: T.memberMeta.copyWith(fontSize: 13, height: 1.35)),
          const SizedBox(height: 10),
          Text('Call +254 700 000 000', style: inter(size: 14, weight: FontWeight.w700, color: navy)),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {
                Navigator.pop(context);
                toast('Support request sent. We’ll get back to you shortly.');
              },
              style: FilledButton.styleFrom(backgroundColor: purple),
              child: Text('Contact Support', style: T.playNow),
            ),
          ),
        ],
      ),
    );
  }

  void showBenefits() {
    sheet(
      title: 'Membership Benefits',
      child: Column(
        children: const [
          _Benefit('Earn points on every purchase'),
          _Benefit('Exclusive member discounts'),
          _Benefit('Early access to Flash Drops'),
          _Benefit('Special vouchers & rewards'),
          _Benefit('Priority customer support'),
        ],
      ),
    );
  }

  void showPersonal() {
    final u = context.read<Session>().user ?? {};
    final first = TextEditingController(text: u['firstName']?.toString() ?? '');
    final last = TextEditingController(text: u['lastName']?.toString() ?? '');
    final email = TextEditingController(text: u['email']?.toString() ?? '');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width, minWidth: MediaQuery.sizeOf(context).width),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + MediaQuery.viewInsetsOf(ctx).bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Personal Information', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 12),
            TextField(controller: first, decoration: const InputDecoration(labelText: 'First name')),
            TextField(controller: last, decoration: const InputDecoration(labelText: 'Last name')),
            TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 6),
            Text('Phone ${_phone(u['phone']?.toString() ?? '')}', style: T.memberMeta),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () async {
                  try {
                    final session = context.read<Session>();
                    final res = await session.dio.patch('/auth/profile', data: {
                      'firstName': first.text.trim(),
                      'lastName': last.text.trim(),
                      'email': email.text.trim(),
                    });
                    session.updateUser(Map<String, dynamic>.from(res.data['user'] as Map));
                    if (ctx.mounted) Navigator.pop(ctx);
                    toast('Profile updated');
                  } catch (e) {
                    toast(apiMessage(e));
                  }
                },
                style: FilledButton.styleFrom(backgroundColor: purple),
                child: Text('Save', style: T.playNow),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void showPassword() {
    sheet(
      title: 'Change Password',
      child: Text('Password changes from the app will be available soon. Contact support if you need a reset.', style: T.memberMeta.copyWith(fontSize: 13, height: 1.35)),
    );
  }

  void showPrivacy() {
    sheet(
      title: 'Privacy & Security',
      child: Text('Your orders, addresses and points stay on your NETZA Kenya account. We never share your phone number with other shoppers.', style: T.memberMeta.copyWith(fontSize: 13, height: 1.35)),
    );
  }

  void showNotifyPrefs() {
    sheet(
      title: 'Notification Preferences',
      child: StatefulBuilder(
        builder: (ctx, set) => Column(
          children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('Order updates', style: inter(size: 14, weight: FontWeight.w700, color: navy)),
              value: notifyOrders,
              activeTrackColor: purple,
              onChanged: (v) => set(() => notifyOrders = v),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('Flash Drop alerts', style: inter(size: 14, weight: FontWeight.w700, color: navy)),
              value: notifyDrops,
              activeTrackColor: purple,
              onChanged: (v) => set(() => notifyDrops = v),
            ),
          ],
        ),
      ),
    );
  }

  void invite() {
    final code = context.read<Session>().user?['referralCode']?.toString() ?? 'NETZA';
    Clipboard.setData(ClipboardData(text: 'Join me on NETZA Kenya! Use my code $code and we both earn points.'));
    toast('Invite copied. Share it with a friend.');
  }

  Future<void> logout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You’ll need to sign in again to view orders and points.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await context.read<Session>().logout();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    if (!session.isLoggedIn) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Column(
            children: [
              const Padding(padding: EdgeInsets.fromLTRB(12, 4, 12, 0), child: _AccountHeader()),
              const Spacer(),
              const Icon(Icons.person_outline, size: 48, color: muted),
              const SizedBox(height: 12),
              Text('Sign in to view your account', style: T.memberTitle),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.push('/login'),
                style: FilledButton.styleFrom(backgroundColor: orange, minimumSize: const Size(220, 46)),
                child: Text('Sign in', style: T.playNow.copyWith(fontSize: 14)),
              ),
              const Spacer(),
            ],
          ),
        ),
      );
    }

    final u = session.user ?? {};
    final member = membershipProgress(u['membershipLevel']?.toString() ?? 'BRONZE', earned);
    final target = earned + member.remaining;
    final wide = MediaQuery.sizeOf(context).width >= 520;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        child: Column(
          children: [
            const Padding(padding: EdgeInsets.fromLTRB(12, 4, 12, 0), child: _AccountHeader()),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator(color: orange))
                  : RefreshIndicator(
                      color: orange,
                      onRefresh: load,
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                        children: [
                          if (error != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(error!, style: inter(size: 13, color: Colors.red)),
                            ),
                          _ProfileCard(
                            user: u,
                            balance: balance,
                            kesValue: kesValue,
                            member: member.current,
                            onPoints: () => context.go('/points'),
                            onPhoto: () => toast('Profile photo coming soon'),
                          ),
                          const SizedBox(height: 12),
                          _StatsGrid(
                            orders: orders.length,
                            delivering: delivering.length,
                            reviews: reviewCount,
                            wishlist: 0,
                            onOrders: () => context.go('/orders'),
                            onTrack: () => context.go('/orders'),
                            onReviews: () => toast(reviewCount == 0 ? 'No reviews yet' : 'You have $reviewCount review${reviewCount == 1 ? '' : 's'}'),
                            onWishlist: () => toast('No saved items yet'),
                          ),
                          const SizedBox(height: 16),
                          _SectionHead(
                            title: 'Quick Access',
                            action: 'View All',
                            onTap: () => sheet(
                              title: 'Quick Access',
                              child: Column(
                                children: [
                                  _PayRow(Icons.shield_outlined, 'Addresses', 'Delivery locations'),
                                  _PayRow(Icons.credit_card, 'Payment Methods', 'M-Pesa, card, Pesapal'),
                                  _PayRow(Icons.confirmation_number_outlined, 'My Vouchers', vouchers == 0 ? 'No vouchers yet' : '$vouchers voucher${vouchers == 1 ? '' : 's'}'),
                                  _PayRow(Icons.local_activity_outlined, 'My Coupons', 'Redeem from Points'),
                                  _PayRow(Icons.gps_fixed, 'Returns & Refunds', 'No open returns'),
                                  _PayRow(Icons.help_outline, 'Help Center', '24/7 support'),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          _QuickAccess(
                            voucherBadge: vouchers,
                            onTap: (k) {
                              switch (k) {
                                case 'Addresses':
                                  showAddresses();
                                case 'Payment Methods':
                                  showPayments();
                                case 'My Vouchers':
                                  showVouchers();
                                case 'My Coupons':
                                  context.go('/points');
                                case 'Returns & Refunds':
                                  toast('No open returns');
                                case 'Help Center':
                                  showHelp();
                              }
                            },
                          ),
                          const SizedBox(height: 16),
                          _MembershipCard(
                            member: member,
                            earned: earned,
                            target: target,
                            wide: wide,
                            onBenefits: showBenefits,
                          ),
                          const SizedBox(height: 16),
                          _SectionHead(title: 'Recent Orders', action: 'View All Orders', onTap: () => context.go('/orders')),
                          const SizedBox(height: 10),
                          if (orders.isEmpty)
                            Text('No orders yet. Your Flash Drops and shop buys will show up here.', style: T.memberMeta)
                          else
                            ...orders.take(3).map((raw) {
                              final o = Map<String, dynamic>.from(raw as Map);
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: _OrderRow(order: o, onTap: () => context.push('/order/${o['id'] ?? o['orderNumber']}')),
                              );
                            }),
                          const SizedBox(height: 8),
                          _ActionsGrid(
                            onPersonal: showPersonal,
                            onPassword: showPassword,
                            onNotify: showNotifyPrefs,
                            onPrivacy: showPrivacy,
                            onLanguage: () => toast('English is the current language'),
                            onLogout: logout,
                          ),
                          const SizedBox(height: 12),
                          _FooterBanners(onSupport: showHelp, onInvite: invite),
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

class _AccountHeader extends StatelessWidget {
  const _AccountHeader();

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<Session>().cartCount;
    return Row(
      children: [
        const NetzaLogo(),
        const SizedBox(width: 8),
        Expanded(
          child: Text('My Account', textAlign: TextAlign.center, style: inter(size: 14, weight: FontWeight.w800, color: navy)),
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
        const SizedBox(width: 8),
        InkWell(
          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Use Account actions below for settings')),
          ),
          child: const Icon(Icons.settings_outlined, color: navy, size: 22),
        ),
      ],
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.user,
    required this.balance,
    required this.kesValue,
    required this.member,
    required this.onPoints,
    required this.onPhoto,
  });
  final Map user;
  final int balance;
  final int kesValue;
  final String member;
  final VoidCallback onPoints;
  final VoidCallback onPhoto;

  @override
  Widget build(BuildContext context) {
    final name = '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();
    final first = (user['firstName'] ?? 'N').toString();
    final last = (user['lastName'] ?? 'K').toString();
    final initials = '${first.isEmpty ? 'N' : first[0]}${last.isEmpty ? 'K' : last[0]}';
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF6D28D9), Color(0xFF4C1D95), Color(0xFF2E1065)],
        ),
      ),
      child: Row(
        children: [
          Stack(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: const Color(0xFF8B5CF6),
                child: Text(initials.toUpperCase(), style: inter(size: 16, weight: FontWeight.w800, color: Colors.white)),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: InkWell(
                  onTap: onPhoto,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                    child: const Icon(Icons.photo_camera, size: 12, color: purple),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: inter(size: 15, weight: FontWeight.w800, color: Colors.white))),
                    const SizedBox(width: 4),
                    const Icon(Icons.verified, size: 16, color: Color(0xFF93C5FD)),
                  ],
                ),
                Text((user['email'] ?? '').toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: inter(size: 11, color: const Color(0xFFDDD6FE))),
                Row(
                  children: [
                    const Icon(Icons.phone, size: 11, color: Color(0xFFDDD6FE)),
                    const SizedBox(width: 4),
                    Flexible(child: Text(_phone(user['phone']?.toString() ?? ''), style: inter(size: 11, color: const Color(0xFFDDD6FE)))),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0x668B5CF6), borderRadius: BorderRadius.circular(99)),
                  child: Text('$member Member', style: inter(size: 10, weight: FontWeight.w700, color: Colors.white, height: 1.0)),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: onPoints,
            child: Container(
              width: 104,
              padding: const EdgeInsets.fromLTRB(8, 10, 8, 10),
              decoration: BoxDecoration(color: const Color(0x33000000), borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  const Icon(Icons.star, color: orange, size: 18),
                  Text('NETZA Points', style: inter(size: 9, color: const Color(0xFFE9D5FF))),
                  Text(
                    '${_pts(balance)} Points',
                    textAlign: TextAlign.center,
                    style: inter(size: 14, weight: FontWeight.w800, color: Colors.white, height: 1.15),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(child: Text('≈ ${money(kesValue)}', style: inter(size: 9, color: const Color(0xFFC4B5FD)))),
                      const Icon(Icons.chevron_right, size: 14, color: Color(0xFFC4B5FD)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({
    required this.orders,
    required this.delivering,
    required this.reviews,
    required this.wishlist,
    required this.onOrders,
    required this.onTrack,
    required this.onReviews,
    required this.onWishlist,
  });
  final int orders;
  final int delivering;
  final int reviews;
  final int wishlist;
  final VoidCallback onOrders;
  final VoidCallback onTrack;
  final VoidCallback onReviews;
  final VoidCallback onWishlist;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _StatCard(Icons.shopping_bag_outlined, purple, '$orders', 'Orders', 'View all orders >', onOrders)),
            const SizedBox(width: 8),
            Expanded(child: _StatCard(Icons.local_shipping_outlined, const Color(0xFF16A34A), '$delivering', 'To be Delivered', 'Track orders >', onTrack)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: _StatCard(Icons.star, orange, '$reviews', 'Reviews', 'Your reviews >', onReviews)),
            const SizedBox(width: 8),
            Expanded(child: _StatCard(Icons.favorite, const Color(0xFFE11D48), '$wishlist', 'Wishlist', 'Saved items >', onWishlist)),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.icon, this.color, this.value, this.label, this.link, this.onTap);
  final IconData icon;
  final Color color;
  final String value;
  final String label;
  final String link;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 12, 10, 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFEEF1F5)),
          boxShadow: const [BoxShadow(color: Color(0x0F071526), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 6),
            Text(value, style: inter(size: 20, weight: FontWeight.w800, color: navy, height: 1.0)),
            Text(label, style: inter(size: 12, weight: FontWeight.w700, color: navy)),
            const SizedBox(height: 4),
            Text(link, style: inter(size: 11, weight: FontWeight.w600, color: purple)),
          ],
        ),
      ),
    );
  }
}

class _SectionHead extends StatelessWidget {
  const _SectionHead({required this.title, required this.action, required this.onTap});
  final String title;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(title, style: inter(size: 15, weight: FontWeight.w800, color: navy)),
        const Spacer(),
        InkWell(onTap: onTap, child: Text(action, style: inter(size: 12, weight: FontWeight.w700, color: purple))),
      ],
    );
  }
}

class _QuickAccess extends StatelessWidget {
  const _QuickAccess({required this.onTap, required this.voucherBadge});
  final void Function(String) onTap;
  final int voucherBadge;

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.shield_outlined, 'Addresses'),
      (Icons.credit_card, 'Payment Methods'),
      (Icons.confirmation_number_outlined, 'My Vouchers'),
      (Icons.local_activity_outlined, 'My Coupons'),
      (Icons.gps_fixed, 'Returns & Refunds'),
      (Icons.help_outline, 'Help Center'),
    ];
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 8,
      childAspectRatio: 1.15,
      children: items.map((it) {
        final badge = it.$2 == 'My Vouchers' && voucherBadge > 0;
        return InkWell(
          onTap: () => onTap(it.$2),
          child: Column(
            children: [
              Badge(
                isLabelVisible: badge,
                label: Text('$voucherBadge', style: inter(size: 9, weight: FontWeight.w700, color: Colors.white)),
                backgroundColor: const Color(0xFFE53935),
                child: Container(
                  width: 46,
                  height: 46,
                  decoration: const BoxDecoration(color: Color(0xFFEEE7FB), shape: BoxShape.circle),
                  child: Icon(it.$1, color: purple, size: 22),
                ),
              ),
              const SizedBox(height: 6),
              Text(it.$2, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 10, weight: FontWeight.w600, color: navy, height: 1.15)),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _MembershipCard extends StatelessWidget {
  const _MembershipCard({required this.member, required this.earned, required this.target, required this.wide, required this.onBenefits});
  final ({String next, int remaining, double progress, String current}) member;
  final int earned;
  final int target;
  final bool wide;
  final VoidCallback onBenefits;

  @override
  Widget build(BuildContext context) {
    final status = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.workspace_premium, color: _medalColor(member.current), size: 22),
            const SizedBox(width: 6),
            Text('Membership Status', style: inter(size: 12, weight: FontWeight.w700, color: muted)),
          ],
        ),
        const SizedBox(height: 4),
        Text('${member.current} Member', style: inter(size: 16, weight: FontWeight.w800, color: purple)),
        Text(
          member.remaining == 0 ? 'Highest tier unlocked' : '${_pts(member.remaining)} pts to reach ${member.next}',
          style: T.memberMeta,
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: member.progress,
            minHeight: 8,
            color: orange,
            backgroundColor: const Color(0xFFE9EDF2),
          ),
        ),
        const SizedBox(height: 4),
        Text('${_pts(earned)} / ${_pts(target)} pts', style: inter(size: 11, weight: FontWeight.w700, color: navy)),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: onBenefits,
          icon: const Icon(Icons.workspace_premium, size: 14, color: purple),
          label: Text('View Membership Benefits >', style: inter(size: 11, weight: FontWeight.w700, color: purple, height: 1.0)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: purple),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            minimumSize: const Size(0, 34),
          ),
        ),
      ],
    );
    const benefits = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Member Benefits', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: navy)),
        SizedBox(height: 8),
        _Benefit('Earn points on every purchase'),
        _Benefit('Exclusive member discounts'),
        _Benefit('Early access to Flash Drops'),
        _Benefit('Special vouchers & rewards'),
        _Benefit('Priority customer support'),
      ],
    );
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0F071526), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: wide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: status),
                const SizedBox(width: 16),
                const Expanded(child: benefits),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [status, const SizedBox(height: 14), benefits],
            ),
    );
  }
}

class _Benefit extends StatelessWidget {
  const _Benefit(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 16, color: purple),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: inter(size: 12, color: navy, height: 1.25))),
        ],
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order, required this.onTap});
  final Map order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final items = (order['items'] as List?) ?? [];
    final first = items.isNotEmpty ? items.first as Map : {};
    final name = (first['name'] ?? order['orderNumber'] ?? 'Order').toString();
    final image = first['image']?.toString();
    final status = (order['status'] ?? '').toString();
    final created = DateTime.tryParse(order['createdAt']?.toString() ?? '');
    final pts = (order['pointsEarned'] as num?)?.toInt() ?? ((order['totalKes'] as num?)?.toInt() ?? 0) ~/ 100;
    final style = _statusStyle(status);
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFEEF1F5)),
          boxShadow: const [BoxShadow(color: Color(0x0F071526), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(width: 48, height: 48, child: NetzaImage(image, fallback: Icons.inventory_2_outlined)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                  Text(
                    '${order['orderNumber'] ?? ''} · ${created == null ? '' : DateFormat('d MMM yyyy').format(created.toLocal())}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: T.memberMeta.copyWith(fontSize: 11),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: style.$2, borderRadius: BorderRadius.circular(6)),
                        child: Text(style.$1, style: inter(size: 10, weight: FontWeight.w800, color: style.$3, height: 1.0)),
                      ),
                      const Spacer(),
                      Text(money(order['totalKes']), style: inter(size: 12, weight: FontWeight.w800, color: navy)),
                      const SizedBox(width: 6),
                      Text('+${_pts(pts)} pts', style: inter(size: 11, weight: FontWeight.w700, color: purple)),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: muted),
          ],
        ),
      ),
    );
  }
}

class _ActionsGrid extends StatelessWidget {
  const _ActionsGrid({
    required this.onPersonal,
    required this.onPassword,
    required this.onNotify,
    required this.onPrivacy,
    required this.onLanguage,
    required this.onLogout,
  });
  final VoidCallback onPersonal;
  final VoidCallback onPassword;
  final VoidCallback onNotify;
  final VoidCallback onPrivacy;
  final VoidCallback onLanguage;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0F071526), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _ActionTile(Icons.person_outline, 'Personal Information', onPersonal)),
              Expanded(child: _ActionTile(Icons.verified_user_outlined, 'Privacy & Security', onPrivacy)),
            ],
          ),
          const Divider(height: 1, color: Color(0xFFEEF1F5)),
          Row(
            children: [
              Expanded(child: _ActionTile(Icons.vpn_key_outlined, 'Change Password', onPassword)),
              Expanded(child: _ActionTile(Icons.language, 'Language', onLanguage, trailing: 'English')),
            ],
          ),
          const Divider(height: 1, color: Color(0xFFEEF1F5)),
          Row(
            children: [
              Expanded(child: _ActionTile(Icons.notifications_outlined, 'Notification Preferences', onNotify)),
              Expanded(child: _ActionTile(Icons.logout, 'Logout', onLogout, danger: true)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile(this.icon, this.label, this.onTap, {this.trailing, this.danger = false});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? const Color(0xFFDC2626) : navy;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
        child: Row(
          children: [
            Icon(icon, size: 18, color: danger ? const Color(0xFFDC2626) : purple),
            const SizedBox(width: 8),
            Expanded(child: Text(label, maxLines: 2, style: inter(size: 11, weight: FontWeight.w700, color: color, height: 1.2))),
            if (trailing != null) Text(trailing!, style: T.memberMeta.copyWith(fontSize: 10)),
            Icon(Icons.chevron_right, size: 16, color: danger ? const Color(0xFFDC2626) : muted),
          ],
        ),
      ),
    );
  }
}

class _FooterBanners extends StatelessWidget {
  const _FooterBanners({required this.onSupport, required this.onInvite});
  final VoidCallback onSupport;
  final VoidCallback onInvite;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFEEE7FB), borderRadius: BorderRadius.circular(14)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.headset_mic, color: purple),
                const SizedBox(height: 6),
                Text('Need Help?', style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                Text('We’re here to help you 24/7', style: T.memberMeta.copyWith(fontSize: 11, height: 1.25)),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  height: 32,
                  child: FilledButton(
                    onPressed: onSupport,
                    style: FilledButton.styleFrom(backgroundColor: purple, padding: EdgeInsets.zero),
                    child: Text('Contact Support', style: inter(size: 10, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFECFDF3), borderRadius: BorderRadius.circular(14)),
            child: Stack(
              children: [
                Positioned(
                  right: 0,
                  top: 0,
                  child: Icon(Icons.card_giftcard, size: 36, color: const Color(0xFF16A34A).withValues(alpha: 0.25)),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.groups_outlined, color: Color(0xFF16A34A)),
                    const SizedBox(height: 6),
                    Text('Refer & Earn', style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                    Text('Invite friends and earn up to 500 points', style: T.memberMeta.copyWith(fontSize: 11, height: 1.25)),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 32,
                      child: FilledButton(
                        onPressed: onInvite,
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF16A34A), padding: EdgeInsets.zero),
                        child: Text('Invite Friends', style: inter(size: 10, weight: FontWeight.w800, color: Colors.white, height: 1.0)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PayRow extends StatelessWidget {
  const _PayRow(this.icon, this.title, this.sub);
  final IconData icon;
  final String title;
  final String sub;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: purple),
      title: Text(title, style: inter(size: 14, weight: FontWeight.w700, color: navy)),
      subtitle: Text(sub, style: T.memberMeta),
    );
  }
}

Color _medalColor(String current) {
  switch (current.toLowerCase()) {
    case 'gold':
      return gold;
    case 'platinum':
      return const Color(0xFF94A3B8);
    case 'silver':
      return const Color(0xFFC0C7D1);
    default:
      return const Color(0xFFCD7F32);
  }
}

(String, Color, Color) _statusStyle(String raw) {
  final s = raw.toUpperCase();
  if (s == 'DELIVERED') return ('Delivered', const Color(0xFFDCFCE7), const Color(0xFF166534));
  if (s == 'SHIPPED' || s == 'IN_TRANSIT') return ('Shipped', const Color(0xFFDBEAFE), const Color(0xFF1D4ED8));
  if (s == 'CANCELLED') return ('Cancelled', const Color(0xFFFEE2E2), const Color(0xFFB91C1C));
  if (s == 'PROCESSING' || s == 'PAID') return ('Processing', const Color(0xFFFFEDD5), const Color(0xFFC2410C));
  return ('Processing', const Color(0xFFFFEDD5), const Color(0xFFC2410C));
}

String _phone(String raw) {
  final d = raw.replaceAll(RegExp(r'\D'), '');
  if (d.startsWith('254') && d.length >= 12) {
    return '+254 ${d.substring(3, 6)} ${d.substring(6, 9)} ${d.substring(9)}';
  }
  if (d.startsWith('0') && d.length >= 10) {
    return '+254 ${d.substring(1, 4)} ${d.substring(4, 7)} ${d.substring(7)}';
  }
  return raw;
}

String _pts(int n) {
  return NumberFormat('#,###').format(n);
}
