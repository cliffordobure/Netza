import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const navy = Color(0xFF0B1F3A);
const navy2 = Color(0xFF123056);
const orange = Color(0xFFFF7A00);
const teal = Color(0xFF128C7E);
const paper = Color(0xFFF7F8FA);
const gold = Color(0xFFE6B325);
const muted = Color(0xFF6B7A8C);
const purple = Color(0xFF6D28D9);

ThemeData netzaTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: orange,
      primary: orange,
      secondary: teal,
      surface: Colors.white,
    ),
    scaffoldBackgroundColor: Colors.white,
  );
  final inter = GoogleFonts.interTextTheme(base.textTheme);
  return base.copyWith(
    textTheme: inter,
    appBarTheme: AppBarTheme(
      backgroundColor: navy,
      foregroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: orange,
      unselectedItemColor: const Color(0xFF8A97A6),
      type: BottomNavigationBarType.fixed,
      selectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 10, height: 1.2),
      unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 10, height: 1.2),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: orange,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
      ),
    ),
  );
}

({String next, int remaining, double progress, String current}) membershipProgress(String level, int earned) {
  final bands = <(String, int)>[
    ('Bronze', 0),
    ('Silver', 1000),
    ('Gold', 5000),
    ('Platinum', 15000),
  ];
  final current = level.isEmpty ? 'Bronze' : '${level[0]}${level.substring(1).toLowerCase()}';
  var nextName = 'Platinum';
  var floor = 0;
  var ceil = 15000;
  for (var i = 0; i < bands.length; i++) {
    if (earned >= bands[i].$2) {
      floor = bands[i].$2;
      if (i < bands.length - 1) {
        nextName = bands[i + 1].$1;
        ceil = bands[i + 1].$2;
      } else {
        return (next: 'Platinum', remaining: 0, progress: 1, current: current);
      }
    }
  }
  final remaining = (ceil - earned).clamp(0, ceil);
  final progress = ((earned - floor) / (ceil - floor)).clamp(0.0, 1.0);
  return (next: nextName, remaining: remaining, progress: progress, current: current);
}
