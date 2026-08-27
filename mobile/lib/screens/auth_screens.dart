import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../state/session.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final identifier = TextEditingController(text: '0712345678');
  final password = TextEditingController(text: 'Customer@123');
  String? error;
  bool busy = false;

  @override
  void dispose() {
    identifier.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      final data = await context.read<Session>().login(identifier.text.trim(), password.text);
      if (!mounted) return;
      final daily = data['dailyLogin'];
      if (daily is Map && daily['awarded'] == true && (daily['points'] ?? 0) > 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Daily login +${daily['points']} NETZA points')),
        );
      }
      context.go('/');
    } catch (e) {
      setState(() => error = apiMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: navy,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 24),
            const Text('NETZA', style: TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800)),
            const Text('KENYA', style: TextStyle(color: orange, letterSpacing: 6, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text('Networking · Security · Technology', style: TextStyle(color: Color(0xFFB9C7D6))),
            const SizedBox(height: 36),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Welcome back', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 16),
                  TextField(controller: identifier, decoration: const InputDecoration(labelText: 'Phone or email')),
                  const SizedBox(height: 12),
                  TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
                  if (error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(error!, style: const TextStyle(color: Colors.red))),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Signing in…' : 'Sign in')),
                  TextButton(onPressed: () => context.push('/register'), child: const Text('Create an account')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final first = TextEditingController();
  final last = TextEditingController();
  final phone = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  final referral = TextEditingController();
  String? error;
  bool busy = false;

  @override
  void dispose() {
    first.dispose();
    last.dispose();
    phone.dispose();
    email.dispose();
    password.dispose();
    referral.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      await context.read<Session>().register({
        'firstName': first.text.trim(),
        'lastName': last.text.trim(),
        'phone': phone.text.trim(),
        'email': email.text.trim(),
        'password': password.text,
        if (referral.text.trim().isNotEmpty) 'referralCode': referral.text.trim(),
      });
      if (mounted) context.go('/');
    } catch (e) {
      setState(() => error = apiMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(controller: first, decoration: const InputDecoration(labelText: 'First name')),
          TextField(controller: last, decoration: const InputDecoration(labelText: 'Last name')),
          TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone (07…)')),
          TextField(controller: email, decoration: const InputDecoration(labelText: 'Email (optional)')),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
          TextField(controller: referral, decoration: const InputDecoration(labelText: 'Referral code (optional)')),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(error!, style: const TextStyle(color: Colors.red))),
          const SizedBox(height: 16),
          FilledButton(onPressed: busy ? null : submit, child: const Text('Join NETZA')),
        ],
      ),
    );
  }
}
