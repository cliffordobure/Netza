import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/type.dart';
import '../data/shop_categories.dart';
import '../widgets/storefront_chrome.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});
  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final search = TextEditingController();

  @override
  void dispose() {
    search.dispose();
    super.dispose();
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
      drawer: const NetzaDrawer(),
      body: SafeArea(
        bottom: false,
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
            const SizedBox(height: 14),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: shopCategories.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 14,
                crossAxisSpacing: 8,
                childAspectRatio: 0.62,
              ),
              itemBuilder: (_, i) {
                final c = shopCategories[i];
                return InkWell(
                  onTap: () => context.push(c.route),
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
                        child: NetzaImage(c.imageUrl, fallback: c.icon, fit: BoxFit.contain),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        c.name,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: T.catName,
                      ),
                      const SizedBox(height: 2),
                      Text(c.countLabel, style: T.catCount, textAlign: TextAlign.center, maxLines: 1),
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
    );
  }
}
