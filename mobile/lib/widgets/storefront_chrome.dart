import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/config.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';

class NetzaLogo extends StatelessWidget {
  const NetzaLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('NETZA', style: T.logoNetza),
        Text('KENYA', style: T.logoKenya),
      ],
    );
  }
}

enum HeaderLeading { menu, back }

class StorefrontHeader extends StatelessWidget {
  const StorefrontHeader({
    super.key,
    this.leading = HeaderLeading.menu,
    this.showSearch = false,
    this.labeledActions = true,
    this.onLeadingTap,
  });
  final HeaderLeading leading;
  final bool showSearch;
  final bool labeledActions;
  final VoidCallback? onLeadingTap;

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<Session>().cartCount;
    return Row(
      children: [
        IconButton(
          onPressed: () {
            if (onLeadingTap != null) {
              onLeadingTap!();
            } else if (leading == HeaderLeading.back) {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/shop');
              }
            } else {
              Scaffold.of(context).openDrawer();
            }
          },
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          icon: Icon(leading == HeaderLeading.back ? Icons.arrow_back : Icons.menu, color: navy, size: 24),
        ),
        const Expanded(child: NetzaLogo()),
        if (showSearch)
          IconButton(
            onPressed: () => context.push('/catalog'),
            icon: const Icon(Icons.search, color: navy, size: 22),
          ),
        _HeaderAction(
          icon: Icons.person_outline,
          label: labeledActions ? 'Account' : null,
          onTap: () => context.go('/account'),
        ),
        const SizedBox(width: 8),
        _HeaderAction(
          icon: Icons.shopping_cart_outlined,
          label: labeledActions ? 'Cart' : null,
          badge: cartCount,
          onTap: () => context.push('/cart'),
        ),
      ],
    );
  }
}

class _HeaderAction extends StatelessWidget {
  const _HeaderAction({required this.icon, required this.onTap, this.label, this.badge = 0});
  final IconData icon;
  final String? label;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Badge(
            isLabelVisible: badge > 0,
            label: Text('$badge', style: inter(size: 9, weight: FontWeight.w700, color: Colors.white)),
            backgroundColor: const Color(0xFFE53935),
            child: Icon(icon, color: navy, size: 22),
          ),
          if (label != null) ...[
            const SizedBox(height: 2),
            Text(label!, style: T.headerAction),
          ],
        ],
      ),
    );
  }
}

enum SearchTrailing { button, scan }

class StorefrontSearchBar extends StatelessWidget {
  const StorefrontSearchBar({
    super.key,
    required this.controller,
    required this.onSearch,
    this.trailing = SearchTrailing.button,
    this.hint = 'Search for networking, CCTV & more...',
  });

  final TextEditingController controller;
  final VoidCallback onSearch;
  final SearchTrailing trailing;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: const Color(0xFFF4F6F8),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E9EF)),
      ),
      child: Row(
        children: [
          const SizedBox(width: 12),
          const Icon(Icons.search, color: Color(0xFF9AA3AE), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              onSubmitted: (_) => onSearch(),
              style: T.searchField,
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: T.searchHint,
                border: InputBorder.none,
                isDense: true,
              ),
            ),
          ),
          if (trailing == SearchTrailing.button)
            Padding(
              padding: const EdgeInsets.all(4),
              child: FilledButton(
                onPressed: onSearch,
                style: FilledButton.styleFrom(
                  backgroundColor: orange,
                  minimumSize: const Size(74, 36),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Text('Search', style: T.searchBtn),
              ),
            )
          else
            IconButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Barcode scan is coming in a later release')),
                );
              },
              icon: const Icon(Icons.qr_code_scanner, color: navy, size: 22),
            ),
        ],
      ),
    );
  }
}

class DeliverToRow extends StatelessWidget {
  const DeliverToRow({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.location_on, size: 15, color: orange),
        const SizedBox(width: 4),
        Text('Deliver to: ', style: T.deliverLabel),
        Text('Nairobi, Kenya', style: T.deliverValue),
        const Icon(Icons.keyboard_arrow_down, size: 18, color: navy),
      ],
    );
  }
}

