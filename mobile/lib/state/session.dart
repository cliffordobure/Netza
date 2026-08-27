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
        if (err.response?.statusCode == 401 && refresh != null && !_refreshing) {
          _refreshing = true;
          try {
            final res = await Dio(BaseOptions(baseUrl: apiBaseUrl())).post(
              '/auth/refresh',
              data: {'refreshToken': refresh},
            );
            await _saveTokens(res.data['accessToken'], res.data['refreshToken']);
            final req = err.requestOptions;
            req.headers['Authorization'] = 'Bearer $access';
            final clone = await dio.fetch(req);
            _refreshing = false;
            return handler.resolve(clone);
          } catch (_) {
            await logout();
          }
          _refreshing = false;
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
  bool _refreshing = false;

  bool get isLoggedIn => user != null;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    access = prefs.getString('access');
    refresh = prefs.getString('refresh');
    if (access != null) {
      try {
        final res = await dio.get('/auth/me');
        user = Map<String, dynamic>.from(res.data['user']);
        pointsBalance = res.data['pointsBalance'] ?? 0;
        await dio.post('/auth/daily-login');
        await refreshWallet();
        await refreshCart();
      } catch (_) {
        user = null;
      }
    }
    ready = true;
    notifyListeners();
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
      'identifier': identifier,
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
  }
}

String apiMessage(Object e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) return data['message'].toString();
    return e.message ?? 'Network error';
  }
  return e.toString();
}
