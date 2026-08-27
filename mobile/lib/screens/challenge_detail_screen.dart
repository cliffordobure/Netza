import 'dart:async';
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
  int? selected = 1;
  int answered = 3;
  int pts = 450;
  bool submitted = false;
  bool correct = false;
  Duration remaining = const Duration(days: 2, hours: 14, minutes: 36, seconds: 21);
  Timer? ticker;

  Competition get comp => competitionById(widget.id) ?? competitions.first;

  List<QuizQuestion> get questions => networkingProQuestions;

  bool get isQuiz => comp.id == 'networking-pro';

  @override
  void initState() {
    super.initState();
    ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (remaining.inSeconds > 0) remaining -= const Duration(seconds: 1);
      });
    });
  }

  @override
  void dispose() {
    ticker?.cancel();
    super.dispose();
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  void submit() {
    if (!isQuiz) {
      context.push(comp.route);
      return;
    }
    if (selected == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick an answer first')));
      return;
    }
    final ok = selected == questions[qIndex].correct;
    setState(() {
      submitted = true;
      correct = ok;
      if (ok) {
        pts += 50;
        answered = (answered + 1).clamp(0, 10);
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok ? 'Correct! +50 competition points' : 'Not quite. Try the next question.'),
    ));
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
    Clipboard.setData(ClipboardData(text: 'Join me on NETZA Kenya — Networking Pro challenge! Use code $code'));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite copied. Share it with a friend.')));
  }

  void share() {
    Clipboard.setData(const ClipboardData(text: 'I’m playing Networking Pro on NETZA Kenya. Compete, earn points, win big!'));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Challenge link copied')));
  }

  @override
  Widget build(BuildContext context) {
    final left = 10 - answered;
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
                    image: comp.image,
                    title: comp.name.toUpperCase(),
                    subtitle: isQuiz
                        ? 'Answer 10 networking questions correctly and climb the leaderboard!'
                        : comp.description,
                    remaining: remaining,
                    pad: _pad,
                  ),
                  const SizedBox(height: 10),
                  _Stats(
                    rank: isQuiz ? 8 : comp.yourRank,
                    pts: isQuiz ? pts : comp.yourPts,
                    left: isQuiz ? left : 0,
                    quiz: isQuiz,
                  ),
                  const SizedBox(height: 14),
                  _Tabs(tab: tab, onSelect: (t) => setState(() => tab = t)),
                  const SizedBox(height: 12),
                  if (tab == 'Challenge')
                    wide
                        ? Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(flex: 6, child: _quizColumn()),
                              const SizedBox(width: 12),
                              Expanded(flex: 4, child: _sideColumn()),
                            ],
                          )
                        : Column(
                            children: [
                              _quizColumn(),
                              const SizedBox(height: 12),
                              _sideColumn(),
                            ],
                          )
                  else if (tab == 'Leaderboard')
                    _LeaderTab(pts: isQuiz ? pts : comp.yourPts, rank: isQuiz ? 8 : comp.yourRank)
                  else if (tab == 'Rules')
                    const _RulesTab()
                  else
                    const _WinnersTab(),
                  const SizedBox(height: 16),
                  const _HowTo(),
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
                            'You earn 50 points for each correct answer.',
                            style: inter(size: 12, weight: FontWeight.w700, color: const Color(0xFF166534)),
                          ),
                        ),
                      ],
                    ),
                  ),
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

  Widget _quizColumn() {
    if (!isQuiz) {
      return _Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(comp.name, style: inter(size: 16, weight: FontWeight.w800, color: navy)),
            const SizedBox(height: 6),
            Text(comp.description, style: T.memberMeta.copyWith(fontSize: 13, height: 1.35)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: FilledButton(
                onPressed: () {
                  if (comp.route.startsWith('/catalog') || comp.route.startsWith('/flash')) {
                    context.push(comp.route);
                  } else {
                    context.go(comp.route);
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
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('Question ${qIndex + 1} of 10', style: inter(size: 13, weight: FontWeight.w800, color: navy))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFE8F1FF), borderRadius: BorderRadius.circular(20)),
                child: Text('50 Points', style: inter(size: 11, weight: FontWeight.w800, color: const Color(0xFF1A73C7))),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: (qIndex + 1) / 10,
              minHeight: 7,
              color: purple,
              backgroundColor: const Color(0xFFE9EDF2),
            ),
          ),
          const SizedBox(height: 14),
          Text(q.text, style: inter(size: 16, weight: FontWeight.w800, color: navy, height: 1.3)),
          const SizedBox(height: 12),
          ...List.generate(4, (i) {
            final on = selected == i;
            final letters = ['A', 'B', 'C', 'D'];
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

  Widget _sideColumn() {
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
              ...challengeBoard.take(5).map((p) => _BoardRow(p)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                decoration: BoxDecoration(color: const Color(0xFFF5F0FF), borderRadius: BorderRadius.circular(10)),
                child: Row(
                  children: [
                    Text('#8', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                    const SizedBox(width: 8),
                    Expanded(child: Text('You', style: inter(size: 13, weight: FontWeight.w800, color: navy))),
                    Text('$pts Pts', style: inter(size: 12, weight: FontWeight.w800, color: purple)),
                  ],
                ),
              ),
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
              const _Meta(Icons.event_outlined, 'Start Date', '20 May 2026'),
              const _Meta(Icons.event, 'End Date', '27 May 2026'),
              const _Meta(Icons.groups_outlined, 'Participants', '1,254'),
              const _Meta(Icons.quiz_outlined, 'Type', 'Quiz Challenge'),
              const _Meta(Icons.hub_outlined, 'Category', 'Networking'),
            ],
          ),
        ),
      ],
    );
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
  const _Hero({required this.image, required this.title, required this.subtitle, required this.remaining, required this.pad});
  final String image;
  final String title;
  final String subtitle;
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
                    Text('5,000 Competition Points', style: inter(size: 12, weight: FontWeight.w800, color: orange)),
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
  const _Stats({required this.rank, required this.pts, required this.left, required this.quiz});
  final int rank;
  final int pts;
  final int left;
  final bool quiz;

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
          Expanded(child: _Stat(Icons.person_outline, purple, 'Your Position', '#$rank', 'Top 10 Win Prizes')),
          _div(),
          Expanded(child: _Stat(Icons.star, orange, 'Your Points', '$pts Pts', 'This Challenge')),
          _div(),
          Expanded(child: _Stat(Icons.track_changes, purple, 'Questions Left', quiz ? '$left / 10' : '—', quiz ? 'Keep Going!' : 'Open play')),
          _div(),
          Expanded(child: _Stat(Icons.card_giftcard, const Color(0xFFDB2777), 'Potential Prize', '5,000 Pts', 'If you rank Top 1')),
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
  const _LeaderTab({required this.pts, required this.rank});
  final int pts;
  final int rank;

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        children: [
          ...challengeBoard.map((p) => _BoardRow(p)),
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
  const _RulesTab();

  @override
  Widget build(BuildContext context) {
    const rules = [
      'Answer 10 multiple-choice networking questions.',
      'You earn 50 competition points for each correct answer.',
      'You may change your answer before you tap Submit.',
      'Top 10 on the leaderboard win prizes when the challenge ends.',
      'Rank #1 receives the 5,000 point prize pool.',
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
  const _WinnersTab();

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Text(
        'Winners are announced when the challenge ends on 27 May 2026. Keep answering to stay in the top 10.',
        style: T.memberMeta.copyWith(fontSize: 13, height: 1.4),
      ),
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
