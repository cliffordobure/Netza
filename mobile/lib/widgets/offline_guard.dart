import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/type.dart';

bool isConnectionError(Object e) {
  if (e is! DioException) return false;
  return e.type == DioExceptionType.connectionError ||
      e.type == DioExceptionType.connectionTimeout ||
      e.type == DioExceptionType.receiveTimeout ||
      e.type == DioExceptionType.sendTimeout ||
      (e.type == DioExceptionType.unknown && e.message?.toLowerCase().contains('socket') == true);
}

/// Listens for offline state and shows a professional dialog with Reload.
class OfflineGuard extends StatefulWidget {
  const OfflineGuard({super.key, required this.child});
  final Widget child;

  @override
  State<OfflineGuard> createState() => _OfflineGuardState();
}

class _OfflineGuardState extends State<OfflineGuard> {
  StreamSubscription<List<ConnectivityResult>>? _sub;
  bool _dialogOpen = false;

  @override
  void initState() {
    super.initState();
    _sub = Connectivity().onConnectivityChanged.listen(_onChange);
    _probe();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  bool _isOffline(List<ConnectivityResult> results) {
    if (results.isEmpty) return true;
    return results.every((r) => r == ConnectivityResult.none);
  }

  Future<void> _probe() async {
    final results = await Connectivity().checkConnectivity();
    _onChange(results);
  }

  void _onChange(List<ConnectivityResult> results) {
    if (!mounted) return;
    if (_isOffline(results)) {
      _showOffline();
    } else {
      _dismissOffline();
    }
  }

  Future<void> _showOffline() async {
    if (_dialogOpen || !mounted) return;
    _dialogOpen = true;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: const Color(0xCC0B1F3A),
      builder: (ctx) {
        var checking = false;
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return PopScope(
              canPop: false,
              child: Dialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                insetPadding: const EdgeInsets.symmetric(horizontal: 28),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 22),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFF1E6),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.wifi_off_rounded, color: orange, size: 34),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        'No internet connection',
                        textAlign: TextAlign.center,
                        style: inter(size: 18, weight: FontWeight.w800, color: navy, height: 1.2),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'TAJIRA needs a connection to load deals and products. Check your network, then try again.',
                        textAlign: TextAlign.center,
                        style: inter(size: 13, weight: FontWeight.w400, color: muted, height: 1.45),
                      ),
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: FilledButton(
                          onPressed: checking
                              ? null
                              : () async {
                                  setLocal(() => checking = true);
                                  final messenger = ScaffoldMessenger.of(this.context);
                                  final results = await Connectivity().checkConnectivity();
                                  await Future<void>.delayed(const Duration(milliseconds: 350));
                                  if (!ctx.mounted) return;
                                  if (!_isOffline(results)) {
                                    Navigator.of(ctx).pop();
                                    return;
                                  }
                                  setLocal(() => checking = false);
                                  messenger.showSnackBar(
                                    SnackBar(
                                      behavior: SnackBarBehavior.floating,
                                      backgroundColor: navy,
                                      content: Text(
                                        'Still offline — please check Wi‑Fi or mobile data.',
                                        style: inter(size: 13, color: Colors.white),
                                      ),
                                    ),
                                  );
                                },
                          style: FilledButton.styleFrom(
                            backgroundColor: orange,
                            disabledBackgroundColor: orange.withValues(alpha: 0.7),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: checking
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                                )
                              : Text('Reload', style: inter(size: 15, weight: FontWeight.w800, color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
    _dialogOpen = false;
  }

  void _dismissOffline() {
    if (!_dialogOpen || !mounted) return;
    final nav = Navigator.of(context, rootNavigator: true);
    if (nav.canPop()) nav.pop();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
