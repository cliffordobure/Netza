import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/storefront_chrome.dart';

class PointsScreen extends StatefulWidget {
  const PointsScreen({super.key});

  @override
  State<PointsScreen> createState() => _PointsScreenState();
}

class _PointsScreenState extends State<PointsScreen> {
  final scroll = ScrollController();
  final earnKey = GlobalKey();
  final redeemKey = GlobalKey();
  Map? wallet;
  List txns = [];
  String? error;

  Map get stats => (wallet?['stats'] as Map?) ?? {};

  int get balance => (wallet?['balance'] as num?)?.toInt() ?? context.read<Session>().pointsBalance;

  int get earned => (wallet?['totalEarned'] as num?)?.toInt() ?? balance;

  int get kesValue => (wallet?['kesValue'] as num?)?.toInt() ?? (balance ~/ 10);

  int get streak => (wallet?['loginStreak'] as num?)?.toInt() ?? 0;

  String get referralCode => wallet?['referralCode']?.toString() ?? context.read<Session>().user?['referralCode']?.toString() ?? '';

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    scroll.dispose();
    super.dispose();
  }

  Future<void> load() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) return;
    try {
      final res = await Future.wait([
        session.dio.get('/points/wallet'),
        session.dio.get('/points/transactions'),
      ]);
      if (!mounted) return;
      setState(() {
        wallet = Map<String, dynamic>.from(res[0].data as Map);
        txns = res[1].data['transactions'] as List? ?? [];
        error = null;
      });
      await session.refreshWallet();
    } catch (e) {
      if (!mounted) return;
      setState(() => error = apiMessage(e));
    }
  }

  void jumpTo(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx == null) return;
    Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 350), curve: Curves.easeOut, alignment: 0.08);
  }

  Future<void> redeem(String key, String title, int cost) async {
    if (balance < cost) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('You need ${_pts(cost)} points to redeem $title')));
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Redeem $title', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
        content: Text('This will use ${_pts(cost)} Tajira Points.', style: T.memberMeta.copyWith(fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Redeem')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<Session>().dio.post('/points/redeem', data: {'rewardKey': key});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$title added to My Vouchers')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    }
  }

  void copyReferral() {
    Clipboard.setData(ClipboardData(text: referralCode));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Referral code $referralCode copied')));
  }

  void showBenefits() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Point Benefits', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 6),
            Text('100 Points = KSh 10', style: T.memberMeta),
            const SizedBox(height: 14),
            _tierRow('Bronze', '0 pts', const Color(0xFFCD7F32)),
            _tierRow('Silver', '1,000 pts', const Color(0xFFC0C7D1)),
            _tierRow('Gold', '5,000 pts', gold),
            _tierRow('Platinum', '15,000 pts', purple),
          ],
        ),
      ),
    );
  }

  void showHistory() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (_, c) => ListView(
          controller: c,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text('Points History', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 12),
            if (txns.isEmpty) Text('No points activity yet.', style: T.memberMeta),
            ...txns.map((t) => _HistoryTile(Map<String, dynamic>.from(t as Map))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    if (!session.isLoggedIn) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.stars_rounded, color: purple, size: 48),
                  const SizedBox(height: 12),
                  Text('Tajira Points & Rewards', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
                  const SizedBox(height: 8),
                  Text('Sign in to view your points, redeem rewards and track your streak.', textAlign: TextAlign.center, style: T.memberMeta),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: () => context.push('/login'), child: const Text('Sign in')),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final member = membershipProgress(wallet?['membershipLevel']?.toString() ?? session.user?['membershipLevel']?.toString() ?? 'BRONZE', earned);
    final history = txns.take(5).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(12, 4, 12, 0),
              child: _PointsHeader(),
            ),
            Expanded(
              child: RefreshIndicator(
                color: orange,
                onRefresh: load,
                child: ListView(
                  controller: scroll,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                  children: [
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(error!, style: inter(size: 12, color: Colors.red)),
                      ),
                    _HeroCard(
                      balance: balance,
                      kesValue: kesValue,
                      member: member,
                      earned: earned,
                      onRedeem: () => jumpTo(redeemKey),
                      onEarn: () => jumpTo(earnKey),
                      onBenefits: showBenefits,
                    ),
                    const SizedBox(height: 14),
                    _StatsRow(
                      streak: streak,
                      challenge: (stats['challengeThisMonth'] as num?)?.toInt() ?? 0,
                      referral: (stats['referralLifetime'] as num?)?.toInt() ?? 0,
                      flash: (stats['flashDropThisMonth'] as num?)?.toInt() ?? 0,
                    ),
                    const SizedBox(height: 18),
                    KeyedSubtree(
                      key: earnKey,
                      child: _SectionHead(
                        title: 'How to Earn Points',
                        action: 'View All',
                        onTap: () => _showEarnAll(),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 168,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _earnItems.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (_, i) => _EarnCard(
                          item: _earnItems[i],
                          onTap: () => _onEarnTap(_earnItems[i].title),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    KeyedSubtree(
                      key: redeemKey,
                      child: _SectionHead(
                        title: 'Redeem Your Points',
                        action: 'View All Rewards',
                        onTap: () => jumpTo(redeemKey),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 196,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _rewards.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (_, i) {
                          final r = _rewards[i];
                          return _RewardCard(
                            reward: r,
                            onTap: () => redeem(r.key, r.title, r.cost),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 18),
                    _SectionHead(title: 'Points History', action: 'View All History', onTap: showHistory),
                    const SizedBox(height: 8),
                    if (history.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text('No points activity yet. Place an order to start earning.', style: T.memberMeta),
                      )
                    else
                      ...history.map((t) => _HistoryTile(Map<String, dynamic>.from(t as Map))),
                    const SizedBox(height: 14),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Expanded(flex: 3, child: _ChallengePromo()),
                        const SizedBox(width: 10),
                        const Expanded(flex: 2, child: _ExpiryCard()),
                      ],
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 2.15,
                      children: [
                        _QuickTile(
                          icon: Icons.confirmation_number_outlined,
                          title: 'My Vouchers',
                          subtitle: '${stats['vouchers'] ?? 0} Available',
                          onTap: showHistory,
                        ),
                        _QuickTile(
                          icon: Icons.emoji_events_outlined,
                          title: 'My Challenges',
                          subtitle: '${stats['challengesActive'] ?? 0} Active',
                          onTap: () => context.push('/challenges'),
                        ),
                        _QuickTile(
                          icon: Icons.group_outlined,
                          title: 'Referrals',
                          subtitle: 'Invite & Earn',
                          onTap: copyReferral,
                        ),
                        _QuickTile(
                          icon: Icons.workspace_premium_outlined,
                          title: 'Point Benefits',
                          subtitle: 'View all tiers',
                          onTap: showBenefits,
                        ),
                      ],
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

  void _showEarnAll() {
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
            Text('How to Earn Points', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 12),
            ..._earnItems.map((e) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: _TintIcon(e.icon, e.color),
                  title: Text(e.title, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                  subtitle: Text('${e.body}\n${e.rate}', style: T.memberMeta.copyWith(height: 1.3)),
                  isThreeLine: true,
                  onTap: () {
                    Navigator.pop(ctx);
                    _onEarnTap(e.title);
                  },
                )),
          ],
        ),
      ),
    );
  }

  void _onEarnTap(String title) {
    if (title == 'Place an Order') {
      context.go('/shop');
    } else if (title == 'Write a Review') {
      context.go('/orders');
    } else if (title == 'Refer a Friend') {
      copyReferral();
    } else if (title == 'Daily Login') {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Login daily to keep your streak going')));
    } else if (title == 'Join Challenges') {
      context.push('/challenges');
    }
  }

  Widget _tierRow(String name, String pts, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(Icons.workspace_premium, color: color, size: 22),
          const SizedBox(width: 10),
          Text('$name Member', style: inter(size: 14, weight: FontWeight.w700, color: navy)),
          const Spacer(),
          Text(pts, style: T.memberMeta),
        ],
      ),
    );
  }
}

