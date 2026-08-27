import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/storefront_chrome.dart';

/// Simple installer quotes: company + items → share/print → client adds site items to cart.
class QuotesScreen extends StatefulWidget {
  const QuotesScreen({super.key});
  @override
  State<QuotesScreen> createState() => _QuotesScreenState();
}

class _QuotesScreenState extends State<QuotesScreen> {
  List quotes = [];
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      setState(() {
        loading = false;
        error = 'Sign in to make quotes';
      });
      return;
    }
    try {
      final res = await session.dio.get('/quotes');
      setState(() {
        quotes = res.data['quotes'] as List? ?? [];
        error = null;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      appBar: AppBar(
        title: Text('Quotes', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () async {
              await context.push('/quotes/new');
              load();
            },
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: orange,
        onRefresh: load,
        child: loading
            ? const Center(child: CircularProgressIndicator(color: orange))
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(error!, style: inter(size: 13, color: Colors.red)),
                    ),
                  if (quotes.isEmpty && error == null)
                    Padding(
                      padding: const EdgeInsets.only(top: 48),
                      child: Column(
                        children: [
                          Text('No quotes yet', style: inter(size: 16, weight: FontWeight.w700, color: navy)),
                          const SizedBox(height: 8),
                          Text('Make one for a client in a minute.', style: inter(size: 13, color: muted)),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: () async {
                              await context.push('/quotes/new');
                              load();
                            },
                            style: FilledButton.styleFrom(backgroundColor: orange),
                            child: const Text('New quote'),
                          ),
                        ],
                      ),
                    ),
                  ...quotes.map((raw) {
                    final q = Map<String, dynamic>.from(raw as Map);
                    final items = (q['items'] as List?)?.length ?? 0;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () async {
                            await context.push('/quotes/${q['id']}');
                            load();
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        (q['companyName']?.toString().isNotEmpty == true)
                                            ? q['companyName'].toString()
                                            : 'Untitled',
                                        style: inter(size: 15, weight: FontWeight.w800, color: navy),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${q['status']} · $items items · ${money(q['totalKes'])}',
                                        style: inter(size: 12, color: muted),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, color: muted),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
      ),
    );
  }
}

class QuoteEditScreen extends StatefulWidget {
  const QuoteEditScreen({super.key, this.id});
  final String? id;
  @override
  State<QuoteEditScreen> createState() => _QuoteEditScreenState();
}

class _QuoteEditScreenState extends State<QuoteEditScreen> {
  final company = TextEditingController();
  final client = TextEditingController();
  final note = TextEditingController();
  String logoUrl = '';
  List<Map<String, dynamic>> items = [];
  bool loading = false;
  bool saving = false;
  String? error;

  bool get isNew => widget.id == null || widget.id == 'new';

  @override
  void initState() {
    super.initState();
    if (!isNew) _load();
  }

  @override
  void dispose() {
    company.dispose();
    client.dispose();
    note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final res = await context.read<Session>().dio.get('/quotes/${widget.id}');
      final q = Map<String, dynamic>.from(res.data['quote'] as Map);
      company.text = q['companyName']?.toString() ?? '';
      client.text = q['clientName']?.toString() ?? '';
      note.text = q['note']?.toString() ?? '';
      logoUrl = q['logoUrl']?.toString() ?? '';
      items = ((q['items'] as List?) ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      setState(() {
        loading = false;
        error = null;
      });
    } catch (e) {
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  Future<void> _pickLogo() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85, maxWidth: 1200);
    if (file == null || !mounted) return;
    final session = context.read<Session>();
    try {
      final form = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: file.name),
      });
      final res = await session.dio.post('/quotes/upload', data: form);
      if (!mounted) return;
      setState(() => logoUrl = res.data['url']?.toString() ?? '');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
      }
    }
  }

  Future<void> _addCatalog() async {
    final session = context.read<Session>();
    String q = '';
    List products = [];
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            Future<void> search(String text) async {
              q = text;
              try {
                final res = await session.dio.get('/products', queryParameters: {
                  'q': text,
                  'limit': 20,
                });
                setLocal(() => products = res.data['products'] as List? ?? []);
              } catch (_) {}
            }

            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
                child: SizedBox(
                  height: MediaQuery.of(ctx).size.height * 0.7,
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: TextField(
                          decoration: const InputDecoration(
                            hintText: 'Search products',
                            prefixIcon: Icon(Icons.search),
                          ),
                          onChanged: (v) {
                            if (v.trim().length >= 2) search(v.trim());
                          },
                          onSubmitted: (v) => search(v.trim()),
                        ),
                      ),
                      Expanded(
                        child: ListView.builder(
                          itemCount: products.length,
                          itemBuilder: (_, i) {
                            final p = Map<String, dynamic>.from(products[i] as Map);
                            final img = (p['images'] is List && (p['images'] as List).isNotEmpty)
                                ? ((p['images'] as List).first is Map
                                    ? (p['images'] as List).first['url']
                                    : p['images'].first)
                                : null;
                            return ListTile(
                              leading: SizedBox(
                                width: 44,
                                height: 44,
                                child: NetzaImage(img?.toString()),
                              ),
                              title: Text(p['name']?.toString() ?? '', maxLines: 1),
                              subtitle: Text(money(p['priceKes'])),
                              onTap: () {
                                setState(() {
                                  items.add({
                                    'kind': 'catalog',
                                    'productId': p['id'],
                                    'name': p['name'],
                                    'imageUrl': img?.toString() ?? '',
                                    'unitPriceKes': p['priceKes'] ?? 0,
                                    'quantity': 1,
                                  });
                                });
                                Navigator.pop(ctx);
                              },
                            );
                          },
                        ),
                      ),
                      if (q.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text('Type to find NETZA products', style: inter(size: 13, color: muted)),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _addCustom() async {
    final name = TextEditingController();
    final price = TextEditingController();
    final qty = TextEditingController(text: '1');
    String imageUrl = '';
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Your product', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
                  const SizedBox(height: 12),
                  TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
                  TextField(
                    controller: price,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Price (KES)'),
                  ),
                  TextField(
                    controller: qty,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Qty'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final session = this.context.read<Session>();
                      final file = await ImagePicker().pickImage(
                        source: ImageSource.gallery,
                        imageQuality: 80,
                        maxWidth: 1000,
                      );
                      if (file == null || !ctx.mounted) return;
                      try {
                        final form = FormData.fromMap({
                          'file': await MultipartFile.fromFile(file.path, filename: file.name),
                        });
                        final res = await session.dio.post('/quotes/upload', data: form);
                        if (!ctx.mounted) return;
                        setLocal(() => imageUrl = res.data['url']?.toString() ?? '');
                      } catch (e) {
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(apiMessage(e))));
                        }
                      }
                    },
                    icon: const Icon(Icons.image_outlined),
                    label: Text(imageUrl.isEmpty ? 'Add photo' : 'Photo added'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: orange),
                    onPressed: () {
                      final n = name.text.trim();
                      final p = num.tryParse(price.text.trim()) ?? 0;
                      final q = int.tryParse(qty.text.trim()) ?? 1;
                      if (n.isEmpty) return;
                      setState(() {
                        items.add({
                          'kind': 'custom',
                          'name': n,
                          'imageUrl': imageUrl,
                          'unitPriceKes': p,
                          'quantity': q < 1 ? 1 : q,
                        });
                      });
                      Navigator.pop(ctx);
                    },
                    child: const Text('Add'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _save() async {
    setState(() => saving = true);
    final payload = {
      'companyName': company.text.trim(),
      'clientName': client.text.trim(),
      'note': note.text.trim(),
      'logoUrl': logoUrl,
      'items': items
          .map(
            (i) => {
              'kind': i['kind'] ?? 'custom',
              'productId': i['productId'],
              'name': i['name'],
              'imageUrl': i['imageUrl'] ?? '',
              'unitPriceKes': (i['unitPriceKes'] as num?)?.toDouble() ?? 0,
              'quantity': i['quantity'] ?? 1,
            },
          )
          .toList(),
    };
    try {
      final session = context.read<Session>();
      final res = isNew
          ? await session.dio.post('/quotes', data: payload)
          : await session.dio.patch('/quotes/${widget.id}', data: payload);
      final id = res.data['quote']['id'];
      if (!mounted) return;
      context.go('/quotes/$id');
    } catch (e) {
      setState(() {
        error = apiMessage(e);
        saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      appBar: AppBar(
        title: Text(isNew ? 'New quote' : 'Edit quote', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: orange))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (error != null) Text(error!, style: inter(size: 13, color: Colors.red)),
                TextField(controller: company, decoration: const InputDecoration(labelText: 'Company name')),
                TextField(controller: client, decoration: const InputDecoration(labelText: 'Client name')),
                TextField(controller: note, decoration: const InputDecoration(labelText: 'Note (optional)')),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (logoUrl.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(width: 56, height: 56, child: NetzaImage(logoUrl)),
                      ),
                    if (logoUrl.isNotEmpty) const SizedBox(width: 12),
                    OutlinedButton.icon(
                      onPressed: _pickLogo,
                      icon: const Icon(Icons.business),
                      label: Text(logoUrl.isEmpty ? 'Logo' : 'Change logo'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text('Items', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
                const SizedBox(height: 8),
                ...items.asMap().entries.map((e) {
                  final i = e.value;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: SizedBox(
                      width: 44,
                      height: 44,
                      child: NetzaImage(i['imageUrl']?.toString()),
                    ),
                    title: Text(i['name']?.toString() ?? '', maxLines: 1),
                    subtitle: Text(
                      '${i['kind'] == 'catalog' ? 'Site' : 'Yours'} · ${money(i['unitPriceKes'])} × ${i['quantity']}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => setState(() => items.removeAt(e.key)),
                    ),
                  );
                }),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _addCatalog,
                        child: const Text('From shop'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _addCustom,
                        child: const Text('Your product'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: saving ? null : _save,
                  style: FilledButton.styleFrom(backgroundColor: orange, minimumSize: const Size.fromHeight(48)),
                  child: Text(saving ? 'Saving…' : 'Save'),
                ),
              ],
            ),
    );
  }
}

class QuoteDetailScreen extends StatefulWidget {
  const QuoteDetailScreen({super.key, required this.id, this.token});
  final String id;
  final String? token;
  @override
  State<QuoteDetailScreen> createState() => _QuoteDetailScreenState();
}

class _QuoteDetailScreenState extends State<QuoteDetailScreen> {
  Map<String, dynamic>? quote;
  String? shareUrl;
  String? error;
  bool loading = true;
  bool busy = false;

  bool get isShared => widget.token != null && widget.token!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final session = context.read<Session>();
    try {
      final res = isShared
          ? await session.dio.get('/quotes/shared/${widget.token}')
          : await session.dio.get('/quotes/${widget.id}');
      setState(() {
        quote = Map<String, dynamic>.from(res.data['quote'] as Map);
        error = null;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  Future<void> share() async {
    if (isShared || quote == null) return;
    setState(() => busy = true);
    try {
      final res = await context.read<Session>().dio.post('/quotes/${quote!['id']}/share');
      final url = res.data['shareUrl']?.toString() ?? '';
      setState(() {
        quote = Map<String, dynamic>.from(res.data['quote'] as Map);
        shareUrl = url;
        busy = false;
      });
      if (!mounted) return;
      await SharePlus.instance.share(
        ShareParams(
          text: '${quote!['companyName'] ?? 'Quote'} — ${money(quote!['totalKes'])}\n$url',
          subject: 'Quote from ${quote!['companyName'] ?? 'NETZA installer'}',
        ),
      );
    } catch (e) {
      setState(() => busy = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
      }
    }
  }

  Future<void> addToCart() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) {
      context.push('/login');
      return;
    }
    final token = widget.token ?? quote?['shareToken']?.toString();
    if (token == null || token.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Share the quote first so the client can open it')),
      );
      return;
    }
    setState(() => busy = true);
    try {
      final res = await session.dio.post('/quotes/shared/$token/add-to-cart');
      await session.refreshCart();
      setState(() => busy = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res.data['message']?.toString() ?? 'Done')),
      );
      context.push('/cart');
    } catch (e) {
      setState(() => busy = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = quote;
    final items = (q?['items'] as List?) ?? [];
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Quote', style: inter(size: 18, weight: FontWeight.w800, color: navy)),
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0,
        actions: [
          if (!isShared && q != null)
            IconButton(
              onPressed: () => context.push('/quotes/${q['id']}/edit'),
              icon: const Icon(Icons.edit_outlined),
            ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: orange))
          : error != null
              ? Center(child: Text(error!, style: inter(color: Colors.red)))
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    if ((q?['logoUrl']?.toString() ?? '').isNotEmpty)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: SizedBox(
                          height: 48,
                          child: NetzaImage(q!['logoUrl'].toString(), fit: BoxFit.contain),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      (q?['companyName']?.toString().isNotEmpty == true) ? q!['companyName'].toString() : 'Quote',
                      style: inter(size: 22, weight: FontWeight.w900, color: navy),
                    ),
                    if ((q?['clientName']?.toString() ?? '').isNotEmpty)
                      Text('For ${q!['clientName']}', style: inter(size: 14, color: muted)),
                    if ((q?['note']?.toString() ?? '').isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(q!['note'].toString(), style: inter(size: 13, color: muted)),
                    ],
                    const SizedBox(height: 20),
                    ...items.map((raw) {
                      final i = Map<String, dynamic>.from(raw as Map);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: 52,
                              height: 52,
                              child: NetzaImage(i['imageUrl']?.toString()),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(i['name']?.toString() ?? '', style: inter(size: 14, weight: FontWeight.w700, color: navy)),
                                  Text(
                                    '${i['quantity']} × ${money(i['unitPriceKes'])}'
                                    '${i['availableOnSite'] == true ? ' · on site' : ''}',
                                    style: inter(size: 12, color: muted),
                                  ),
                                ],
                              ),
                            ),
                            Text(money(i['lineTotalKes']), style: inter(size: 14, weight: FontWeight.w800, color: navy)),
                          ],
                        ),
                      );
                    }),
                    const Divider(height: 32),
                    Row(
                      children: [
                        Text('Total', style: inter(size: 16, weight: FontWeight.w700, color: navy)),
                        const Spacer(),
                        Text(money(q?['totalKes']), style: inter(size: 20, weight: FontWeight.w900, color: navy)),
                      ],
                    ),
                    const SizedBox(height: 24),
                    if (!isShared) ...[
                      FilledButton.icon(
                        onPressed: busy ? null : share,
                        style: FilledButton.styleFrom(backgroundColor: orange, minimumSize: const Size.fromHeight(48)),
                        icon: const Icon(Icons.ios_share),
                        label: const Text('Share / print link'),
                      ),
                      if (shareUrl != null) ...[
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: shareUrl!));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Link copied')),
                            );
                          },
                          child: Text(shareUrl!, style: inter(size: 12, color: purple), maxLines: 2),
                        ),
                      ],
                    ],
                    const SizedBox(height: 10),
                    OutlinedButton(
                      onPressed: busy ? null : addToCart,
                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                      child: const Text('Add site items to cart'),
                    ),
                  ],
                ),
    );
  }
}
