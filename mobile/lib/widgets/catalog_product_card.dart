import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import 'storefront_chrome.dart';

class CatalogProductCard extends StatelessWidget {
  const CatalogProductCard({
    super.key,
    required this.product,
    required this.liked,
    required this.onLike,
    required this.onAdd,
  });

  final Map<String, dynamic> product;
  final bool liked;
  final VoidCallback onLike;
  final VoidCallback onAdd;

  int get _discount {
    final price = (product['priceKes'] as num?)?.toInt() ?? 0;
    final compare = (product['compareAtKes'] as num?)?.toInt() ?? 0;
    if (compare <= price || price <= 0) return 0;
    return (((compare - price) / compare) * 100).round();
  }

  int get _points {
    final price = (product['priceKes'] as num?)?.toInt() ?? 0;
    return price ~/ 100;
  }

  String? get _image {
    final images = product['images'];
    if (images is List && images.isNotEmpty) return images.first.toString();
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final rating = (product['ratingAvg'] as num?)?.toDouble() ?? 0;
    final reviews = (product['ratingCount'] as num?)?.toInt() ?? 0;
    return InkWell(
      onTap: () => context.push('/product/${product['id']}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFEEF1F5)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 5,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(10, 28, 10, 8),
                      child: NetzaImage(_image),
                    ),
                  ),
                  if (_discount > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(color: const Color(0xFFE53935), borderRadius: BorderRadius.circular(4)),
                        child: Text('-$_discount%', style: T.discount),
                      ),
                    ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: IconButton(
                      onPressed: onLike,
                      visualDensity: VisualDensity.compact,
                      icon: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? const Color(0xFFE53935) : muted, size: 20),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product['name'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: T.productTitle),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 13, color: Color(0xFFF5B400)),
                      const SizedBox(width: 3),
                      Text('${rating.toStringAsFixed(1)} ($reviews)', style: T.rating),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(money(product['priceKes']), style: T.price),
                  if (product['compareAtKes'] != null)
                    Text(money(product['compareAtKes']), style: T.compare.copyWith(decoration: TextDecoration.lineThrough)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.card_giftcard, size: 14, color: purple),
                      const SizedBox(width: 4),
                      Expanded(child: Text('Earn $_points Points', style: T.earn)),
                      InkWell(
                        onTap: onAdd,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(color: orange, borderRadius: BorderRadius.circular(8)),
                          child: const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 16),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
