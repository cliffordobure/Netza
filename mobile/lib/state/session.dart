import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config.dart';

class Session extends ChangeNotifier {
  Session() {
    dio = Dio(BaseOptions(
      baseUrl: apiBaseUrl(),
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
    ));
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (access != null) {
          options.headers['Authorization'] = 'Bearer $access';
        }
        handler.next(options);
      },
      onError: (err, handler) async {
        final status = err.response?.statusCode;
        final path = err.requestOptions.path;
        final skipRefresh = path.contains('/auth/login') ||
            path.contains('/auth/register') ||
            path.contains('/auth/refresh');
        if (status == 401 && refresh != null && !skipRefresh) {
          try {
            await _refreshTokens();
            final req = err.requestOptions;
            req.headers['Authorization'] = 'Bearer $access';
            final clone = await dio.fetch(req);
            return handler.resolve(clone);
          } catch (_) {
            // Session truly dead — fall through
          }
        }
        handler.next(err);
      },
    ));
  }

  late final Dio dio;
  String? access;
  String? refresh;
  Map<String, dynamic>? user;
  int pointsBalance = 0;
  int totalEarned = 0;
  int cartCount = 0;
  bool ready = false;
  Completer<void>? _refreshGate;

  bool get isLoggedIn => user != null;

  Future<void> _refreshTokens() async {
    if (_refreshGate != null) return _refreshGate!.future;
    final token = refresh;
    if (token == null) throw StateError('No refresh token');

    _refreshGate = Completer<void>();
    try {
      final res = await Dio(BaseOptions(
        baseUrl: apiBaseUrl(),
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
      )).post('/auth/refresh', data: {'refreshToken': token});
      await _saveTokens(res.data['accessToken'], res.data['refreshToken']);
      _refreshGate!.complete();
    } catch (e) {
      _refreshGate!.completeError(e);
      await logout();
      rethrow;
    } finally {
      _refreshGate = null;
    }
  }

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    access = prefs.getString('access');
    refresh = prefs.getString('refresh');
    if (access != null || refresh != null) {
      try {
        await _loadMe();
        await dio.post('/auth/daily-login');
        await refreshWallet();
        await refreshCart();
      } catch (_) {
        // Keep tokens if offline; only clear when refresh already logged out.
        if (refresh == null && access == null) {
          user = null;
        } else if (user == null && refresh != null) {
          try {
            await _refreshTokens();
            await _loadMe();
            await refreshWallet();
            await refreshCart();
          } catch (_) {
            user = null;
          }
        }
      }
    }
    ready = true;
    notifyListeners();
  }

  Future<void> _loadMe() async {
    final res = await dio.get('/auth/me');
    user = Map<String, dynamic>.from(res.data['user']);
    pointsBalance = res.data['pointsBalance'] ?? 0;
  }

  Future<void> refreshCart() async {
    if (!isLoggedIn) {
      cartCount = 0;
      notifyListeners();
      return;
    }
    try {
      final res = await dio.get('/cart');
      cartCount = res.data['cart']?['itemCount'] ?? 0;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> refreshWallet() async {
    if (!isLoggedIn) return;
    try {
      final res = await dio.get('/points/wallet');
      pointsBalance = res.data['balance'] ?? pointsBalance;
      totalEarned = res.data['totalEarned'] ?? pointsBalance;
      if (user != null && res.data['membershipLevel'] != null) {
        user = {...user!, 'membershipLevel': res.data['membershipLevel']};
      }
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _saveTokens(String a, String r) async {
    access = a;
    refresh = r;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access', a);
    await prefs.setString('refresh', r);
  }

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final res = await dio.post('/auth/login', data: {
      'identifier': identifier.trim(),
      'password': password,
    });
    await _saveTokens(res.data['accessToken'], res.data['refreshToken']);
    user = Map<String, dynamic>.from(res.data['user']);
    await refreshWallet();
    await refreshCart();
    notifyListeners();
    return Map<String, dynamic>.from(res.data);
  }

  Future<void> register(Map<String, dynamic> body) async {
    final res = await dio.post('/auth/register', data: body);
    await _saveTokens(res.data['accessToken'], res.data['refreshToken']);
    user = Map<String, dynamic>.from(res.data['user']);
    await refreshWallet();
    await refreshCart();
    notifyListeners();
  }

  void updateUser(Map<String, dynamic> next) {
    user = next;
    notifyListeners();
  }

  Future<void> logout() async {
    final oldRefresh = refresh;
    user = null;
    access = null;
    refresh = null;
    pointsBalance = 0;
    totalEarned = 0;
    cartCount = 0;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access');
    await prefs.remove('refresh');
    notifyListeners();
    if (oldRefresh != null) {
      try {
        await Dio(BaseOptions(baseUrl: apiBaseUrl())).post(
          '/auth/logout',
          data: {'refreshToken': oldRefresh},
        );
      } catch (_) {}
    }
  }
}

String apiMessage(Object e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) return data['message'].toString();
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout) {
      return 'No internet connection';
    }
    return e.message ?? 'Network error';
  }
  return e.toString();
}
