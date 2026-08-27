import 'package:intl/intl.dart';

final kes = NumberFormat.currency(locale: 'en_KE', symbol: 'KSh ', decimalDigits: 0);

String money(num? n) => kes.format(n ?? 0);