class _PointsHeader extends StatelessWidget {
  const _PointsHeader();

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<Session>().cartCount;
    return Row(
      children: [
        const TajiraLogo(),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            'Tajira Points & Rewards',
            textAlign: TextAlign.center,
            maxLines: 2,
            style: inter(size: 13, weight: FontWeight.w800, color: navy, height: 1.15),
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

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.balance,
    required this.kesValue,
    required this.member,
    required this.earned,
    required this.onRedeem,
    required this.onEarn,
    required this.onBenefits,
  });
  final int balance;
  final int kesValue;
  final ({String next, int remaining, double progress, String current}) member;
  final int earned;
  final VoidCallback onRedeem;
  final VoidCallback onEarn;
  final VoidCallback onBenefits;

  Color get badgeColor {
    switch (member.current.toLowerCase()) {
      case 'gold':
        return gold;
      case 'platinum':
        return const Color(0xFFE9D5FF);
      case 'bronze':
        return const Color(0xFFCD7F32);
      default:
        return const Color(0xFFC0C7D1);
    }
  }

  int get ceil {
    switch (member.current.toLowerCase()) {
      case 'bronze':
        return 1000;
      case 'silver':
        return 5000;
      case 'gold':
        return 15000;
      default:
        return 15000;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFF6D28D9), Color(0xFF312E81)],
        ),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text('My Tajira Points Balance', style: inter(size: 11, weight: FontWeight.w500, color: Colors.white70)),
                        const SizedBox(width: 4),
                        const Icon(Icons.info_outline, size: 14, color: Colors.white70),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.monetization_on, color: gold, size: 28),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            '${_pts(balance)} Points',
                            style: inter(size: 22, weight: FontWeight.w800, color: Colors.white, height: 1.1),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '= KSh ${_pts(kesValue)} (100 Points = KSh 10)',
                      style: inter(size: 11, color: Colors.white70),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 4,
                child: Column(
                  children: [
                    Icon(Icons.workspace_premium, color: badgeColor, size: 36),
                    const SizedBox(height: 2),
                    Text('${member.current} Member', textAlign: TextAlign.center, style: inter(size: 11, weight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 2),
                    Text(
                      member.remaining == 0 ? 'Highest tier unlocked' : '${_pts(member.remaining)} pts to ${member.next}',
                      textAlign: TextAlign.center,
                      style: inter(size: 10, color: Colors.white70),
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: member.progress,
                        minHeight: 6,
                        color: gold,
                        backgroundColor: Colors.white24,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text('${_pts(earned)} / ${_pts(ceil)} pts', style: inter(size: 9, color: Colors.white70)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: onRedeem,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: purple,
                    minimumSize: const Size(0, 38),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text('Redeem Points', style: inter(size: 11, weight: FontWeight.w800, color: purple)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onEarn,
                  icon: const Icon(Icons.monetization_on, size: 14, color: Colors.white),
                  label: Text('Earn More Points', style: inter(size: 10, weight: FontWeight.w700, color: Colors.white)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white70),
                    minimumSize: const Size(0, 38),
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: InkWell(
              onTap: onBenefits,
              child: Text('View Benefits >', style: inter(size: 11, weight: FontWeight.w700, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.streak, required this.challenge, required this.referral, required this.flash});
  final int streak;
  final int challenge;
  final int referral;
  final int flash;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _Stat(Icons.calendar_month_outlined, '$streak Day Streak', 'Keep it up! 🔥')),
        Expanded(child: _Stat(Icons.emoji_events_outlined, '${_pts(challenge)} Challenge Points', 'This Month')),
        Expanded(child: _Stat(Icons.groups_outlined, '${_pts(referral)} Referral Points', 'Lifetime')),
        Expanded(child: _Stat(Icons.bolt, '+${_pts(flash)} Flash Drop Bonus', 'This Month')),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.icon, this.title, this.sub);
  final IconData icon;
  final String title;
  final String sub;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: purple, size: 20),
        const SizedBox(height: 4),
        Text(title, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 10, weight: FontWeight.w800, color: navy, height: 1.15)),
        Text(sub, textAlign: TextAlign.center, style: T.memberMeta.copyWith(fontSize: 9)),
      ],
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
        Expanded(child: Text(title, style: inter(size: 16, weight: FontWeight.w800, color: navy))),
        InkWell(onTap: onTap, child: Text(action, style: T.seeAll.copyWith(fontSize: 12))),
      ],
    );
  }
}

