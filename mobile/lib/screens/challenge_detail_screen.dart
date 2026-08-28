import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../data/competitions.dart';
import '../state/session.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/storefront_chrome.dart';

class ChallengeDetailScreen extends StatefulWidget {
  const ChallengeDetailScreen({super.key, required this.id});
  final String id;

  @override
  State<ChallengeDetailScreen> createState() => _ChallengeDetailScreenState();
}

class _ChallengeDetailScreenState extends State<ChallengeDetailScreen> {
  String tab = 'Challenge';
  int qIndex = 0;
  int? selected;
  int answered = 0;
  int pts = 0;
  int yourRank = 0;
  bool submitted = false;
  bool correct = false;
  Duration remaining = Duration.zero;
  Timer? ticker;
  Competition? comp;
  bool loading = true;
  String? error;

  List<QuizQuestion> get questions => comp?.questions ?? [];
  bool get isQuiz => comp?.isQuiz ?? false;

  @override
  void initState() {
    super.initState();
    load();
    ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || comp?.endsAt == null) return;
      final end = DateTime.tryParse(comp!.endsAt!);
      if (end == null) return;
      setState(() {
        remaining = end.difference(DateTime.now());
        if (remaining.isNegative) remaining = Duration.zero;
      });
    });
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await context.read<Session>().dio.get('/competitions/${widget.id}');
      final data = Map<String, dynamic>.from(res.data as Map);
      final c = Competition.fromJson(Map<String, dynamic>.from(data['competition'] as Map));
      final end = c.endsAt != null ? DateTime.tryParse(c.endsAt!) : null;
      setState(() {
        comp = c;
        pts = c.yourPts;
        yourRank = (data['yourRank'] as num?)?.toInt() ?? c.yourRank;
        if (yourRank == 0) yourRank = c.yourRank;
        remaining = end != null ? end.difference(DateTime.now()) : Duration.zero;
        if (remaining.isNegative) remaining = Duration.zero;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  @override
  void dispose() {
    ticker?.cancel();
    super.dispose();
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  Future<void> submit() async {
    final c = comp;
    if (c == null) return;
    if (!isQuiz) {
      if (c.route.isNotEmpty) {
        if (c.route.startsWith('/catalog') || c.route.startsWith('/flash')) {
          context.push(c.route);
        } else {
          context.go(c.route);
        }
      }
      return;
    }
    if (selected == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick an answer first')));
      return;
    }
    try {
      final res = await context.read<Session>().dio.post('/competitions/${c.id}/answer', data: {
        'questionIndex': qIndex,
        'selectedIndex': selected,
      });
      final data = Map<String, dynamic>.from(res.data as Map);
      final ok = data['correct'] == true;
      final awarded = (data['pointsAwarded'] as num?)?.toInt() ?? 0;
      setState(() {
        submitted = true;
        correct = ok;
        if (ok) {
          pts += awarded;
          answered += 1;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(data['message']?.toString() ?? (ok ? 'Correct! +$awarded points' : 'Not quite. Try the next question.')),
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sign in to submit answers')));
        context.push('/login');
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    }
  }

  void nextQuestion() {
    if (qIndex >= questions.length - 1) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You’ve completed this challenge’s questions')));
      return;
    }
    setState(() {
      qIndex += 1;
      selected = null;
      submitted = false;
      correct = false;
    });
  }

  void invite() {
    final code = context.read<Session>().user?['referralCode']?.toString() ?? 'NETZA';
    final name = comp?.name ?? 'NETZA challenge';
    Clipboard.setData(ClipboardData(text: 'Join me on NETZA Kenya — $name! Use code $code'));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite copied. Share it with a friend.')));
  }

  void share() {
    final name = comp?.name ?? 'NETZA Kenya';
    Clipboard.setData(ClipboardData(text: 'Join $name on NETZA Kenya. Compete, earn points, win big!'));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Challenge link copied')));
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF7F8FA),
        body: Center(child: CircularProgressIndicator(color: orange)),
      );
    }
    if (error != null || comp == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF7F8FA),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(error ?? 'Competition not found', textAlign: TextAlign.center, style: inter(size: 14, color: muted)),
                const SizedBox(height: 12),
                FilledButton(onPressed: load, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }

    final c = comp!;
    final left = questions.isEmpty ? 0 : questions.length - qIndex - (submitted && correct ? 0 : 1);
    final wide = MediaQuery.sizeOf(context).width >= 720;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      bottomNavigationBar: const NetzaBottomNav(currentIndex: 3),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 4, 12, 0),
              child: _Header(onShare: share),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                children: [
                  _Hero(
                    image: c.image,
                    title: c.name.toUpperCase(),
                    subtitle: isQuiz ? c.description : c.description,
                    prize: c.prize.isNotEmpty ? c.prize : '${c.goalPts} Competition Points',
                    remaining: remaining,
                    pad: _pad,
                  ),
                  const SizedBox(height: 10),
                  _Stats(
                    rank: yourRank > 0 ? yourRank : c.yourRank,
                    pts: isQuiz ? pts : c.yourPts,
                    left: isQuiz ? left.clamp(0, questions.length) : 0,
                    quiz: isQuiz,
                    totalQuestions: questions.length,
                    goalPts: c.goalPts,
                  ),
                  const SizedBox(height: 14),
                  _Tabs(tab: tab, onSelect: (t) => setState(() => tab = t)),
                  const SizedBox(height: 12),
                  if (tab == 'Challenge')
                    wide
                        ? Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(flex: 6, child: _quizColumn(c)),
                              const SizedBox(width: 12),
                              Expanded(flex: 4, child: _sideColumn(c, pts, yourRank)),
                            ],
                          )
                        : Column(
                            children: [
                              _quizColumn(c),
                              const SizedBox(height: 12),
                              _sideColumn(c, pts, yourRank),
                            ],
                          )
                  else if (tab == 'Leaderboard')
                    _LeaderTab(comp: c, pts: isQuiz ? pts : c.yourPts, rank: yourRank > 0 ? yourRank : c.yourRank)
                  else if (tab == 'Rules')
                    _RulesTab(comp: c)
                  else
                    _WinnersTab(comp: c),
                  const SizedBox(height: 16),
                  const _HowTo(),
                  if (isQuiz) ...[
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEAF8EE),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF86EFAC)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star, color: Color(0xFF16A34A), size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'You earn ${c.pointsCorrect} points for each correct answer.',
                              style: inter(size: 12, weight: FontWeight.w700, color: const Color(0xFF166534)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  _Invite(onInvite: invite),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quizColumn(Competition c) {
    if (!isQuiz || questions.isEmpty) {
      return _Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(c.name, style: inter(size: 16, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 6),
            Text(c.description, style: T.memberMeta.copyWith(fontSize: 13, height: 1.35)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: FilledButton(
                onPressed: () {
                  if (c.route.isEmpty) return;
                  if (c.route.startsWith('/catalog') || c.route.startsWith('/flash')) {
                    context.push(c.route);
                  } else {
                    context.go(c.route);
                  }
                },
                style: FilledButton.styleFrom(backgroundColor: purple),
                child: Text('Continue Challenge', style: T.playNow),
              ),
            ),
          ],
        ),
      );
    }
    final q = questions[qIndex];
    final total = questions.length;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('Question ${qIndex + 1} of $total', style: inter(size: 13, weight: FontWeight.w800, color: navy))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFE8F1FF), borderRadius: BorderRadius.circular(20)),
                child: Text('${c.pointsCorrect} Points', style: inter(size: 11, weight: FontWeight.w800, color: const Color(0xFF1A73C7))),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: total == 0 ? 0 : (qIndex + 1) / total,
              minHeight: 7,
              color: purple,
              backgroundColor: const Color(0xFFE9EDF2),
            ),
          ),
          const SizedBox(height: 14),
          Text(q.text, style: inter(size: 16, weight: FontWeight.w800, color: navy, height: 1.3)),
          const SizedBox(height: 12),
          ...List.generate(q.options.length, (i) {
            final on = selected == i;
            final letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            final letter = i < letters.length ? letters[i] : '${i + 1}';
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: submitted ? null : () => setState(() => selected = i),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: on ? purple : const Color(0xFFE5E9EF), width: on ? 1.6 : 1),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: on ? purple : muted, width: 2),
                        ),
                        child: on ? Center(child: Container(width: 10, height: 10, decoration: const BoxDecoration(color: purple, shape: BoxShape.circle))) : null,
                      ),
                      const SizedBox(width: 10),
                      Text('${letters[i]}. ${q.options[i]}', style: inter(size: 14, weight: FontWeight.w600, color: navy)),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: 6),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: submitted ? nextQuestion : submit,
              style: FilledButton.styleFrom(
                backgroundColor: purple,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(submitted ? 'NEXT QUESTION' : 'SUBMIT ANSWER', style: T.playNow.copyWith(fontSize: 13)),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.verified_user_outlined, size: 16, color: muted),
              const SizedBox(width: 6),
              Expanded(child: Text('You can change your answer before submitting', style: T.memberMeta.copyWith(fontSize: 11))),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFF5F0FF), borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                const Icon(Icons.card_giftcard, color: purple, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Answer all questions correctly and climb the leaderboard to win amazing competition points!',
                    style: inter(size: 11, color: navy, height: 1.35),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sideColumn(Competition c, int pts, int rank) {
    final board = c.leaderboard;
    return Column(
      children: [
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('Leaderboard (Top 5)', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                  const Spacer(),
                  InkWell(
                    onTap: () => setState(() => tab = 'Leaderboard'),
                    child: Text('View All', style: T.seeAll.copyWith(fontSize: 12)),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (board.isEmpty)
                Text('No leaderboard data yet.', style: T.memberMeta.copyWith(fontSize: 12))
              else
                ...board.take(5).map((p) => _BoardRow(p)),
              if (rank > 0) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  decoration: BoxDecoration(color: const Color(0xFFF5F0FF), borderRadius: BorderRadius.circular(10)),
                  child: Row(
                    children: [
                      Text('#$rank', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                      const SizedBox(width: 8),
                      Expanded(child: Text('You', style: inter(size: 13, weight: FontWeight.w800, color: navy))),
                      Text('$pts Pts', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Challenge Details', style: inter(size: 14, weight: FontWeight.w800, color: navy)),
              const SizedBox(height: 10),
              if (c.startsAt != null) _Meta(Icons.event_outlined, 'Start Date', _fmtDate(c.startsAt!)),
              if (c.endsAt != null) _Meta(Icons.event, 'End Date', _fmtDate(c.endsAt!)),
              _Meta(Icons.quiz_outlined, 'Type', c.type),
              _Meta(Icons.hub_outlined, 'Category', c.badge.isNotEmpty ? c.badge : 'General'),
              if (c.prize.isNotEmpty) _Meta(Icons.card_giftcard, 'Prize', c.prize),
            ],
          ),
        ),
      ],
    );
  }

  String _fmtDate(String raw) {
    final d = DateTime.tryParse(raw);
    if (d == null) return raw;
    return '${d.day.toString().padLeft(2, '0')} ${_month(d.month)} ${d.year}';
  }

  String _month(int m) {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[(m - 1).clamp(0, 11)];
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onShare});
  final VoidCallback onShare;

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
              context.go('/challenges');
            }
          },
          icon: const Icon(Icons.arrow_back, color: navy, size: 22),
        ),
        const NetzaLogo(),
        const SizedBox(width: 8),
        Expanded(
          child: Text('Challenge Details', textAlign: TextAlign.center, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
        ),
        InkWell(onTap: onShare, child: const Icon(Icons.share_outlined, color: navy, size: 20)),
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

class _Hero extends StatelessWidget {
  const _Hero({
    required this.image,
    required this.title,
    required this.subtitle,
    required this.prize,
    required this.remaining,
    required this.pad,
  });
  final String image;
  final String title;
  final String subtitle;
  final String prize;
  final Duration remaining;
  final String Function(int) pad;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF6D28D9)],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: 10,
            bottom: 10,
            width: 150,
            child: Opacity(opacity: 0.35, child: NetzaImage(image)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFDB2777), borderRadius: BorderRadius.circular(20)),
                  child: Text('ACTIVE CHALLENGE', style: inter(size: 9, weight: FontWeight.w800, color: Colors.white, spacing: 0.4)),
                ),
                const SizedBox(height: 12),
                Text(title, style: inter(size: 22, weight: FontWeight.w800, color: Colors.white, height: 1.1, spacing: 0.4)),
                const SizedBox(height: 6),
                Text(subtitle, style: inter(size: 12, color: Colors.white70, height: 1.35)),
                const SizedBox(height: 14),
                Text('Time Remaining', style: inter(size: 10, weight: FontWeight.w600, color: Colors.white70)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    _Tick(pad(remaining.inDays), 'DAYS'),
                    _Tick(pad(remaining.inHours.remainder(24)), 'HRS'),
                    _Tick(pad(remaining.inMinutes.remainder(60)), 'MINS'),
                    _Tick(pad(remaining.inSeconds.remainder(60)), 'SECS'),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.emoji_events, color: gold, size: 18),
                    const SizedBox(width: 6),
                    Text('Prize Pool: ', style: inter(size: 12, color: Colors.white70)),
                    Flexible(child: Text(prize, style: inter(size: 12, weight: FontWeight.w800, color: orange), maxLines: 2, overflow: TextOverflow.ellipsis)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Tick extends StatelessWidget {
  const _Tick(this.value, this.label);
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Container(
        width: 58,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
        child: Column(
          children: [
            Text(value, style: inter(size: 16, weight: FontWeight.w800, color: Colors.white, height: 1)),
            const SizedBox(height: 2),
            Text(label, style: inter(size: 8, weight: FontWeight.w700, color: Colors.white70, spacing: 0.4)),
          ],
        ),
      ),
    );
  }
}

