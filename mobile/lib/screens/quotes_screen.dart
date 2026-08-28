import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/type.dart';
import '../state/session.dart';
import '../widgets/storefront_chrome.dart';

void _goBack(BuildContext context, {String fallback = '/quotes'}) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(fallback);
  }
}

PreferredSizeWidget _quoteAppBar(
  BuildContext context, {
  required String title,
  String fallback = '/quotes',
  List<Widget>? actions,
}) {
  return AppBar(
    title: Text(title, style: inter(size: 18, weight: FontWeight.w800, color: navy)),
    backgroundColor: Colors.white,
    foregroundColor: navy,
    elevation: 0,
    leading: IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () => _goBack(context, fallback: fallback),
    ),
    actions: actions,
  );
}

Future<String?> _uploadImage(BuildContext context, Session session, {bool camera = false}) async {
  try {
    final file = await ImagePicker().pickImage(
      source: camera ? ImageSource.camera : ImageSource.gallery,
      imageQuality: 75,
      maxWidth: 1200,
    );
    if (file == null) return null;

    final bytes = await file.readAsBytes();
    final name = file.name.isNotEmpty ? file.name : 'photo.jpg';
    try {
      final form = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: name),
      });
      final res = await session.dio.post(
        '/quotes/upload',
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );
      final url = res.data['url']?.toString();
      if (url != null && url.isNotEmpty) return url;
    } catch (_) {
      // Fall through to embedded data URL so quotes still work offline / without Cloudinary.
    }
    final mime = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return 'data:$mime;base64,${base64Encode(bytes)}';
  } on PlatformException catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.code == 'channel-error' || (e.message?.contains('channel') ?? false)
                ? 'Photo picker needs a full app restart. Stop the app, then run it again.'
                : (e.message ?? 'Could not open gallery'),
          ),
        ),
      );
    }
    return null;
  } on MissingPluginException {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Photo picker not ready — fully restart the app (not hot reload).')),
      );
    }
    return null;
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
    }
    return null;
  }
}

Future<String?> _askImageUrl(BuildContext context) async {
  final ctrl = TextEditingController();
  final url = await showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Image link', style: inter(size: 17, weight: FontWeight.w800, color: navy)),
      content: TextField(
        controller: ctrl,
        decoration: const InputDecoration(
          hintText: 'https://…',
          labelText: 'Paste image URL',
        ),
        keyboardType: TextInputType.url,
        autofocus: true,
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: orange),
          onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
          child: const Text('Use'),
        ),
      ],
    ),
  );
  if (url == null || url.isEmpty) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid https image link')));
    }
    return null;
  }
  return url;
}

Future<String?> _pickOrLinkImage(BuildContext context, Session session) async {
  final choice = await showModalBottomSheet<String>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Gallery'),
            onTap: () => Navigator.pop(ctx, 'gallery'),
          ),
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined),
            title: const Text('Camera'),
            onTap: () => Navigator.pop(ctx, 'camera'),
          ),
          ListTile(
            leading: const Icon(Icons.link),
            title: const Text('Paste image link'),
            onTap: () => Navigator.pop(ctx, 'link'),
          ),
        ],
      ),
    ),
  );
  if (!context.mounted) return null;
  if (choice == 'gallery') return _uploadImage(context, session, camera: false);
  if (choice == 'camera') return _uploadImage(context, session, camera: true);
  if (choice == 'link') return _askImageUrl(context);
  return null;
}

