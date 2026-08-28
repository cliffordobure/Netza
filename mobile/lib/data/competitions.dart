import 'package:flutter/material.dart';
import '../core/theme.dart';

enum CompStatus { active, upcoming, ended }

CompStatus compStatusFromApi(String? raw) {
  switch (raw) {
    case 'upcoming':
      return CompStatus.upcoming;
    case 'ended':
      return CompStatus.ended;
    default:
      return CompStatus.active;
  }
}

Color badgeColorFor(String badge) {
  final b = badge.toLowerCase();
  if (b.contains('flash')) return purple;
  if (b.contains('review')) return const Color(0xFFE53935);
  if (b.contains('refer')) return teal;
  if (b.contains('top') || b.contains('shop')) return orange;
  return purple;
}

class Competition {
  const Competition({
    required this.id,
    required this.name,
    required this.description,
    required this.image,
    required this.status,
    this.endsLabel = '',
    this.badge = '',
    this.badgeColor = purple,
    this.yourPts = 0,
    this.goalPts = 0,
    this.yourRank = 0,
    this.dates = '',
    this.prize = '',
    this.route = '/catalog',
    this.type = 'challenge',
    this.startsAt,
    this.endsAt,
    this.pointsCorrect = 50,
    this.maxAttempts = 10,
    this.questions = const [],
    this.leaderboard = const [],
    this.rules = const [],
  });

  factory Competition.fromJson(Map<String, dynamic> json) {
    final badge = json['badge']?.toString() ?? '';
    return Competition(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? json['title']?.toString() ?? 'Competition',
      description: json['description']?.toString() ?? '',
      image: json['image']?.toString() ?? json['imageUrl']?.toString() ?? '',
      status: compStatusFromApi(json['status']?.toString()),
      endsLabel: json['endsLabel']?.toString() ?? '',
      badge: badge,
      badgeColor: badgeColorFor(badge),
      yourPts: (json['yourPts'] as num?)?.toInt() ?? 0,
      goalPts: (json['goalPts'] as num?)?.toInt() ?? (json['pointsToWin'] as num?)?.toInt() ?? 1000,
      yourRank: (json['yourRank'] as num?)?.toInt() ?? 0,
      dates: json['dates']?.toString() ?? '',
      prize: json['prize']?.toString() ?? '',
      route: json['route']?.toString() ?? '/catalog',
      type: json['type']?.toString() ?? 'challenge',
      startsAt: json['startsAt']?.toString(),
      endsAt: json['endsAt']?.toString(),
      pointsCorrect: (json['pointsCorrect'] as num?)?.toInt() ?? 50,
      maxAttempts: (json['maxAttempts'] as num?)?.toInt() ?? 10,
      questions: (json['questions'] as List? ?? [])
          .map((q) => QuizQuestion.fromJson(Map<String, dynamic>.from(q as Map)))
          .toList(),
      leaderboard: (json['leaderboard'] as List? ?? [])
          .map((p) => LeaderPreview.fromJson(Map<String, dynamic>.from(p as Map)))
          .toList(),
      rules: (json['rules'] as List? ?? []).map((r) => r.toString()).toList(),
    );
  }

  bool get isQuiz => type.toLowerCase().contains('quiz') && questions.isNotEmpty;

  final String id;
  final String name;
  final String description;
  final String image;
  final CompStatus status;
  final String endsLabel;
  final String badge;
  final Color badgeColor;
  final int yourPts;
  final int goalPts;
  final int yourRank;
  final String dates;
  final String prize;
  final String route;
  final String type;
  final String? startsAt;
  final String? endsAt;
  final int pointsCorrect;
  final int maxAttempts;
  final List<QuizQuestion> questions;
  final List<LeaderPreview> leaderboard;
  final List<String> rules;
}

class LeaderPreview {
  const LeaderPreview(this.name, this.pts, this.image, this.place);

  factory LeaderPreview.fromJson(Map<String, dynamic> json) {
    return LeaderPreview(
      json['name']?.toString() ?? 'Customer',
      (json['pts'] as num?)?.toInt() ?? (json['points'] as num?)?.toInt() ?? 0,
      json['image']?.toString() ?? json['imageUrl']?.toString() ?? '',
      (json['place'] as num?)?.toInt() ?? (json['rank'] as num?)?.toInt() ?? 0,
    );
  }

  final String name;
  final int pts;
  final String image;
  final int place;
}

class QuizQuestion {
  const QuizQuestion(this.text, this.options, this.correct);

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      json['text']?.toString() ?? '',
      (json['options'] as List? ?? []).map((o) => o.toString()).toList(),
      (json['correct'] as num?)?.toInt() ?? 0,
    );
  }

  final String text;
  final List<String> options;
  final int correct;
}

const earnWays = [
  (Icons.shopping_cart_outlined, 'Shop & Spend'),
  (Icons.star_outline, 'Join Challenges'),
  (Icons.edit_note, 'Write Reviews'),
  (Icons.groups_outlined, 'Refer Friends'),
  (Icons.bolt, 'Flash Drop'),
];

class CompetitionStats {
  const CompetitionStats({
    this.active = 0,
    this.upcoming = 0,
    this.ended = 0,
    this.yourMonthlyPts = 0,
    this.yourRank = 0,
    this.competitionPts = 0,
  });

  factory CompetitionStats.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const CompetitionStats();
    return CompetitionStats(
      active: (json['active'] as num?)?.toInt() ?? 0,
      upcoming: (json['upcoming'] as num?)?.toInt() ?? 0,
      ended: (json['ended'] as num?)?.toInt() ?? 0,
      yourMonthlyPts: (json['yourMonthlyPts'] as num?)?.toInt() ?? 0,
      yourRank: (json['yourRank'] as num?)?.toInt() ?? 0,
      competitionPts: (json['competitionPts'] as num?)?.toInt() ?? 0,
    );
  }

  final int active;
  final int upcoming;
  final int ended;
  final int yourMonthlyPts;
  final int yourRank;
  final int competitionPts;
}
