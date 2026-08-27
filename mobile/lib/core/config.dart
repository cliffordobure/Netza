/// Hosted NETZA API. Override locally with:
/// `flutter run --dart-define=API_URL=http://10.0.2.2:4000/api/v1`
const String kDefaultApiBaseUrl = 'https://netza.onrender.com/api/v1';

String apiBaseUrl() {
  const env = String.fromEnvironment('API_URL');
  if (env.isNotEmpty) return env;
  return kDefaultApiBaseUrl;
}
