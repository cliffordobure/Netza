import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme.dart';

/// Inter type scale taken from the NETZA Kenya home and categories mockups.
TextStyle inter({
  double size = 14,
  FontWeight weight = FontWeight.w400,
  Color? color,
  double height = 1.2,
  double spacing = 0,
}) {
  return GoogleFonts.inter(
    fontSize: size,
    fontWeight: weight,
    color: color,
    height: height,
    letterSpacing: spacing,
  );
}

class T {
  static TextStyle get logoNetza => inter(size: 21, weight: FontWeight.w800, color: navy, height: 1.0, spacing: 0.3);
  static TextStyle get logoKenya => inter(size: 8.5, weight: FontWeight.w800, color: orange, height: 1.25, spacing: 4.0);
  static TextStyle get headerAction => inter(size: 9, weight: FontWeight.w500, color: const Color(0xFF8A97A6), height: 1.1);
  static TextStyle get searchHint => inter(size: 13, weight: FontWeight.w400, color: const Color(0xFF9AA3AE));
  static TextStyle get searchField => inter(size: 13, weight: FontWeight.w400, color: navy);
  static TextStyle get searchBtn => inter(size: 13, weight: FontWeight.w700, color: Colors.white, height: 1.0);
  static TextStyle get deliverLabel => inter(size: 12.5, weight: FontWeight.w400, color: muted);
  static TextStyle get deliverValue => inter(size: 12.5, weight: FontWeight.w700, color: navy);
  static TextStyle get pointsCaption => inter(size: 11, weight: FontWeight.w500, color: muted);
  static TextStyle get pointsValue => inter(size: 20, weight: FontWeight.w800, color: orange, height: 1.1);
  static TextStyle get memberTitle => inter(size: 13, weight: FontWeight.w700, color: navy, height: 1.15);
  static TextStyle get memberMeta => inter(size: 11, weight: FontWeight.w400, color: muted);
  static TextStyle get section => inter(size: 20, weight: FontWeight.w800, color: const Color(0xFF111827), height: 1.2);
  static TextStyle get catName => inter(size: 11.5, weight: FontWeight.w700, color: const Color(0xFF111827), height: 1.15);
  static TextStyle get catCount => inter(size: 10, weight: FontWeight.w400, color: muted, height: 1.2);
  static TextStyle get homeCat => inter(size: 10, weight: FontWeight.w600, color: navy, height: 1.15);
  static TextStyle get challengeTitle => inter(size: 13, weight: FontWeight.w800, color: navy, spacing: 0.2);
  static TextStyle get challengeSub => inter(size: 11, weight: FontWeight.w400, color: muted);
  static TextStyle get challengeWin => inter(size: 12, weight: FontWeight.w700, color: orange);
  static TextStyle get playNow => inter(size: 12, weight: FontWeight.w700, color: Colors.white, height: 1.0);
  static TextStyle get quiz => inter(size: 14, weight: FontWeight.w700, color: navy, height: 1.25);
  static TextStyle get chip => inter(size: 12, weight: FontWeight.w600);
  static TextStyle get seeAll => inter(size: 13, weight: FontWeight.w600, color: const Color(0xFF1A73C7));
  static TextStyle get productTitle => inter(size: 12, weight: FontWeight.w600, color: const Color(0xFF111827), height: 1.2);
  static TextStyle get price => inter(size: 14, weight: FontWeight.w800, color: orange);
  static TextStyle get flashBadge => inter(size: 10, weight: FontWeight.w800, color: Colors.white, spacing: 0.4, height: 1.0);
  static TextStyle get flashUpTo => inter(size: 13, weight: FontWeight.w800, color: Colors.white, height: 1.1);
  static TextStyle get flashOff => inter(size: 18, weight: FontWeight.w800, color: Colors.white, height: 1.1);
  static TextStyle get flashSub => inter(size: 12, weight: FontWeight.w400, color: const Color(0xFFC5D3E4));
  static TextStyle get timer => inter(size: 13, weight: FontWeight.w800, color: navy, height: 1.0);
  static TextStyle get timerLabel => inter(size: 8, weight: FontWeight.w700, color: const Color(0xFF9BB0C8), spacing: 0.5);
  static TextStyle get viewDeals => inter(size: 12, weight: FontWeight.w700, color: navy, height: 1.0);
  static TextStyle get compare => inter(size: 11, weight: FontWeight.w400, color: const Color(0xFF8A97A6));
  static TextStyle get rating => inter(size: 11, weight: FontWeight.w500, color: const Color(0xFF4B5563));
  static TextStyle get earn => inter(size: 11, weight: FontWeight.w600, color: const Color(0xFF6D28D9));
  static TextStyle get sortFilter => inter(size: 11, weight: FontWeight.w600, color: navy);
  static TextStyle get chipActive => inter(size: 12, weight: FontWeight.w600, color: orange);
  static TextStyle get chipIdle => inter(size: 12, weight: FontWeight.w500, color: const Color(0xFF111827));
  static TextStyle get discount => inter(size: 10, weight: FontWeight.w800, color: Colors.white, height: 1.0);
  static TextStyle get pointsBanner => inter(size: 12, weight: FontWeight.w400, color: const Color(0xFF4C1D95), height: 1.3);
  static TextStyle get howItWorks => inter(size: 12, weight: FontWeight.w700, color: const Color(0xFF6D28D9));
  static TextStyle get pdpTitle => inter(size: 18, weight: FontWeight.w800, color: navy, height: 1.25);
  static TextStyle get pdpPrice => inter(size: 26, weight: FontWeight.w800, color: orange, height: 1.1);
  static TextStyle get inStock => inter(size: 13, weight: FontWeight.w700, color: const Color(0xFF16A34A));
  static TextStyle get trustTitle => inter(size: 10, weight: FontWeight.w700, color: navy, height: 1.15);
  static TextStyle get trustSub => inter(size: 9, weight: FontWeight.w400, color: muted, height: 1.15);
  static TextStyle get cta => inter(size: 12, weight: FontWeight.w800, color: orange, height: 1.0, spacing: 0.3);
  static TextStyle get nav => inter(size: 10, weight: FontWeight.w500, color: const Color(0xFF8A97A6));
  static TextStyle get navActive => inter(size: 10, weight: FontWeight.w600, color: orange);
}
