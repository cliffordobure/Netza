import 'package:flutter/material.dart';
import '../core/theme.dart';

enum CompStatus { active, upcoming, ended }

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
  });

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
}

class LeaderPreview {
  const LeaderPreview(this.name, this.pts, this.image, this.place);
  final String name;
  final int pts;
  final String image;
  final int place;
}

const competitions = [
  Competition(
    id: 'flash-drop-shopper',
    name: 'Flash Drop Shopper',
    description: 'Score points on every Flash Drop purchase this week.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=700&q=80',
    status: CompStatus.active,
    endsLabel: 'Ends in 5d 12h',
    badge: 'FLASH DROP BONUS',
    badgeColor: purple,
    yourPts: 320,
    goalPts: 1000,
    yourRank: 14,
    route: '/flash',
  ),
  Competition(
    id: 'networking-pro',
    name: 'Networking Pro',
    description: 'Answer 10 networking questions correctly and climb the leaderboard!',
    image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=700&q=80',
    status: CompStatus.active,
    endsLabel: 'Ends in 10d 8h',
    badge: 'TOP SPENDER',
    badgeColor: orange,
    yourPts: 450,
    goalPts: 2000,
    yourRank: 9,
    route: '/catalog?category=networking',
  ),
  Competition(
    id: 'review-master',
    name: 'Review Master',
    description: 'Write verified reviews and climb the champion board.',
    image: 'https://images.unsplash.com/photo-1557597774-9d273bd59043?auto=format&fit=crop&w=700&q=80',
    status: CompStatus.active,
    endsLabel: 'Ends in 15d 6h',
    badge: 'REVIEW CHAMPION',
        badgeColor: Color(0xFFE53935),
    yourPts: 180,
    goalPts: 500,
    yourRank: 22,
    route: '/orders',
  ),
  Competition(
    id: 'mega-shopper',
    name: 'Monthly Mega Shopper',
    description: 'The biggest spend challenge of the month.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80',
    status: CompStatus.upcoming,
    dates: '01 Jun 2026 - 30 Jun 2026',
    prize: '1st Prize 10,000 Pts + KSh 2,000 Voucher',
  ),
  Competition(
    id: 'refer-win',
    name: 'Refer & Win Challenge',
    description: 'Invite friends and earn when they place a first order.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=700&q=80',
    status: CompStatus.upcoming,
    dates: '05 Jun 2026 - 20 Jun 2026',
    prize: '1st Prize 5,000 Pts + Special Badge',
  ),
  Competition(
    id: 'april-cup',
    name: 'April Installer Cup',
    description: 'You finished in the top 20 of last month’s installer sprint.',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=700&q=80',
    status: CompStatus.ended,
    dates: '01 Apr 2026 - 30 Apr 2026',
    prize: 'Finished #12 · 800 Pts awarded',
    yourPts: 800,
    goalPts: 800,
    yourRank: 12,
  ),
];

const leaderPreview = [
  LeaderPreview('Brian M.', 2450, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 1),
  LeaderPreview('Sharon A.', 2180, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', 2),
  LeaderPreview('Kevin O.', 1960, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 3),
];

const earnWays = [
  (Icons.shopping_cart_outlined, 'Shop & Spend'),
  (Icons.star_outline, 'Join Challenges'),
  (Icons.edit_note, 'Write Reviews'),
  (Icons.groups_outlined, 'Refer Friends'),
  (Icons.bolt, 'Flash Drop'),
];

class QuizQuestion {
  const QuizQuestion(this.text, this.options, this.correct);
  final String text;
  final List<String> options;
  final int correct;
}

const networkingProQuestions = [
  QuizQuestion('Which device is normally used to connect different networks?', ['Switch', 'Router', 'Patch Panel', 'Access Point'], 1),
  QuizQuestion('What does PoE stand for in networking?', ['Power over Ethernet', 'Port of Entry', 'Packet over Ethernet', 'Power on Ethernet'], 0),
  QuizQuestion('Which cable is standard for Gigabit LAN runs?', ['Cat3', 'Cat5', 'Cat6', 'Coaxial RG59'], 2),
  QuizQuestion('What does DHCP provide to clients?', ['Automatic IP addresses', 'Fibre conversion', 'PoE budget', 'VLAN tagging only'], 0),
  QuizQuestion('A typical CCTV IP camera is powered most cleanly with?', ['PoE switch or injector', 'HDMI only', 'USB-C PD', 'SATA power'], 0),
  QuizQuestion('Which device usually provides Wi-Fi coverage in an office?', ['Access Point', 'Patch panel', 'Media converter', 'UPS'], 0),
  QuizQuestion('What does VLAN help you do?', ['Segment a network', 'Increase PoE watts', 'Replace DNS', 'Terminate fibre'], 0),
  QuizQuestion('An NVR is used mainly to?', ['Record IP camera video', 'Route internet traffic', 'Terminate Cat6', 'Supply 48V only'], 0),
  QuizQuestion('SFP ports on a switch are typically for?', ['Fibre uplinks', 'USB cameras', 'HDMI output', 'SIM cards'], 0),
  QuizQuestion('A firewall is placed to?', ['Filter traffic between networks', 'Power access points', 'Crimp RJ45 ends', 'Store NVR footage'], 0),
];

const challengeBoard = [
  LeaderPreview('Brian M.', 2450, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 1),
  LeaderPreview('Sharon A.', 2180, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', 2),
  LeaderPreview('Kevin O.', 1960, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 3),
  LeaderPreview('Faith W.', 890, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', 4),
  LeaderPreview('Daniel K.', 720, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', 5),
  LeaderPreview('Mercy N.', 610, 'https://images.unsplash.com/photo-1531123897727-8f813ffd8d70?auto=format&fit=crop&w=200&q=80', 6),
  LeaderPreview('Peter L.', 540, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', 7),
];

Competition? competitionById(String id) {
  for (final c in competitions) {
    if (c.id == id) return c;
  }
  return null;
}
