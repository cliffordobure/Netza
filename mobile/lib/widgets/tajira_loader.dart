import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/type.dart';

/// Custom Tajira mark loader — pulsing T with network nodes and a sweeping ring.
class TajiraLoader extends StatefulWidget {
  const TajiraLoader({
    super.key,
    this.size = 88,
    this.showWordmark = true,
    this.color = orange,
    this.dark = false,
  });

  const TajiraLoader.inline({
    super.key,
    this.size = 42,
    this.color = orange,
  })  : showWordmark = false,
        dark = false;

  const TajiraLoader.button({
    super.key,
    this.size = 22,
    this.color = Colors.white,
  })  : showWordmark = false,
        dark = false;

  const TajiraLoader.splash({super.key})
      : size = 112,
        showWordmark = true,
        color = orange,
        dark = true;

  final double size;
  final bool showWordmark;
  final Color color;
  final bool dark;

  @override
  State<TajiraLoader> createState() => _TajiraLoaderState();
}

class _TajiraLoaderState extends State<TajiraLoader> with SingleTickerProviderStateMixin {
  late final AnimationController _spin;

  @override
  void initState() {
    super.initState();
    _spin = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();
  }

  @override
  void dispose() {
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mark = SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _spin,
        builder: (_, _) => CustomPaint(
          painter: _TajiraMarkPainter(t: _spin.value, color: widget.color),
        ),
      ),
    );

    if (!widget.showWordmark) return mark;

    final titleColor = widget.dark ? Colors.white : navy;
    final subtitleColor = widget.dark ? orange : orange;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        mark,
        const SizedBox(height: 18),
        Text('TAJIRA', style: inter(size: 22, weight: FontWeight.w800, color: titleColor, spacing: 1.4, height: 1)),
        const SizedBox(height: 4),
        Text('KENYA', style: inter(size: 11, weight: FontWeight.w800, color: subtitleColor, spacing: 3.2, height: 1)),
      ],
    );
  }
}

class TajiraSplash extends StatelessWidget {
  const TajiraSplash({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: navy,
      body: Center(child: TajiraLoader.splash()),
    );
  }
}

class _TajiraMarkPainter extends CustomPainter {
  _TajiraMarkPainter({required this.t, required this.color});
  final double t;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final s = size.shortestSide;

    final ring = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = math.max(2, s * 0.045);

    ring.color = color.withValues(alpha: 0.22);
    canvas.drawArc(Rect.fromCircle(center: c, radius: s * 0.46), t * math.pi * 2, math.pi * 1.2, false, ring);

    ring
      ..color = color.withValues(alpha: 0.7)
      ..strokeWidth = math.max(2.2, s * 0.05);
    canvas.drawArc(
      Rect.fromCircle(center: c, radius: s * 0.46),
      t * math.pi * 2 + math.pi * 0.15,
      math.pi * 0.42,
      false,
      ring,
    );

    final fill = Paint()..color = color;
    final tw = s * 0.44;
    final th = s * 0.40;
    final barH = s * 0.10;
    final stemW = s * 0.12;
    final top = c.dy - th * 0.52;
    final left = c.dx - tw / 2;
    final radius = Radius.circular(s * 0.018);

    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(left, top, tw, barH), radius), fill);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(c.dx - stemW / 2, top, stemW, th), radius),
      fill,
    );

    final nodes = <Offset>[
      Offset(left - s * 0.01, top + barH / 2 - s * 0.155),
      Offset(left + tw + s * 0.01, top + barH / 2 - s * 0.155),
      Offset(c.dx + stemW * 0.95, top + th + s * 0.035),
    ];
    final anchors = <Offset>[
      Offset(left + tw * 0.18, top + barH / 2),
      Offset(left + tw * 0.82, top + barH / 2),
      Offset(c.dx + stemW * 0.18, top + th * 0.74),
    ];

    final line = Paint()
      ..color = color
      ..strokeWidth = math.max(1.4, s * 0.018)
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < nodes.length; i++) {
      final pulse = 0.72 + 0.28 * (0.5 + 0.5 * math.sin((t * math.pi * 2) + i * 2.15));
      canvas.drawLine(anchors[i], nodes[i], line);
      canvas.drawCircle(nodes[i], s * 0.048 * pulse, fill);
    }
  }

  @override
  bool shouldRepaint(covariant _TajiraMarkPainter old) => old.t != t || old.color != color;
}
