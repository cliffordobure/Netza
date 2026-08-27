import 'package:flutter/material.dart';

class ShopCategory {
  const ShopCategory({
    required this.name,
    required this.slug,
    required this.count,
    required this.imageUrl,
    required this.route,
    this.icon = Icons.devices_other,
  });

  final String name;
  final String slug;
  final int count;
  final String imageUrl;
  final String route;
  final IconData icon;

  String get countLabel => '$count+ products';
}

const shopCategories = [
  ShopCategory(
    name: 'Networking',
    slug: 'networking',
    count: 320,
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=networking',
    icon: Icons.hub_outlined,
  ),
  ShopCategory(
    name: 'CCTV',
    slug: 'cctv',
    count: 280,
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273bd59043?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=cctv',
    icon: Icons.videocam_outlined,
  ),
  ShopCategory(
    name: 'Access Control',
    slug: 'access-control',
    count: 96,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=access-control',
    icon: Icons.fingerprint,
  ),
  ShopCategory(
    name: 'Cabling & Connectors',
    slug: 'cabling',
    count: 150,
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a5804f08d?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=cabling',
    icon: Icons.cable,
  ),
  ShopCategory(
    name: 'Wi-Fi & Access Points',
    slug: 'computers',
    count: 72,
    imageUrl: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=computers',
    icon: Icons.wifi,
  ),
  ShopCategory(
    name: 'Servers & Storage',
    slug: 'servers',
    count: 64,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=storage',
    icon: Icons.dns_outlined,
  ),
  ShopCategory(
    name: 'Power & UPS',
    slug: 'power',
    count: 58,
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=power',
    icon: Icons.power,
  ),
  ShopCategory(
    name: 'Tools & Testers',
    slug: 'tools',
    count: 48,
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=tool',
    icon: Icons.build_outlined,
  ),
  ShopCategory(
    name: 'Switches',
    slug: 'switches',
    count: 120,
    imageUrl: 'https://images.unsplash.com/photo-1551703599-2a3125d0c2c6?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=switch',
    icon: Icons.device_hub_outlined,
  ),
  ShopCategory(
    name: 'Routers',
    slug: 'routers',
    count: 85,
    imageUrl: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=router',
    icon: Icons.router_outlined,
  ),
  ShopCategory(
    name: 'Fiber Optics',
    slug: 'fiber',
    count: 65,
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a5804f08d?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=fiber',
    icon: Icons.blur_circular,
  ),
  ShopCategory(
    name: 'Racks & Cabinets',
    slug: 'racks',
    count: 40,
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=rack',
    icon: Icons.meeting_room_outlined,
  ),
  ShopCategory(
    name: 'Surveillance Storage',
    slug: 'storage',
    count: 30,
    imageUrl: 'https://images.unsplash.com/photo-1531492746076-161ca2bcad58?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=hdd',
    icon: Icons.sd_storage_outlined,
  ),
  ShopCategory(
    name: 'Power Supplies',
    slug: 'psu',
    count: 28,
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=power',
    icon: Icons.electrical_services_outlined,
  ),
  ShopCategory(
    name: 'Monitors & Displays',
    slug: 'monitors',
    count: 25,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=monitor',
    icon: Icons.monitor_outlined,
  ),
  ShopCategory(
    name: 'Security Solutions',
    slug: 'security',
    count: 45,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=access-control',
    icon: Icons.security,
  ),
];

const homeQuickCats = [
  ShopCategory(
    name: 'Networking',
    slug: 'networking',
    count: 320,
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=networking',
    icon: Icons.hub_outlined,
  ),
  ShopCategory(
    name: 'CCTV',
    slug: 'cctv',
    count: 280,
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273bd59043?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=cctv',
    icon: Icons.videocam_outlined,
  ),
  ShopCategory(
    name: 'Access Control',
    slug: 'access-control',
    count: 96,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=access-control',
    icon: Icons.fingerprint,
  ),
  ShopCategory(
    name: 'Cabling',
    slug: 'cabling',
    count: 150,
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a5804f08d?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=cabling',
    icon: Icons.cable,
  ),
  ShopCategory(
    name: 'Wi-Fi',
    slug: 'computers',
    count: 72,
    imageUrl: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=computers',
    icon: Icons.wifi,
  ),
  ShopCategory(
    name: 'Switches',
    slug: 'switches',
    count: 120,
    imageUrl: 'https://images.unsplash.com/photo-1551703599-2a3125d0c2c6?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=switch',
    icon: Icons.device_hub_outlined,
  ),
  ShopCategory(
    name: 'Routers',
    slug: 'routers',
    count: 85,
    imageUrl: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=router',
    icon: Icons.router_outlined,
  ),
  ShopCategory(
    name: 'Access Points',
    slug: 'ap',
    count: 72,
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a5804f08d?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?q=access%20point',
    icon: Icons.cell_tower,
  ),
  ShopCategory(
    name: 'Power & UPS',
    slug: 'power',
    count: 58,
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=400&q=80',
    route: '/catalog?category=power',
    icon: Icons.power,
  ),
];