class _Stats extends StatelessWidget {
  const _Stats({
    required this.rank,
    required this.pts,
    required this.left,
    required this.quiz,
    required this.totalQuestions,
    required this.goalPts,
  });
  final int rank;
  final int pts;
  final int left;
  final bool quiz;
  final int totalQuestions;
  final int goalPts;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      child: Row(
        children: [
          Expanded(child: _Stat(Icons.person_outline, purple, 'Your Position', rank > 0 ? '#$rank' : '—', 'Climb the board')),
          _div(),
          Expanded(child: _Stat(Icons.star, orange, 'Your Points', '$pts Pts', 'This Challenge')),
          _div(),
          Expanded(child: _Stat(Icons.track_changes, purple, 'Questions Left', quiz ? '$left / $totalQuestions' : '—', quiz ? 'Keep Going!' : 'Open play')),
          _div(),
          Expanded(child: _Stat(Icons.card_giftcard, const Color(0xFFDB2777), 'Potential Prize', '$goalPts Pts', 'Top ranks win')),
        ],
      ),
    );
  }

  Widget _div() => Container(width: 1, height: 44, color: const Color(0xFFE8ECF1));
}

class _Stat extends StatelessWidget {
  const _Stat(this.icon, this.color, this.label, this.value, this.sub);
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final String sub;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(height: 2),
        Text(label, textAlign: TextAlign.center, maxLines: 1, style: T.memberMeta.copyWith(fontSize: 8)),
        Text(value, textAlign: TextAlign.center, style: inter(size: 13, weight: FontWeight.w800, color: navy)),
        Text(sub, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis, style: T.memberMeta.copyWith(fontSize: 8)),
      ],
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.tab, required this.onSelect});
  final String tab;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.quiz_outlined, 'Challenge'),
      (Icons.leaderboard_outlined, 'Leaderboard'),
      (Icons.menu_book_outlined, 'Rules'),
      (Icons.emoji_events_outlined, 'Winners'),
    ];
    return Row(
      children: items.map((e) {
        final on = tab == e.$2;
        return Expanded(
          child: InkWell(
            onTap: () => onSelect(e.$2),
            child: Column(
              children: [
                Icon(e.$1, size: 18, color: on ? purple : muted),
                const SizedBox(height: 4),
                Text(e.$2, style: inter(size: 11, weight: on ? FontWeight.w800 : FontWeight.w600, color: on ? purple : muted)),
                const SizedBox(height: 6),
                Container(height: 2, color: on ? purple : Colors.transparent),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _LeaderTab extends StatelessWidget {
  const _LeaderTab({required this.comp, required this.pts, required this.rank});
  final Competition comp;
  final int pts;
  final int rank;

  @override
  Widget build(BuildContext context) {
    final board = comp.leaderboard;
    return _Card(
      child: Column(
        children: [
          if (board.isEmpty)
            Text('No leaderboard entries yet.', style: T.memberMeta.copyWith(fontSize: 13))
          else
            ...board.map((p) => _BoardRow(p)),
          if (rank > 0)
            Container(
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              decoration: BoxDecoration(color: const Color(0xFFF5F0FF), borderRadius: BorderRadius.circular(10)),
              child: Row(
                children: [
                  Text('#$rank', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                  const SizedBox(width: 8),
                  Expanded(child: Text('You', style: inter(size: 13, weight: FontWeight.w800, color: navy))),
                  Text('$pts Pts', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _RulesTab extends StatelessWidget {
  const _RulesTab({required this.comp});
  final Competition comp;

  @override
  Widget build(BuildContext context) {
    final rules = comp.rules.isNotEmpty
        ? comp.rules
        : [
            'Participate before the competition ends.',
            'Earn points by completing the challenge actions.',
            'Leaderboard ranks are based on points earned.',
            'Winners are announced when the competition ends.',
          ];
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Challenge Rules', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
          const SizedBox(height: 10),
          ...rules.map(
            (r) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('•  ', style: TextStyle(color: purple, fontWeight: FontWeight.w800)),
                  Expanded(child: Text(r, style: T.memberMeta.copyWith(fontSize: 13, height: 1.35, color: navy))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WinnersTab extends StatelessWidget {
  const _WinnersTab({required this.comp});
  final Competition comp;

  @override
  Widget build(BuildContext context) {
    final msg = comp.status == CompStatus.ended
        ? 'This competition has ended. Check the leaderboard for final rankings.'
        : comp.endsAt != null
            ? 'Winners will be announced when the challenge ends.'
            : 'Winners are announced when the challenge ends.';
    return _Card(
      child: Text(msg, style: T.memberMeta.copyWith(fontSize: 13, height: 1.4)),
    );
  }
}

class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) {
    const steps = ['Answer questions', 'Earn points', 'Win prizes'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('How to Participate', style: inter(size: 15, weight: FontWeight.w800, color: navy)),
        const SizedBox(height: 12),
        Row(
          children: [
            for (var i = 0; i < steps.length; i++) ...[
              if (i > 0)
                const Padding(
                  padding: EdgeInsets.only(bottom: 18),
                  child: Icon(Icons.arrow_forward, size: 16, color: purple),
                ),
              Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: const BoxDecoration(color: purple, shape: BoxShape.circle),
                      child: Center(child: Text('${i + 1}', style: inter(size: 13, weight: FontWeight.w800, color: Colors.white))),
                    ),
                    const SizedBox(height: 6),
                    Text(steps[i], textAlign: TextAlign.center, style: inter(size: 11, weight: FontWeight.w700, color: navy)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _Invite extends StatelessWidget {
  const _Invite({required this.onInvite});
  final VoidCallback onInvite;

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Share & Invite Friends', style: inter(size: 15, weight: FontWeight.w800, color: navy)),
          const SizedBox(height: 6),
          Text(
            'Invite friends to participate and earn 100 bonus points when they join the challenge.',
            style: T.memberMeta.copyWith(fontSize: 12, height: 1.35),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: OutlinedButton.icon(
              onPressed: onInvite,
              icon: const Icon(Icons.person_add_alt_1, color: purple, size: 18),
              label: Text('INVITE FRIENDS', style: inter(size: 13, weight: FontWeight.w800, color: purple)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: purple, width: 1.4),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BoardRow extends StatelessWidget {
  const _BoardRow(this.p);
  final LeaderPreview p;

  Color get crown {
    if (p.place == 1) return gold;
    if (p.place == 2) return const Color(0xFFC0C7D1);
    if (p.place == 3) return const Color(0xFFCD7F32);
    return muted;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 22,
            child: p.place <= 3
                ? Icon(Icons.workspace_premium, size: 16, color: crown)
                : Text('#${p.place}', style: inter(size: 11, weight: FontWeight.w700, color: muted)),
          ),
          const SizedBox(width: 6),
          ClipOval(
            child: SizedBox(width: 28, height: 28, child: NetzaImage(p.image, fallback: Icons.person)),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(p.name, style: inter(size: 13, weight: FontWeight.w600, color: navy))),
          Text('${p.pts} Pts', style: inter(size: 12, weight: FontWeight.w800, color: navy)),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: purple),
          const SizedBox(width: 8),
          Text(label, style: T.memberMeta.copyWith(fontSize: 12)),
          const Spacer(),
          Text(value, style: inter(size: 12, weight: FontWeight.w700, color: navy)),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      child: child,
    );
  }
}
