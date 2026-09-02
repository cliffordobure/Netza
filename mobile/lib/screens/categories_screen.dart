import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../data/catalog_cache.dart';
import '../state/session.dart';
import '../widgets/storefront_chrome.dart';

IconData categoryIcon(String slug) {
  switch (slug) {
    case 'networking':
      return Icons.hub_outlined;
    case 'cctv':
      return Icons.videocam_outlined;
    case 'access-control':
      return Icons.fingerprint;
    case 'cabling':
      return Icons.cable;
    case 'computers':
      return Icons.wifi;
    case 'power':
      return Icons.power;
    default:
      return Icons.devices_other;
  }
}

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});
  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final search = TextEditingController();
  List categories = [];
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    final cached = context.read<Session>().catalog?.categories ?? const [];
    if (cached.isNotEmpty) {
      categories = cached;
      loading = false;
    }
    load();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> load() async {
    final session = context.read<Session>();
    if (categories.isEmpty) {
      setState(() {
        loading = true;
        error = null;
      });
    }
    try {
      final res = await session.dio.get('/categories');
      final list = res.data['categories'] as List? ?? [];
      if (!mounted) return;
      setState(() {
        categories = list;
        loading = false;
        error = null;
      });
      final existing = session.catalog;
      await session.rememberCatalog(CatalogSnapshot(
        products: existing?.products ?? const [],
        trending: existing?.trending ?? const [],
        categories: list,
        banners: existing?.banners ?? const [],
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = categories.isEmpty ? apiMessage(e) : null;
        loading = false;
      });
    }
  }

  void _search() {
    final q = search.text.trim();
    if (q.isEmpty) return;
    context.push('/catalog?q=${Uri.encodeQueryComponent(q)}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      drawer: const TajiraDrawer(),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: orange,
          onRefresh: load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
            children: [
              const StorefrontHeader(),
              const SizedBox(height: 12),
              StorefrontSearchBar(
                controller: search,
                onSearch: _search,
                trailing: SearchTrailing.scan,
              ),
              const SizedBox(height: 10),
              const DeliverToRow(),
              const SizedBox(height: 12),
              const LoyaltyCard(),
              const SizedBox(height: 18),
              Text('Categories', style: T.section),
              if (error != null) ...[
                const SizedBox(height: 8),
                Text(error!, style: inter(size: 12, color: Colors.orange)),
              ],
              const SizedBox(height: 14),
              if (loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(child: CircularProgressIndicator(color: orange)),
                )
              else if (categories.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Text('No categories yet.', style: inter(size: 13, color: muted), textAlign: TextAlign.center),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: categories.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 8,
                    childAspectRatio: 0.62,
                  ),
                  itemBuilder: (_, i) {
                    final c = Map<String, dynamic>.from(categories[i] as Map);
                    final slug = c['slug']?.toString() ?? '';
                    final count = (c['productCount'] as num?)?.toInt() ?? 0;
                    return InkWell(
                      onTap: () => context.push('/catalog?category=${Uri.encodeQueryComponent(slug)}'),
                      child: Column(
                        children: [
                          Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F5F8),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            clipBehavior: Clip.antiAlias,
                            padding: const EdgeInsets.all(8),
                            child: TajiraImage(
                              c['imageUrl']?.toString(),
                              fallback: categoryIcon(slug),
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            c['name']?.toString() ?? '',
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: T.catName,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            count > 0 ? '$count products' : 'Browse',
                            style: T.catCount,
                            textAlign: TextAlign.center,
                            maxLines: 1,
                          ),
                        ],
                      ),
                    );
                  },
                ),
              const SizedBox(height: 16),
              ChallengeStrip(
                onPlay: () => context.push('/challenges'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
