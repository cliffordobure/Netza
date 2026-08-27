import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../data/competitions.dart';
import '../state/session.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/storefront_chrome.dart';

class ChallengesScreen extends StatefulWidget {
  const ChallengesScreen({super.key});

  @override
  State<ChallengesScreen> createState() => _ChallengesScreenState();
}

class _ChallengesScreenState extends State<ChallengesScreen> {
  String tab = 'All';
  final notified = <String>{};

  List<Competition> get active => competitions.where((c) => c.status == CompStatus.active).toList();
  List<Competition> get upcoming => competitions.where((c) => c.status == CompStatus.upcoming).toList();
  List<Competition> get ended => competitions.where((c) => c.status == CompStatus.ended).toList();

  int get competitionPts => active.fold<int>(0, (s, c) => s + c.yourPts);

  void howItWorks() {
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
            Text('How it works', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 10),
            Text(
              'Join active competitions, earn competition points by shopping, reviewing, referring friends and catching Flash Drops. Climb the monthly leaderboard to win bonus points and vouchers.',
              style: T.memberMeta.copyWith(fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 12),
            Text('100 Pts = KSh 10', style: inter(size: 13, weight: FontWeight.w800, color: purple)),
          ],
        ),
      ),
    );
  }

  void showLeaderboard() {
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
            Text('Monthly Leaderboard', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 6),
            Text('You’re #28 · Top 5% this month', style: T.memberMeta),
            const SizedBox(height: 14),
            ...leaderPreview.map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      _PlaceAvatar(p),
                      const SizedBox(width: 10),
                      Expanded(child: Text(p.name, style: inter(size: 14, weight: FontWeight.w700, color: navy))),
                      Text('${_pts(p.pts)} Pts', style: inter(size: 13, weight: FontWeight.w800, color: purple)),
                    ],
                  ),
                )),
            const Divider(),
            Row(
              children: [
                Text('You', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                const Spacer(),
                Text('#28 · ${_pts(competitionPts)} Pts', style: inter(size: 13, weight: FontWeight.w700, color: muted)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void showChallenge(Competition c) {
    context.push('/challenges/${c.id}');
  }

  @override
  Widget build(BuildContext context) {
    final showActive = tab == 'All' || tab == 'Active';
    final showUpcoming = tab == 'All' || tab == 'Upcoming';
    final showEnded = tab == 'Ended';

    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const NetzaBottomNav(currentIndex: 3),
      body: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(4, 4, 12, 0),
              child: _ChallengesHeader(),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                children: [
                  _HeroCard(
                    pts: 1250,
                    onLeaderboard: showLeaderboard,
                  ),
                  const SizedBox(height: 12),
                  const _StatsRow(),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: ['All', 'Active', 'Upcoming', 'Ended'].map((t) {
                              final on = tab == t;
                              return Padding(
                                padding: const EdgeInsets.only(right: 16),
                                child: InkWell(
                                  onTap: () => setState(() => tab = t),
                                  child: Column(
                                    children: [
                                      Text(
                                        t,
                                        style: inter(
                                          size: 13,
                                          weight: on ? FontWeight.w800 : FontWeight.w600,
                                          color: on ? purple : muted,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        height: 2,
                                        width: 28,
                                        color: on ? purple : Colors.transparent,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: howItWorks,
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, size: 14, color: Color(0xFF1A73C7)),
                            const SizedBox(width: 4),
                            Text('How it works', style: T.seeAll.copyWith(fontSize: 11)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (showActive) ...[
                    const SizedBox(height: 16),
                    _SectionHead(
                      icon: Icons.emoji_events,
                      title: 'Active Competitions',
                      action: 'View All Active >',
                      onTap: () => setState(() => tab = 'Active'),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 278,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: active.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (_, i) => _ActiveCard(comp: active[i], onView: () => showChallenge(active[i])),
                      ),
                    ),
                  ],
                  if (showUpcoming) ...[
                    const SizedBox(height: 18),
                    _SectionHead(
                      icon: Icons.calendar_month_outlined,
                      title: 'Upcoming Competitions',
                      action: 'View All Upcoming >',
                      onTap: () => setState(() => tab = 'Upcoming'),
                    ),
                    const SizedBox(height: 10),
                    ...upcoming.map(
                      (c) => _UpcomingTile(
                        comp: c,
                        notified: notified.contains(c.id),
                        onNotify: () {
                          setState(() => notified.add(c.id));
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('We’ll notify you when ${c.name} opens')));
                        },
                      ),
                    ),
                  ],
                  if (showEnded) ...[
                    const SizedBox(height: 8),
                    Text('Ended Competitions', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
                    const SizedBox(height: 10),
                    ...ended.map((c) => _UpcomingTile(comp: c, notified: true, onNotify: () => showChallenge(c), ended: true)),
                  ],
                  const SizedBox(height: 16),
                  _LeaderPreviewCard(onView: showLeaderboard),
                  const SizedBox(height: 18),
                  Text('How to Earn Competition Points', style: inter(size: 15, weight: FontWeight.w800, color: navy)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      for (final e in earnWays)
                        Expanded(
                          child: Column(
                            children: [
                              Icon(e.$1, color: purple, size: 22),
                              const SizedBox(height: 6),
                              Text(e.$2, textAlign: TextAlign.center, style: inter(size: 9, weight: FontWeight.w700, color: navy, height: 1.2)),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const _ExploreBanner(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChallengesHeader extends StatelessWidget {
  const _ChallengesHeader();

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
              context.go('/points');
            }
          },
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          icon: const Icon(Icons.arrow_back, color: navy, size: 22),
        ),
        const NetzaLogo(),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            children: [
              Text('Competitions & Challenges', textAlign: TextAlign.center, maxLines: 2, style: inter(size: 12, weight: FontWeight.w800, color: navy, height: 1.15)),
              Text('Compete. Earn Points. Win Big!', textAlign: TextAlign.center, style: T.memberMeta.copyWith(fontSize: 9)),
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

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.pts, required this.onLeaderboard});
  final int pts;
  final VoidCallback onLeaderboard;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFF6D28D9), Color(0xFF1E3A8A)],
        ),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 6,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.emoji_events, color: gold, size: 22),
                    const SizedBox(width: 6),
                    Flexible(child: Text('My Competition Points', style: inter(size: 11, weight: FontWeight.w500, color: Colors.white70))),
                    const SizedBox(width: 4),
                    const Icon(Icons.info_outline, size: 14, color: Colors.white70),
                  ],
                ),
                const SizedBox(height: 8),
                Text('${_pts(pts)} Pts', style: inter(size: 28, weight: FontWeight.w800, color: Colors.white, height: 1.05)),
                const SizedBox(height: 2),
                Text('= KSh ${_pts(pts ~/ 10)} (100 Pts = KSh 10)', style: inter(size: 11, color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 5,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  const Icon(Icons.workspace_premium, color: gold, size: 20),
                  Text('This Month Rank', style: inter(size: 9, color: Colors.white70)),
                  Text('#28', style: inter(size: 22, weight: FontWeight.w800, color: Colors.white, height: 1.1)),
                  Text("Keep going! You're in the top 5%", textAlign: TextAlign.center, style: inter(size: 9, color: Colors.white70, height: 1.2)),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    height: 28,
                    child: FilledButton(
                      onPressed: onLeaderboard,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: purple,
                        padding: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text('View Leaderboard >', style: inter(size: 9, weight: FontWeight.w800, color: purple)),
                    ),
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

class _StatsRow extends StatelessWidget {
  const _StatsRow();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(child: _Stat(Icons.track_changes, 'Active Challenges', '2 Participating')),
        SizedBox(width: 8),
        Expanded(child: _Stat(Icons.groups_outlined, 'My Ranking', 'Top 5% This Month')),
        SizedBox(width: 8),
        Expanded(child: _Stat(Icons.star_outline, 'Points Earned', '+450 This Month')),
        SizedBox(width: 8),
        Expanded(child: _Stat(Icons.schedule, 'Competitions Won', '3 All Time')),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      child: Column(
        children: [
          Icon(icon, color: purple, size: 18),
          const SizedBox(height: 4),
          Text(title, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 9, weight: FontWeight.w700, color: muted, height: 1.15)),
          Text(sub, textAlign: TextAlign.center, maxLines: 2, style: inter(size: 10, weight: FontWeight.w800, color: navy, height: 1.15)),
        ],
      ),
    );
  }
}

class _SectionHead extends StatelessWidget {
  const _SectionHead({required this.icon, required this.title, required this.action, required this.onTap});
  final IconData icon;
  final String title;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: gold, size: 18),
        const SizedBox(width: 6),
        Expanded(child: Text(title, style: inter(size: 15, weight: FontWeight.w800, color: navy))),
        InkWell(onTap: onTap, child: Text(action, style: T.seeAll.copyWith(fontSize: 12))),
      ],
    );
  }
}

class _ActiveCard extends StatelessWidget {
  const _ActiveCard({required this.comp, required this.onView});
  final Competition comp;
  final VoidCallback onView;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 210,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 92,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                NetzaImage(comp.image),
                Positioned(
                  left: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFF16A34A), borderRadius: BorderRadius.circular(20)),
                    child: Text(comp.endsLabel, style: inter(size: 9, weight: FontWeight.w800, color: Colors.white)),
                  ),
                ),
                Positioned(
                  left: 8,
                  bottom: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: comp.badgeColor, borderRadius: BorderRadius.circular(6)),
                    child: Text(comp.badge, style: inter(size: 8, weight: FontWeight.w800, color: Colors.white, spacing: 0.3)),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(comp.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                Text(comp.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: T.memberMeta.copyWith(fontSize: 10, height: 1.25)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text('Your Points', style: T.memberMeta.copyWith(fontSize: 9)),
                    const Spacer(),
                    Text('Your Rank  #${comp.yourRank}', style: T.memberMeta.copyWith(fontSize: 9)),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: comp.goalPts == 0 ? 0 : (comp.yourPts / comp.goalPts).clamp(0, 1),
                    minHeight: 6,
                    color: orange,
                    backgroundColor: const Color(0xFFE9EDF2),
                  ),
                ),
                const SizedBox(height: 2),
                Text('${_pts(comp.yourPts)} / ${_pts(comp.goalPts)} Pts', style: inter(size: 10, weight: FontWeight.w700, color: navy)),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  height: 32,
                  child: OutlinedButton(
                    onPressed: onView,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: orange),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text('View Challenge', style: inter(size: 11, weight: FontWeight.w800, color: orange)),
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

class _UpcomingTile extends StatelessWidget {
  const _UpcomingTile({required this.comp, required this.notified, required this.onNotify, this.ended = false});
  final Competition comp;
  final bool notified;
  final VoidCallback onNotify;
  final bool ended;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(width: 56, height: 56, child: NetzaImage(comp.image)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(comp.name, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
                Text(comp.dates, style: T.memberMeta.copyWith(fontSize: 10)),
                Text(comp.prize, style: inter(size: 10, weight: FontWeight.w700, color: orange, height: 1.25)),
              ],
            ),
          ),
          const SizedBox(width: 6),
          OutlinedButton.icon(
            onPressed: onNotify,
            icon: Icon(ended ? Icons.visibility_outlined : Icons.notifications_outlined, size: 14, color: purple),
            label: Text(ended ? 'View' : (notified ? 'Notified' : 'Notify Me'), style: inter(size: 10, weight: FontWeight.w700, color: purple)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFE9D5FF)),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: const Size(0, 32),
            ),
          ),
        ],
      ),
    );
  }
}

