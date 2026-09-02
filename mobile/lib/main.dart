import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'screens/account_orders.dart';
import 'screens/account_screen.dart';
import 'screens/auth_screens.dart';
import 'screens/cart_screen.dart';
import 'screens/checkout_screen.dart';
import 'screens/catalog_screen.dart';
import 'screens/categories_screen.dart';
import 'screens/home_screen.dart';
import 'screens/product_screen.dart';
import 'screens/points_screen.dart';
import 'screens/challenges_screen.dart';
import 'screens/challenge_detail_screen.dart';
import 'screens/flash_drop_screen.dart';
import 'screens/quotes_screen.dart';
import 'screens/shell.dart';
import 'state/session.dart';
import 'widgets/offline_guard.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TajiraApp());
}

class TajiraApp extends StatefulWidget {
  const TajiraApp({super.key});
  @override
  State<TajiraApp> createState() => _TajiraAppState();
}

class _TajiraAppState extends State<TajiraApp> {
  late final Session session;
  late final GoRouter router;

  @override
  void initState() {
    super.initState();
    session = Session();
    router = GoRouter(
      refreshListenable: session,
      routes: [
        GoRoute(path: '/login', builder: (_, state) => const LoginScreen()),
        GoRoute(path: '/register', builder: (_, state) => const RegisterScreen()),
        GoRoute(
          path: '/product/:id',
          builder: (_, state) => ProductScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/catalog',
          builder: (_, state) => CatalogScreen(
            category: state.uri.queryParameters['category'],
            query: state.uri.queryParameters['q'],
            flash: state.uri.queryParameters['flash'] == '1',
          ),
        ),
        GoRoute(path: '/checkout', builder: (_, state) => const CheckoutScreen()),
        GoRoute(path: '/cart', builder: (_, state) => const CartScreen()),
        GoRoute(path: '/flash', builder: (_, state) => const FlashDropScreen()),
        GoRoute(path: '/challenges', builder: (_, state) => const ChallengesScreen()),
        GoRoute(
          path: '/challenges/:id',
          builder: (_, state) => ChallengeDetailScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/order/:id',
          builder: (_, state) => OrderDetailScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(path: '/quotes', builder: (_, state) => const QuotesScreen()),
        GoRoute(path: '/quotes/new', builder: (_, state) => const QuoteEditScreen()),
        GoRoute(
          path: '/quotes/:id/edit',
          builder: (_, state) => QuoteEditScreen(id: state.pathParameters['id']),
        ),
        GoRoute(
          path: '/quotes/:id',
          builder: (_, state) => QuoteDetailScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/q/:token',
          builder: (_, state) => QuoteDetailScreen(
            id: 'shared',
            token: state.pathParameters['token'],
          ),
        ),
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) => ShellScreen(navigationShell: navigationShell),
          branches: [
            StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, state) => const HomeScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/shop', builder: (_, state) => const CategoriesScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/orders', builder: (_, state) => const OrdersScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/points', builder: (_, state) => const PointsScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/account', builder: (_, state) => const AccountScreen())]),
          ],
        ),
      ],
    );
    session.restore();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: session,
      child: MaterialApp.router(
        title: 'Tajira Kenya',
        debugShowCheckedModeBanner: false,
        theme: tajiraTheme(),
        routerConfig: router,
        builder: (context, child) {
          return ListenableBuilder(
            listenable: session,
            builder: (context, _) {
              if (!session.ready) {
                return const Scaffold(
                  backgroundColor: navy,
                  body: Center(child: CircularProgressIndicator(color: orange)),
                );
              }
              return OfflineGuard(child: child ?? const SizedBox.shrink());
            },
          );
        },
      ),
    );
  }
}