class _EarnItem {
  const _EarnItem(this.icon, this.color, this.title, this.body, this.rate);
  final IconData icon;
  final Color color;
  final String title;
  final String body;
  final String rate;
}

const _earnItems = [
  _EarnItem(Icons.shopping_bag_outlined, purple, 'Place an Order', 'Earn points on every purchase', '1 Point per KSh 100'),
  _EarnItem(Icons.edit_note, Color(0xFF16A34A), 'Write a Review', 'Share your review & earn points', '50 Points per review'),
  _EarnItem(Icons.person_add_alt_1_outlined, orange, 'Refer a Friend', 'Invite & your friend gets 100 points', '200 Points per referral'),
  _EarnItem(Icons.calendar_month_outlined, Color(0xFF2563EB), 'Daily Login', 'Login daily to earn points', '10 Points per day'),
  _EarnItem(Icons.emoji_events_outlined, Color(0xFFDB2777), 'Join Challenges', 'Participate in challenges', 'Up to 500 Points'),
];

class _EarnCard extends StatelessWidget {
  const _EarnCard({required this.item, required this.onTap});
  final _EarnItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 132,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE8ECF1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _TintIcon(item.icon, item.color),
            const SizedBox(height: 10),
            Text(item.title, style: inter(size: 12, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 4),
            Text(item.body, style: T.memberMeta.copyWith(fontSize: 10, height: 1.3)),
            const Spacer(),
            Text(item.rate, style: inter(size: 11, weight: FontWeight.w800, color: item.color)),
          ],
        ),
      ),
    );
  }
}