class _LeaderPreviewCard extends StatelessWidget {
  const _LeaderPreviewCard({required this.onView});
  final VoidCallback onView;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
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
                decoration: const BoxDecoration(color: Color(0xFF6D28D9), shape: BoxShape.circle),
                child: const Icon(Icons.emoji_events, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'See how you rank against other shoppers in the monthly leaderboard.',
                  style: inter(size: 12, color: Colors.white, height: 1.3),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              FilledButton(
                onPressed: onView,
                style: FilledButton.styleFrom(
                  backgroundColor: purple,
                  minimumSize: const Size(0, 34),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                child: Text('View Leaderboard >', style: T.playNow.copyWith(fontSize: 11)),
              ),
              const Spacer(),
              for (final p in leaderPreview) ...[
                _PlaceAvatar(p, small: true),
                const SizedBox(width: 6),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _PlaceAvatar extends StatelessWidget {
  const _PlaceAvatar(this.person, {this.small = false});
  final LeaderPreview person;
  final bool small;

  Color get crown {
    if (person.place == 1) return gold;
    if (person.place == 2) return const Color(0xFFC0C7D1);
    return const Color(0xFFCD7F32);
  }

  @override
  Widget build(BuildContext context) {
    final size = small ? 36.0 : 40.0;
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: crown, width: 2),
              ),
              clipBehavior: Clip.antiAlias,
              child: NetzaImage(person.image, fallback: Icons.person),
            ),
            Positioned(
              top: -4,
              right: -2,
              child: Icon(Icons.workspace_premium, size: 14, color: crown),
            ),
          ],
        ),
        if (!small) ...[
          const SizedBox(height: 4),
          Text(person.name, style: inter(size: 11, weight: FontWeight.w700, color: navy)),
        ] else
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text('#${person.place}', style: inter(size: 8, weight: FontWeight.w800, color: Colors.white70)),
          ),
      ],
    );
  }
}

class _ExploreBanner extends StatelessWidget {
  const _ExploreBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(colors: [orange, purple]),
      ),
      child: Row(
        children: [
          const Icon(Icons.emoji_events, color: gold, size: 36),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Compete, climb the leaderboard and win amazing rewards!',
              style: inter(size: 12, weight: FontWeight.w700, color: Colors.white, height: 1.3),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => context.go('/points'),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: purple,
              minimumSize: const Size(0, 34),
              padding: const EdgeInsets.symmetric(horizontal: 10),
            ),
            child: Text('Explore Rewards >', style: inter(size: 10, weight: FontWeight.w800, color: purple)),
          ),
        ],
      ),
    );
  }
}

String _pts(int n) {
  final s = n.abs().toString();
  final buf = StringBuffer(n < 0 ? '-' : '');
  for (var i = 0; i < s.length; i++) {
    final left = s.length - i;
    buf.write(s[i]);
    if (left > 1 && left % 3 == 1) buf.write(',');
  }
  return buf.toString();
}
