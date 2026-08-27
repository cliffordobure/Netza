import 'package:flutter/foundation.dart';

String apiBaseUrl() {
  const env = String.fromEnvironment('API_URL');
  if (env.isNotEmpty) return env;
  if (kIsWeb) return 'http://localhost:4000/api/v1';
  if (defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:4000/api/v1';
  }
  return 'http://127.0.0.1:4000/api/v1';
}
