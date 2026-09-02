/// Hosted Tajira API. Override locally with:
/// `flutter run --dart-define=API_URL=http://10.0.2.2:4000/api/v1`
const String kDefaultApiBaseUrl = 'https://netza.onrender.com/api/v1';

String apiBaseUrl() {
  const env = String.fromEnvironment('API_URL');
  if (env.isNotEmpty) return env;
  return kDefaultApiBaseUrl;
}

/// Origin without `/api/v1` — used for `/uploads/...` media.
String apiOrigin() {
  final base = apiBaseUrl().replaceAll(RegExp(r'/+$'), '');
  return base.replaceFirst(RegExp(r'/api/v1$'), '');
}

String resolveMediaUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) return '${apiOrigin()}$url';
  return url;
}
