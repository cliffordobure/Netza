import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TajiraBottomNav extends StatelessWidget {
  const TajiraBottomNav({super.key, required this.currentIndex, this.onTap});
  final int currentIndex;
  final ValueChanged<int>? onTap;

  static const _routes = ['/', '/shop', '/orders', '/points', '/account'];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFEEF1F5))),
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap ?? (i) => context.go(_routes[i]),
        selectedFontSize: 10,
        unselectedFontSize: 10,
        iconSize: 24,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.grid_view), activeIcon: Icon(Icons.grid_view_rounded), label: 'Categories'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), activeIcon: Icon(Icons.receipt_long), label: 'Orders'),
          BottomNavigationBarItem(icon: Icon(Icons.star_outline), activeIcon: Icon(Icons.star), label: 'Points'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Account'),
        ],
      ),
    );
  }
}