class _Reward {
  const _Reward({
    required this.key,
    required this.title,
    required this.color,
    required this.minSpend,
    required this.cost,
    this.popular = false,
    this.image,
    this.subtitle,
  });
  final String key;
  final String title;
  final Color color;
  final String minSpend;
  final int cost;
  final bool popular;
  final String? image;
  final String? subtitle;
}

const _rewards = [
  _Reward(key: 'OFF100', title: 'KSh 100 OFF', color: purple, minSpend: 'Min spend KSh 1,000', cost: 1000, popular: true),
  _Reward(key: 'OFF250', title: 'KSh 250 OFF', color: Color(0xFF16A34A), minSpend: 'Min spend KSh 2,500', cost: 2500),
  _Reward(key: 'OFF500', title: 'KSh 500 OFF', color: orange, minSpend: 'Min spend KSh 5,000', cost: 5000),
  _Reward(
    key: 'CAP',
    title: 'TAJIRA Cap',
    color: navy,
    minSpend: 'Official Merchandise',
    cost: 3000,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80',
    subtitle: 'Official Merchandise',
  ),
];

class _RewardCard extends StatelessWidget {
  const _RewardCard({required this.reward, required this.onTap});
  final _Reward reward;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 148,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (reward.popular)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: const Color(0xFFF5F0FF), borderRadius: BorderRadius.circular(20)),
              child: Text('Popular', style: inter(size: 9, weight: FontWeight.w800, color: purple)),
            )
          else if (reward.image != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(height: 44, width: double.infinity, child: TajiraImage(reward.image, fallback: Icons.checkroom)),
            )
          else
            const SizedBox(height: 18),
          const SizedBox(height: 8),
          Text(reward.title, style: inter(size: 14, weight: FontWeight.w800, color: reward.color)),
          Text(reward.subtitle ?? reward.minSpend, style: T.memberMeta.copyWith(fontSize: 10)),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 34,
            child: FilledButton(
              onPressed: onTap,
              style: FilledButton.styleFrom(
                backgroundColor: reward.color,
                padding: EdgeInsets.zero,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text('${_pts(reward.cost)} Points', style: T.playNow.copyWith(fontSize: 11)),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile(this.txn);
  final Map txn;

  @override
  Widget build(BuildContext context) {
    final pts = (txn['points'] as num?)?.toInt() ?? 0;
    final meta = _historyMeta(txn['type']?.toString() ?? '', txn['description']?.toString() ?? '');
    final at = DateTime.tryParse(txn['createdAt']?.toString() ?? '')?.toLocal();
    final when = at == null ? '' : DateFormat('d MMM yyyy · hh:mm a').format(at);
    final earned = pts >= 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          _TintIcon(meta.icon, meta.color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(meta.title, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                Text(meta.sub, style: T.memberMeta.copyWith(fontSize: 11)),
                Text(when, style: T.memberMeta.copyWith(fontSize: 10)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${earned ? '+' : ''}${_pts(pts)}',
                style: inter(size: 13, weight: FontWeight.w800, color: earned ? const Color(0xFF16A34A) : const Color(0xFFE53935)),
              ),
              Text(earned ? 'Earned' : 'Redeemed', style: inter(size: 10, weight: FontWeight.w600, color: earned ? const Color(0xFF16A34A) : const Color(0xFFE53935))),
            ],
          ),
        ],
      ),
    );
  }
}

