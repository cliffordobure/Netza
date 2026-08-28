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
  final identifier = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool busy = false;
  bool showPassword = false;

  @override
  void dispose() {
    identifier.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    final id = identifier.text.trim();
    final pass = password.text;
    if (id.isEmpty || pass.isEmpty) {
      setState(() => error = 'Enter your phone or email and password');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await context.read<Session>().login(id, pass);
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
                  TextField(
                    controller: identifier,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.username, AutofillHints.email, AutofillHints.telephoneNumber],
                    decoration: const InputDecoration(
                      labelText: 'Phone or email',
                      hintText: '07… or you@email.com',
                      helperText: 'Use the same phone you registered with if email fails',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: password,
                    obscureText: !showPassword,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => busy ? null : submit(),
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Password',
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => showPassword = !showPassword),
                        icon: Icon(showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                      ),
                    ),
                  ),
                  if (error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Text(error!, style: const TextStyle(color: Colors.red)),
                    ),
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
  bool showPassword = false;

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
    setState(() {
      busy = true;
      error = null;
    });
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
          TextField(controller: first, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'First name')),
          TextField(controller: last, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Last name')),
          TextField(
            controller: phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone', hintText: '07XX XXX XXX'),
          ),
          TextField(
            controller: email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email (optional)'),
          ),
          TextField(
            controller: password,
            obscureText: !showPassword,
            decoration: InputDecoration(
              labelText: 'Password (min 6 characters)',
              suffixIcon: IconButton(
                onPressed: () => setState(() => showPassword = !showPassword),
                icon: Icon(showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
              ),
            ),
          ),
          TextField(controller: referral, decoration: const InputDecoration(labelText: 'Referral code (optional)')),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(error!, style: const TextStyle(color: Colors.red)),
            ),
          const SizedBox(height: 16),
          FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Creating…' : 'Join NETZA')),
          TextButton(onPressed: () => context.pop(), child: const Text('Already have an account? Sign in')),
        ],
      ),
    );
  }
}