class LoyaltyCard extends StatelessWidget {
  const LoyaltyCard({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final earned = session.totalEarned > 0 ? session.totalEarned : session.pointsBalance;
    final member = membershipProgress(session.user?['membershipLevel']?.toString() ?? 'BRONZE', earned);
    final pts = NumberFormat('#,###').format(session.pointsBalance);

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFBFCFD),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8ECF1)),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () => context.go('/points'),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('My Netza Points', style: T.pointsCaption),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.stars_rounded, color: gold, size: 22),
                          const SizedBox(width: 6),
                          Text('$pts Pts', style: T.pointsValue),
                          const Icon(Icons.chevron_right, color: muted, size: 18),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFE8ECF1)),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('${member.current} Member', style: T.memberTitle)),
                        const Icon(Icons.workspace_premium, color: Color(0xFFB0B8C1), size: 20),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      member.remaining == 0
                          ? 'Highest tier unlocked'
                          : '${NumberFormat('#,###').format(member.remaining)} pts to ${member.next}',
                      style: T.memberMeta,
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: member.progress,
                        minHeight: 6,
                        color: orange,
                        backgroundColor: const Color(0xFFE9EDF2),
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

class ChallengeStrip extends StatelessWidget {
  const ChallengeStrip({super.key, this.onPlay});
  final VoidCallback? onPlay;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E8),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.emoji_events, color: gold, size: 28),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('NETZA CHALLENGE', style: T.challengeTitle),
                Text('Answer daily & win 500 Points!', style: T.challengeSub),
              ],
            ),
          ),
          FilledButton(
            onPressed: onPlay ?? () => context.push('/challenges'),
            style: FilledButton.styleFrom(
              backgroundColor: orange,
              minimumSize: const Size(0, 34),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            child: Text('Play Now >', style: T.playNow),
          ),
        ],
      ),
    );
  }
}

class NetzaDrawer extends StatelessWidget {
  const NetzaDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final loggedIn = context.watch<Session>().isLoggedIn;
    return Drawer(
      child: SafeArea(
        child: ListView(
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: navy),
              child: Align(
                alignment: Alignment.bottomLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('NETZA', style: inter(size: 22, weight: FontWeight.w800, color: Colors.white)),
                    Text('KENYA', style: inter(size: 10, weight: FontWeight.w800, color: orange, spacing: 4)),
                  ],
                ),
              ),
            ),
            ListTile(leading: const Icon(Icons.home_outlined), title: Text('Home', style: inter(weight: FontWeight.w600)), onTap: () { Navigator.pop(context); context.go('/'); }),
            ListTile(leading: const Icon(Icons.grid_view), title: Text('Categories', style: inter(weight: FontWeight.w600)), onTap: () { Navigator.pop(context); context.go('/shop'); }),
            ListTile(leading: const Icon(Icons.local_fire_department_outlined), title: Text('Flash Drop', style: inter(weight: FontWeight.w600)), onTap: () { Navigator.pop(context); context.push('/flash'); }),
            ListTile(leading: const Icon(Icons.receipt_long_outlined), title: Text('Orders', style: inter(weight: FontWeight.w600)), onTap: () { Navigator.pop(context); context.go('/orders'); }),
            ListTile(leading: const Icon(Icons.star_outline), title: Text('Points', style: inter(weight: FontWeight.w600)), onTap: () { Navigator.pop(context); context.go('/points'); }),
            ListTile(leading: const Icon(Icons.person_outline), title: Text('Account', style: inter(weight: FontWeight.w600)), onTap: () { Navigator.pop(context); loggedIn ? context.go('/account') : context.push('/login'); }),
          ],
        ),
      ),
    );
  }
}

class NetzaImage extends StatelessWidget {
  const NetzaImage(this.url, {super.key, this.fallback = Icons.devices_other, this.fit = BoxFit.cover});
  final String? url;
  final IconData fallback;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final raw = url?.trim() ?? '';
    if (raw.isEmpty) {
      return Icon(fallback, color: navy);
    }
    if (raw.startsWith('data:')) {
      try {
        final comma = raw.indexOf(',');
        final b64 = comma >= 0 ? raw.substring(comma + 1) : raw;
        final bytes = base64Decode(b64);
        return Image.memory(bytes, fit: fit, errorBuilder: (_, _, _) => Icon(fallback, color: navy));
      } catch (_) {
        return Icon(fallback, color: navy);
      }
    }
    final resolved = resolveMediaUrl(raw);
    return CachedNetworkImage(
      imageUrl: resolved,
      fit: fit,
      placeholder: (_, _) => const ColoredBox(color: Color(0xFFF2F4F7)),
      errorWidget: (_, _, _) => Icon(fallback, color: navy),
    );
  }
}