({IconData icon, Color color, String title, String sub}) _historyMeta(String type, String description) {
  switch (type.toUpperCase()) {
    case 'PURCHASE':
    case 'FIRST_PURCHASE':
      return (icon: Icons.shopping_bag_outlined, color: purple, title: 'Order Completed', sub: description);
    case 'WELCOME':
      return (icon: Icons.celebration_outlined, color: orange, title: 'Welcome Bonus', sub: description.isEmpty ? 'Thanks for joining TAJIRA!' : description);
    case 'REFERRAL':
      return (icon: Icons.groups_outlined, color: const Color(0xFF2563EB), title: 'Referral Bonus', sub: description.isEmpty ? 'Your friend placed their first order' : description);
    case 'REDEEM':
      return (icon: Icons.card_giftcard, color: const Color(0xFFE53935), title: 'Redeemed', sub: description.isEmpty ? 'Points redeemed' : description);
    case 'FLASH_DROP':
      return (icon: Icons.bolt, color: orange, title: 'Flash Drop Bonus', sub: description.isEmpty ? 'Bonus points from Flash Drop purchase' : description);
    case 'DAILY_LOGIN':
      return (icon: Icons.calendar_month_outlined, color: const Color(0xFF2563EB), title: 'Daily Login', sub: description);
    case 'STREAK_7':
    case 'STREAK_BONUS':
      return (icon: Icons.local_fire_department_outlined, color: orange, title: '7-Day Streak', sub: description);
    case 'REVIEW':
      return (icon: Icons.edit_note, color: const Color(0xFF16A34A), title: 'Product Review', sub: description);
    case 'COMPETITION':
    case 'COMPETITION_WIN':
      return (icon: Icons.emoji_events_outlined, color: gold, title: 'Challenge Reward', sub: description);
    default:
      return (icon: Icons.stars_outlined, color: purple, title: description.isEmpty ? type : description, sub: type);
  }
}

class _ChallengePromo extends StatelessWidget {
  const _ChallengePromo();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F0FF),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.emoji_events, color: purple, size: 28),
          const SizedBox(height: 6),
          Text('Complete challenges & win BIG!', style: inter(size: 12, weight: FontWeight.w800, color: navy, height: 1.25)),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: () => context.push('/challenges'),
            style: FilledButton.styleFrom(
              backgroundColor: purple,
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text('Join Challenge >', style: T.playNow.copyWith(fontSize: 11)),
          ),
        ],
      ),
    );
  }
}

class _ExpiryCard extends StatelessWidget {
  const _ExpiryCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F8FA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.schedule, color: muted, size: 22),
          const SizedBox(height: 6),
          Text('0 points expiring soon 🥳', style: inter(size: 12, weight: FontWeight.w800, color: navy, height: 1.25)),
          const SizedBox(height: 4),
          Text('All your points are safe!', style: T.memberMeta.copyWith(fontSize: 10)),
        ],
      ),
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({required this.icon, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE8ECF1)),
        ),
        child: Row(
          children: [
            Icon(icon, color: purple, size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(title, style: inter(size: 12, weight: FontWeight.w800, color: navy)),
                  Text(subtitle, style: T.memberMeta.copyWith(fontSize: 10)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TintIcon extends StatelessWidget {
  const _TintIcon(this.icon, this.color);
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
      child: Icon(icon, color: color, size: 18),
    );
  }
}

String _pts(int n) {
  final abs = n.abs();
  final s = abs.toString();
  final buf = StringBuffer(n < 0 ? '-' : '');
  for (var i = 0; i < s.length; i++) {
    final left = s.length - i;
    buf.write(s[i]);
    if (left > 1 && left % 3 == 1) buf.write(',');
  }
  return buf.toString();
}