Future<void> _copyLink(BuildContext context, String url, {String okMessage = 'Link copied'}) async {
  await Clipboard.setData(ClipboardData(text: url));
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(okMessage)));
  }
}

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
      if (!mounted) return;
      setState(() {
        loading = false;
        error = 'Sign in to make quotes';
      });
      return;
    }
    try {
      final res = await session.dio.get('/quotes');
      if (!mounted) return;
      setState(() {
        quotes = res.data['quotes'] as List? ?? [];
        error = null;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
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
      appBar: _quoteAppBar(
        context,
        title: 'Quotes',
        fallback: '/account',
        actions: [
          IconButton(
            onPressed: () async {
              await context.push('/quotes/new');
              if (mounted) load();
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
                              if (mounted) load();
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
                            if (mounted) load();
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
  bool uploading = false;
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
      items = ((q['items'] as List?) ?? []).map((e) {
        final m = Map<String, dynamic>.from(e as Map);
        m['productId'] ??= m['productId'];
        return m;
      }).toList();
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
    final session = context.read<Session>();
    setState(() => uploading = true);
    final url = await _pickOrLinkImage(context, session);
    if (!mounted) return;
    setState(() {
      uploading = false;
      if (url != null) logoUrl = url;
    });
  }

  Future<void> _addCatalog() async {
    final session = context.read<Session>();
    List products = [];
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            Future<void> search(String text) async {
              try {
                final res = await session.dio.get('/products', queryParameters: {'q': text, 'limit': 20});
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
                              leading: SizedBox(width: 44, height: 44, child: NetzaImage(img?.toString())),
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

  Future<void> _editItem(int index) async {
    final existing = Map<String, dynamic>.from(items[index]);
    final isCatalog = existing['kind'] == 'catalog';
    final name = TextEditingController(text: existing['name']?.toString() ?? '');
    final price = TextEditingController(text: '${existing['unitPriceKes'] ?? 0}');
    final qty = TextEditingController(text: '${existing['quantity'] ?? 1}');
    var imageUrl = existing['imageUrl']?.toString() ?? '';
    final session = context.read<Session>();

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
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(isCatalog ? 'Edit item' : 'Your product', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
                    const SizedBox(height: 12),
                    if (!isCatalog)
                      TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
                    if (isCatalog)
                      Text(name.text, style: inter(size: 15, weight: FontWeight.w700, color: navy)),
                    TextField(
                      controller: price,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: isCatalog ? 'Your price (KES)' : 'Price (KES)',
                      ),
                    ),
                    TextField(
                      controller: qty,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Qty'),
                    ),
                    if (imageUrl.isNotEmpty || !isCatalog) ...[
                      const SizedBox(height: 8),
                      if (imageUrl.isNotEmpty)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SizedBox(width: 72, height: 72, child: NetzaImage(imageUrl)),
                          ),
                        ),
                      if (!isCatalog)
                        OutlinedButton.icon(
                          onPressed: () async {
                            final url = await _pickOrLinkImage(ctx, session);
                            if (url != null && ctx.mounted) setLocal(() => imageUrl = url);
                          },
                          icon: const Icon(Icons.image_outlined),
                          label: Text(imageUrl.isEmpty ? 'Add photo' : 'Change photo'),
                        ),
                    ],
                    const SizedBox(height: 12),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: orange),
                      onPressed: () {
                        final q = int.tryParse(qty.text.trim()) ?? 1;
                        setState(() {
                          items[index] = {
                            ...existing,
                            if (!isCatalog) 'name': name.text.trim().isEmpty ? existing['name'] : name.text.trim(),
                            'unitPriceKes': num.tryParse(price.text.trim()) ?? existing['unitPriceKes'] ?? 0,
                            if (!isCatalog) 'imageUrl': imageUrl,
                            'quantity': q < 1 ? 1 : q,
                          };
                        });
                        Navigator.pop(ctx);
                      },
                      child: const Text('Save item'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _addCustom() async {
    setState(() {
      items.add({
        'kind': 'custom',
        'name': 'New product',
        'imageUrl': '',
        'unitPriceKes': 0,
        'quantity': 1,
      });
    });
    await _editItem(items.length - 1);
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
      final id = res.data['quote']['id']?.toString();
      if (!mounted || id == null) return;
      if (isNew) {
        context.pushReplacement('/quotes/$id');
      } else {
        _goBack(context);
      }
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
      appBar: _quoteAppBar(context, title: isNew ? 'New quote' : 'Edit quote'),
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
                      onPressed: uploading ? null : _pickLogo,
                      icon: uploading
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.business),
                      label: Text(logoUrl.isEmpty ? 'Add logo' : 'Change logo'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text('Items', style: inter(size: 16, weight: FontWeight.w800, color: navy)),
                Text('Tap an item to edit', style: inter(size: 12, color: muted)),
                const SizedBox(height: 8),
                ...items.asMap().entries.map((e) {
                  final i = e.value;
                  return Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    child: ListTile(
                      onTap: () => _editItem(e.key),
                      leading: SizedBox(width: 44, height: 44, child: NetzaImage(i['imageUrl']?.toString())),
                      title: Text(i['name']?.toString() ?? '', maxLines: 1),
                      subtitle: Text(
                        '${i['kind'] == 'catalog' ? 'Site' : 'Yours'} · ${money(i['unitPriceKes'])} × ${i['quantity']}',
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() => items.removeAt(e.key)),
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(onPressed: _addCatalog, child: const Text('From shop')),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(onPressed: _addCustom, child: const Text('Your product')),
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
      if (!mounted) return;
      final q = Map<String, dynamic>.from(res.data['quote'] as Map);
      setState(() {
        quote = q;
        if ((q['shareToken']?.toString() ?? '').isNotEmpty && shareUrl == null) {
          // keep until share() fills absolute url
        }
        error = null;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = apiMessage(e);
        loading = false;
      });
    }
  }

  Future<String?> _ensureShareUrl() async {
    if (isShared || quote == null) return shareUrl;
    final res = await context.read<Session>().dio.post('/quotes/${quote!['id']}/share');
    if (!mounted) return shareUrl;
    final url = res.data['shareUrl']?.toString() ?? '';
    setState(() {
      quote = Map<String, dynamic>.from(res.data['quote'] as Map);
      shareUrl = url;
    });
    return url;
  }

  Future<void> share() async {
    if (isShared || quote == null) return;
    setState(() => busy = true);
    try {
      final url = await _ensureShareUrl();
      if (!mounted) return;
      setState(() => busy = false);
      if (url == null || url.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not create share link')));
        return;
      }
      final text = '${quote!['companyName'] ?? 'Quote'} — ${money(quote!['totalKes'])}\n\nOpen & print:\n$url';
      try {
        final box = context.findRenderObject() as RenderBox?;
        await SharePlus.instance.share(
          ShareParams(
            text: text,
            subject: 'Quote from ${quote!['companyName'] ?? 'NETZA'}',
            sharePositionOrigin: box != null && box.hasSize ? box.localToGlobal(Offset.zero) & box.size : null,
          ),
        );
      } on MissingPluginException {
        if (!mounted) return;
        await _copyLink(context, url, okMessage: 'Share unavailable — link copied. Paste it in WhatsApp.');
      } on PlatformException {
        if (!mounted) return;
        await _copyLink(context, url, okMessage: 'Share unavailable — link copied. Paste it in WhatsApp.');
      }
    } catch (e) {
      setState(() => busy = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiMessage(e))));
      }
    }
  }

  Future<void> openPrint() async {
    setState(() => busy = true);
    try {
      final url = isShared ? null : await _ensureShareUrl();
      final link = url ?? shareUrl;
      if (!mounted) return;
      setState(() => busy = false);
      if (link == null || link.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Share link not ready')));
        return;
      }
      try {
        final uri = Uri.parse(link);
        final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (!mounted) return;
        if (!ok) {
          await _copyLink(context, link, okMessage: 'Link copied — open it in Chrome to print');
        }
      } on MissingPluginException {
        if (!mounted) return;
        await _copyLink(context, link, okMessage: 'Browser open failed — link copied. Paste in Chrome to print.');
      } on PlatformException {
        if (!mounted) return;
        await _copyLink(context, link, okMessage: 'Browser open failed — link copied. Paste in Chrome to print.');
      }
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
    var token = widget.token ?? quote?['shareToken']?.toString();
    if (token == null || token.isEmpty) {
      setState(() => busy = true);
      try {
        await _ensureShareUrl();
        token = quote?['shareToken']?.toString();
      } catch (_) {}
      setState(() => busy = false);
    }
    if (token == null || token.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not prepare quote for cart')),
        );
      }
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
      appBar: _quoteAppBar(
        context,
        title: 'Quote',
        actions: [
          if (!isShared && q != null)
            IconButton(
              onPressed: () async {
                await context.push('/quotes/${q['id']}/edit');
                if (mounted) load();
              },
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
                            SizedBox(width: 52, height: 52, child: NetzaImage(i['imageUrl']?.toString())),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(i['name']?.toString() ?? '', style: inter(size: 14, weight: FontWeight.w700, color: navy)),
                                  Text(
                                    '${i['quantity']} × ${money(i['unitPriceKes'])}',
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
                        label: const Text('Share quote'),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: busy ? null : openPrint,
                        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        icon: const Icon(Icons.print_outlined),
                        label: const Text('Open / print'),
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
