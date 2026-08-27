import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product});
  final Map<String, dynamic> product;

  @override
  Widget build(BuildContext context) {
    final images = (product['images'] as List?) ?? [];
    final flash = product['inFlashDrop'] == true;
    return InkWell(
      onTap: () => context.push('/product/${product['id']}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [BoxShadow(color: Color(0x14071526), blurRadius: 12, offset: Offset(0, 6))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1.15,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (images.isNotEmpty)
                    CachedNetworkImage(imageUrl: images.first.toString(), fit: BoxFit.cover)
                  else
                    const ColoredBox(color: Color(0xFFE8EEF5)),
                  if (flash)
                    const Positioned(
                      top: 8,
                      left: 8,
                      child: _Chip(label: 'FLASH DROP', color: orange),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product['name'] ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: T.productTitle,
                  ),
                  const SizedBox(height: 6),
                  Text(money(product['priceKes']), style: T.price),
                  if (product['compareAtKes'] != null)
                    Text(
                      money(product['compareAtKes']),
                      style: const TextStyle(
                        decoration: TextDecoration.lineThrough,
                        color: Color(0xFF8A97A6),
                        fontSize: 12,
                      ),
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

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
    );
  }
}
