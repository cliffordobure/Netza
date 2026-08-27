class FilterChipItem {
  const FilterChipItem(this.label, {this.query});
  final String label;
  final String? query;
}

List<FilterChipItem> chipsFor({String? category, String? query, bool flash = false}) {
  if (flash) {
    return const [
      FilterChipItem('All'),
      FilterChipItem('Networking', query: 'router'),
      FilterChipItem('CCTV', query: 'camera'),
      FilterChipItem('Cabling', query: 'cable'),
      FilterChipItem('More'),
    ];
  }
  switch (category) {
    case 'networking':
    case 'computers':
      return const [
        FilterChipItem('All'),
        FilterChipItem('Routers', query: 'router'),
        FilterChipItem('Switches', query: 'switch'),
        FilterChipItem('Access Points', query: 'access point'),
        FilterChipItem('Network Cards', query: 'card'),
        FilterChipItem('More'),
      ];
    case 'cctv':
      return const [
        FilterChipItem('All'),
        FilterChipItem('Dome', query: 'dome'),
        FilterChipItem('Bullet', query: 'turret'),
        FilterChipItem('PTZ', query: 'ptz'),
        FilterChipItem('NVR', query: 'nvr'),
        FilterChipItem('More'),
      ];
    case 'access-control':
      return const [
        FilterChipItem('All'),
        FilterChipItem('Biometrics', query: 'fingerprint'),
        FilterChipItem('RFID', query: 'rfid'),
        FilterChipItem('Locks', query: 'lock'),
        FilterChipItem('More'),
      ];
    case 'cabling':
      return const [
        FilterChipItem('All'),
        FilterChipItem('Cat6', query: 'cat6'),
        FilterChipItem('Fiber', query: 'fiber'),
        FilterChipItem('Connectors', query: 'connector'),
        FilterChipItem('More'),
      ];
    case 'power':
      return const [
        FilterChipItem('All'),
        FilterChipItem('UPS', query: 'ups'),
        FilterChipItem('PDU', query: 'pdu'),
        FilterChipItem('More'),
      ];
    default:
      if ((query ?? '').isNotEmpty) {
        return [
          const FilterChipItem('All'),
          FilterChipItem(query!, query: query),
          const FilterChipItem('More'),
        ];
      }
      return const [
        FilterChipItem('All'),
        FilterChipItem('Routers', query: 'router'),
        FilterChipItem('Switches', query: 'switch'),
        FilterChipItem('Access Points', query: 'access point'),
        FilterChipItem('More'),
      ];
  }
}
