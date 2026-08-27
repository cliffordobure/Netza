import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../state/session.dart';
import 'order_success_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List orders = [];

  @override
  void initState() {
    super.initState();
    final session = context.read<Session>();
    if (session.isLoggedIn) {
      session.dio.get('/orders').then((res) => setState(() => orders = res.data['orders'] as List));
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    if (!session.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('Orders')),
        body: Center(
          child: FilledButton(onPressed: () => context.push('/login'), child: const Text('Sign in to view orders')),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final o = orders[i] as Map;
        return ListTile(
          tileColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(o['orderNumber'] ?? ''),
          subtitle: Text('${o['status']} · ${o['paymentStatus']}'),
          trailing: Text(money(o['totalKes'])),
          onTap: () => context.push('/order/${o['id']}'),
        );
      },
    ),
    );
  }
}

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) => OrderSuccessScreen(id: id);
}
