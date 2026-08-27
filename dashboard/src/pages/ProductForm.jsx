import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, kes, uploadImage } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "general", label: "General Information" },
  { id: "pricing", label: "Pricing & Inventory" },
  { id: "images", label: "Images & Media" },
  { id: "attributes", label: "Attributes" },
  { id: "shipping", label: "Shipping" },
  { id: "seo", label: "SEO & Meta" },
  { id: "history", label: "History" },
];

const UNITS = ["Piece", "Box", "Pack", "Kg", "Litre"];
const PRODUCT_TYPES = ["Simple Product", "Variable Product", "Digital Product"];

const EMPTY = {
  name: "",
  sku: "",
  barcode: "",
  shortDescription: "",
  description: "",
  categoryPath: "",
  brandName: "",
  unit: "Piece",
  productType: "Simple Product",
  tags: [],
  isActive: true,
  isFeatured: false,
  allowReviews: true,
  hasVariations: false,
  warrantyPeriod: "12 Months",
  color: "",
  modelNumber: "",
  countryOfOrigin: "",
  priceKes: 0,
  compareAtKes: "",
  stock: 0,
  reserved: 0,
  available: 0,
  lowStockAt: 15,
  soldAllTime: 0,
  returnRate: 0,
  adminNotes: "",
  images: [],
  primaryImage: "",
  galleryCount: 0,
  galleryMax: 10,
  stockStatusLabel: "In Stock",
  createdLabel: "—",
  updatedLabel: "—",
  views: 0,
  orders: 0,
  reviews: 0,
  rating: 0,
  auditTrail: [],
  supplier: "",
  purchaseDate: "",
  costPriceKes: 0,
  seoTitle: "",
  seoDescription: "",
  deliveryInfo: "Nairobi 1-2 days • Nationwide 2-5 days",
  warranty: "12 months",
};

function Switch({ on, onClick }) {
  return (
    <button className={`pts-switch ${on ? "on" : ""}`} type="button" onClick={onClick} aria-pressed={on}>
      <i />
    </button>
  );
}

function ToggleRow({ label, hint, on, onToggle }) {
  return (
    <label className="pfe-toggle">
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <Switch on={on} onClick={onToggle} />
    </label>
  );
}

function Stars({ rating }) {
  const full = Math.floor(rating || 0);
  return (
    <span className="pfe-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={14} />
      ))}
      <b>{Number(rating || 0).toFixed(1)}</b>
    </span>
  );
}

function mapProduct(p) {
  const images = (p.images || []).map((i) => (typeof i === "string" ? i : i.url)).filter(Boolean);
  return {
    ...EMPTY,
    name: p.name || "",
    sku: p.sku || "",
    barcode: p.barcode || "",
    shortDescription: p.shortDescription || "",
    description: p.description || "",
    categoryPath: p.categoryPath || [p.category?.name, p.subCategory].filter(Boolean).join(" > ") || "",
    brandName: p.brandName || p.brand?.name || "",
    brandId: p.brandId || p.brand?.id || "",
    categoryId: p.categoryId || p.category?.id || "",
    unit: p.unit || "Piece",
    productType: p.productType || "Simple Product",
    tags: p.tags || [],
    isActive: p.isActive !== false,
    isFeatured: Boolean(p.isFeatured ?? p.isTrending),
    allowReviews: p.allowReviews !== false,
    hasVariations: Boolean(p.hasVariations),
    warrantyPeriod: p.warrantyPeriod || p.warranty || "12 Months",
    color: p.color || "",
    modelNumber: p.modelNumber || "",
    countryOfOrigin: p.countryOfOrigin || "",
    priceKes: p.priceKes || 0,
    compareAtKes: p.compareAtKes || "",
    stock: p.stock ?? 0,
    reserved: p.reserved ?? 0,
    available: p.available ?? Math.max(0, (p.stock ?? 0) - (p.reserved ?? 0)),
    lowStockAt: p.lowStockAt ?? 15,
    soldAllTime: p.soldAllTime ?? p.sales ?? 0,
    returnRate: p.returnRate ?? 0,
    adminNotes: p.adminNotes || p.notes || "",
    images,
    primaryImage: p.primaryImage || images[0] || "",
    galleryCount: p.galleryCount ?? images.length,
    galleryMax: p.galleryMax ?? 10,
    stockStatusLabel: p.stockStatusLabel || "In Stock",
    createdLabel: p.createdLabel || "—",
    updatedLabel: p.updatedLabel || "—",
    views: p.views ?? 0,
    orders: p.orders ?? 0,
    reviews: p.reviews ?? 0,
    rating: p.rating ?? 0,
    auditTrail: p.auditTrail || [],
    supplier: p.supplier || "",
    purchaseDate: p.purchaseDate || "",
    costPriceKes: p.costPriceKes ?? 0,
    seoTitle: p.seoTitle || "",
    seoDescription: p.seoDescription || "",
    deliveryInfo: p.deliveryInfo || EMPTY.deliveryInfo,
    warranty: p.warranty || "12 months",
  };
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(EMPTY);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    Promise.all([
      api("/admin/categories?limit=100").catch(() => api("/categories").catch(() => ({ categories: [] }))),
      api("/admin/brands?limit=100").catch(() => api("/brands").catch(() => ({ brands: [] }))),
    ]).then(([cats, brs]) => {
      setCategories(cats.categories || cats || []);
      setBrands(brs.brands || brs || []);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    api(`/admin/products/${id}`)
      .then(({ product: p }) => {
        const next = mapProduct(p);
        setForm(next);
        if (editorRef.current) editorRef.current.innerText = next.description;
      })
      .catch((e) => setError(e.message || "Could not load product."));
  }, [id, isNew]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function addTag(raw) {
    const t = raw.trim().toLowerCase();
    if (!t || form.tags.includes(t)) return;
    set("tags", [...form.tags, t]);
    setTagDraft("");
  }

  function cmd(command) {
    document.execCommand(command, false, null);
    editorRef.current?.focus();
    set("description", editorRef.current?.innerText || "");
  }

  function payload() {
    return {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      shortDescription: form.shortDescription,
      description: form.description || form.shortDescription || form.name,
      tags: form.tags,
      isActive: form.isActive,
      isTrending: form.isFeatured,
      allowReviews: form.allowReviews,
      warranty: form.warrantyPeriod,
      priceKes: Number(form.priceKes) || 0,
      compareAtKes: form.compareAtKes === "" ? null : Number(form.compareAtKes),
      stock: Number(form.stock) || 0,
      lowStockAt: Number(form.lowStockAt) || 15,
      notes: form.adminNotes,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      deliveryInfo: form.deliveryInfo,
      images: form.images.length ? form.images : form.primaryImage ? [form.primaryImage] : [],
      color: form.color,
      modelNumber: form.modelNumber,
      countryOfOrigin: form.countryOfOrigin,
      unit: form.unit,
      productType: form.productType,
      brandId: form.brandId || undefined,
      categoryId: form.categoryId || undefined,
      brandName: form.brandName || undefined,
      categoryPath: form.categoryPath || undefined,
    };
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (isNew) {
        await api("/admin/products", { method: "POST", body: JSON.stringify(payload()) });
      } else {
        await api(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload()) });
      }
      setToast("Changes saved successfully");
      setTimeout(() => navigate("/products"), 900);
    } catch (err) {
      setError(err.message || "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    if (isNew) return;
    setBusy(true);
    try {
      const d = await api(`/admin/products/${id}/duplicate`, { method: "POST" });
      setToast("Product duplicated");
      if (d.product?.id) navigate(`/products/${d.product.id}`);
    } catch (err) {
      setError(err.message || "Could not duplicate product.");
    } finally {
      setBusy(false);
    }
  }

  async function onImagePick(e, gallery = false) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await uploadImage(file, "products");
      if (gallery) {
        setForm((f) => ({
          ...f,
          images: [...f.images, url],
          galleryCount: f.galleryCount + 1,
          primaryImage: f.primaryImage || url,
        }));
      } else {
        setForm((f) => ({
          ...f,
          primaryImage: url,
          images: f.images.includes(url) ? f.images : [url, ...f.images],
        }));
      }
    } catch (err) {
      setError(err.message || "Image upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const gallery = form.images.length ? form.images : form.primaryImage ? [form.primaryImage] : [];

  if (!isNew && !form.name && !error) {
    return (
      <div className="pfe-page">
        <p className="muted">Loading product…</p>
      </div>
    );
  }

  return (
    <div className="pfe-page pf">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/products">Products</Link>
        <span>›</span>
        <Link to="/products">All Products</Link>
        <span>›</span>
        <strong>{isNew ? "Add New Product" : "Edit Product"}</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            {isNew ? "Add New Product" : "Edit Product"}
            <span className="prod-title-icon solid"><Icon name="box" size={16} /></span>
          </h1>
          <p>{isNew ? "Create a new product and add all the necessary details." : "Update product information, inventory, pricing and settings."}</p>
        </div>
        <div className="prod-actions">
          <Link className="btn btn-ghost btn-small" to="/products">Back to Products</Link>
          {!isNew && (
            <button className="btn btn-ghost btn-small" type="button" disabled={busy} onClick={duplicate}>
              <Icon name="copy" size={14} /> Duplicate Product
            </button>
          )}
          <button className="btn btn-purple btn-small pfe-save-dd" type="button" disabled={busy} onClick={save}>
            <Icon name="save" size={14} /> Save Changes
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>

      <div className="pf-tabs pfe-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      {tab === "general" && (
        <div className="pfe-gen-grid">
          <div className="pfe-col">
            <section className="card pf-card">
              <h2><Icon name="file" size={14} /> Basic Information</h2>
              <label className="pfe-field">
                <span>Product Name</span>
                <input value={form.name} maxLength={255} onChange={(e) => set("name", e.target.value)} />
                <em>{form.name.length}/255 characters</em>
              </label>
              <label className="pfe-field">
                <span>SKU</span>
                <input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
              </label>
              <label className="pfe-field">
                <span>Short Description</span>
                <textarea rows={2} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
              </label>
              <label className="pfe-field">
                <span>Full Description</span>
                <div className="pf-rich">
                  <div className="pf-toolbar">
                    <select onChange={(e) => { document.execCommand("formatBlock", false, e.target.value); editorRef.current?.focus(); }}>
                      <option value="p">Paragraph</option>
                      <option value="h2">Heading</option>
                    </select>
                    <button type="button" onClick={() => cmd("bold")}><b>B</b></button>
                    <button type="button" onClick={() => cmd("italic")}><i>I</i></button>
                    <button type="button" onClick={() => cmd("underline")}><u>U</u></button>
                    <button type="button" onClick={() => cmd("insertUnorderedList")}>• List</button>
                    <button type="button" onClick={() => cmd("createLink")}>Link</button>
                  </div>
                  <div
                    ref={editorRef}
                    className="pf-editor"
                    contentEditable
                    data-placeholder="Write a detailed product description..."
                    onInput={(e) => set("description", e.currentTarget.innerText)}
                  />
                </div>
              </label>
              <div className="pfe-subhead">Classification</div>
              <label className="pfe-field">
                <span>Category</span>
                <select
                  value={form.categoryId || ""}
                  onChange={(e) => {
                    const cat = categories.find((c) => c.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      categoryId: e.target.value,
                      categoryPath: cat?.name || "",
                    }));
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <div className="pf-2">
                <label className="pfe-field">
                  <span>Brand</span>
                  <select
                    value={form.brandId || ""}
                    onChange={(e) => {
                      const brand = brands.find((b) => b.id === e.target.value);
                      setForm((f) => ({
                        ...f,
                        brandId: e.target.value,
                        brandName: brand?.name || "",
                      }));
                    }}
                  >
                    <option value="">Select brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
                <label className="pfe-field">
                  <span>Unit</span>
                  <select value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
              </div>
              <label className="pfe-field">
                <span>Tags</span>
                <div className="pf-tags">
                  {form.tags.map((t) => (
                    <button type="button" key={t} className="pf-chip" onClick={() => set("tags", form.tags.filter((x) => x !== t))}>
                      {t} ×
                    </button>
                  ))}
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagDraft.replace(",", ""));
                      }
                    }}
                    placeholder="Add tag"
                  />
                </div>
              </label>
              <div className="pfe-subhead">Identifiers</div>
              <div className="pf-2">
                <label className="pfe-field">
                  <span>Barcode</span>
                  <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
                </label>
                <label className="pfe-field">
                  <span>Product Type</span>
                  <select value={form.productType} onChange={(e) => set("productType", e.target.value)}>
                    {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              <ToggleRow label="Active" hint="Visible on Storefront" on={form.isActive} onToggle={() => set("isActive", !form.isActive)} />
              <ToggleRow label="Featured Product" on={form.isFeatured} onToggle={() => set("isFeatured", !form.isFeatured)} />
              <ToggleRow label="Allow Product Reviews" on={form.allowReviews} onToggle={() => set("allowReviews", !form.allowReviews)} />
            </section>

            <section className="card pf-card">
              <h2><Icon name="layers" size={14} /> Variations</h2>
              <p className="muted pfe-var-note">This is a simple product with no variations.</p>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("Variations editor coming soon")}>
                <Icon name="plus" size={14} /> Add Variation
              </button>
            </section>

            <section className="card pf-card">
              <h2><Icon name="bars" size={14} /> Custom Fields</h2>
              <label className="pfe-field">
                <span>Warranty Period</span>
                <select value={form.warrantyPeriod} onChange={(e) => set("warrantyPeriod", e.target.value)}>
                  <option>12 Months</option>
                  <option>24 Months</option>
                  <option>36 Months</option>
                </select>
              </label>
              <label className="pfe-field">
                <span>Color</span>
                <input value={form.color} onChange={(e) => set("color", e.target.value)} />
              </label>
              <label className="pfe-field">
                <span>Model Number</span>
                <input value={form.modelNumber} onChange={(e) => set("modelNumber", e.target.value)} />
              </label>
              <label className="pfe-field">
                <span>Country of Origin</span>
                <input value={form.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} />
              </label>
            </section>
          </div>

          <div className="pfe-col">
            <section className="card pf-card">
              <h2><Icon name="image" size={14} /> Product Image</h2>
              <div className="pfe-primary-img">
                {form.primaryImage ? (
                  <>
                    <img src={form.primaryImage} alt="" />
                    <span className="pfe-primary-badge">Primary</span>
                  </>
                ) : (
                  <div className="prod-ph pfe-img-ph" />
                )}
              </div>
              <div className="pfe-img-actions">
                <button className="btn btn-ghost btn-small" type="button" onClick={() => fileRef.current?.click()}>
                  Change Image
                </button>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => { set("primaryImage", ""); set("images", []); }}>
                  Remove
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onImagePick(e, false)} />
            </section>

            <section className="card pf-card">
              <h2>
                <Icon name="image" size={14} /> Gallery Images
                <span className="pfe-gallery-count">{form.galleryCount}/{form.galleryMax}</span>
              </h2>
              <div className="pfe-gallery">
                {gallery.slice(0, 4).map((src, i) => (
                  <img key={`${src.slice(0, 20)}-${i}`} src={src} alt="" />
                ))}
                <button className="pfe-gallery-add" type="button" onClick={() => galleryRef.current?.click()}>
                  <Icon name="plus" size={18} />
                  <span>Add Images</span>
                </button>
              </div>
              <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => onImagePick(e, true)} />
            </section>

            <section className="card pf-card pfe-admin-notes">
              <h2><Icon name="file" size={14} /> Admin Notes</h2>
              <textarea
                rows={5}
                value={form.adminNotes}
                onChange={(e) => set("adminNotes", e.target.value)}
                placeholder="Internal notes visible to admins only"
              />
              <p className="pfe-notes-hint">Only admin can see this note.</p>
            </section>
          </div>

          <div className="pfe-col">
            <section className="card pf-card">
              <h2><Icon name="info" size={14} /> Product Status &amp; Summary</h2>
              <div className="pfe-badges">
                <span className="st-pill st-active">Status: {form.isActive ? "Active" : "Inactive"}</span>
                <span className="sk-pill sk-in">Stock Status: {form.stockStatusLabel}</span>
              </div>
              <dl className="pfe-meta">
                <div><dt>Created At</dt><dd>{form.createdLabel}</dd></div>
                <div><dt>Last Updated</dt><dd>{form.updatedLabel}</dd></div>
              </dl>
              <div className="pfe-engage">
                <div><span>Views</span><strong>{new Intl.NumberFormat("en-KE").format(form.views)}</strong></div>
                <div><span>Orders</span><strong>{new Intl.NumberFormat("en-KE").format(form.orders)}</strong></div>
                <div><span>Reviews</span><strong>{new Intl.NumberFormat("en-KE").format(form.reviews)}</strong></div>
                <div><span>Avg. Rating</span><Stars rating={form.rating} /></div>
              </div>
            </section>

            <section className="card pf-card">
              <h2><Icon name="box" size={14} /> Inventory Quick Stats</h2>
              <div className="pfe-inv-grid">
                <div className="blue"><span>Current Stock</span><strong>{form.stock}</strong></div>
                <div className="orange"><span>Reserved</span><strong>{form.reserved}</strong></div>
                <div className="green"><span>Available</span><strong>{form.available}</strong></div>
                <div className="red"><span>Low Stock Threshold</span><strong>{form.lowStockAt}</strong></div>
              </div>
              <dl className="pfe-meta pfe-inv-extra">
                <div><dt>Sold (All Time)</dt><dd>{new Intl.NumberFormat("en-KE").format(form.soldAllTime)} pieces</dd></div>
                <div><dt>Return Rate</dt><dd>{form.returnRate}%</dd></div>
              </dl>
            </section>

            <section className="card pf-card">
              <h2><Icon name="clock" size={14} /> Audit Trail</h2>
              <ul className="pfe-audit">
                {(form.auditTrail || []).map((a) => (
                  <li key={a.id}>
                    <div className="pfe-audit-avatar">{a.userName?.charAt(0) || "A"}</div>
                    <div>
                      <strong>{a.action}</strong>
                      <p>{a.detail}</p>
                      <span className="muted">{a.userName} · {a.atLabel}</span>
                    </div>
                  </li>
                ))}
                {!(form.auditTrail || []).length && <li className="muted">No audit entries yet.</li>}
              </ul>
            </section>
          </div>
        </div>
      )}

      {tab === "pricing" && (
        <section className="card pf-card pfe-tab-panel">
          <h2><Icon name="card" size={14} /> Pricing &amp; Inventory</h2>
          <div className="pf-2">
            <label className="pfe-field">
              <span>Price (KSh)</span>
              <input type="number" min="0" value={form.priceKes} onChange={(e) => set("priceKes", e.target.value)} />
            </label>
            <label className="pfe-field">
              <span>Compare at Price</span>
              <input type="number" min="0" value={form.compareAtKes} onChange={(e) => set("compareAtKes", e.target.value)} />
            </label>
          </div>
          <div className="pf-2">
            <label className="pfe-field">
              <span>Current Stock</span>
              <input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
            </label>
            <label className="pfe-field">
              <span>Low Stock Threshold</span>
              <input type="number" min="0" value={form.lowStockAt} onChange={(e) => set("lowStockAt", e.target.value)} />
            </label>
          </div>
          <label className="pfe-field">
            <span>Cost Price (KSh)</span>
            <input type="number" min="0" value={form.costPriceKes} onChange={(e) => set("costPriceKes", e.target.value)} />
          </label>
        </section>
      )}

      {tab === "images" && (
        <section className="card pf-card pfe-tab-panel">
          <h2><Icon name="image" size={14} /> Images &amp; Media</h2>
          <div className="pfe-gallery pfe-gallery-wide">
            {gallery.map((src, i) => (
              <img key={`${src.slice(0, 20)}-${i}`} src={src} alt="" />
            ))}
            <button className="pfe-gallery-add" type="button" onClick={() => galleryRef.current?.click()}>
              <Icon name="plus" size={18} /> Add Images
            </button>
          </div>
        </section>
      )}

      {tab === "attributes" && (
        <section className="card pf-card pfe-tab-panel">
          <h2><Icon name="bars" size={14} /> Attributes</h2>
          <div className="pf-2">
            <label className="pfe-field"><span>Color</span><input value={form.color} onChange={(e) => set("color", e.target.value)} /></label>
            <label className="pfe-field"><span>Model Number</span><input value={form.modelNumber} onChange={(e) => set("modelNumber", e.target.value)} /></label>
          </div>
        </section>
      )}

      {tab === "shipping" && (
        <section className="card pf-card pfe-tab-panel">
          <h2><Icon name="truck" size={14} /> Shipping</h2>
          <label className="pfe-field"><span>Warranty</span><input value={form.warranty} onChange={(e) => set("warranty", e.target.value)} /></label>
          <label className="pfe-field"><span>Delivery Information</span><textarea rows={4} value={form.deliveryInfo} onChange={(e) => set("deliveryInfo", e.target.value)} /></label>
        </section>
      )}

      {tab === "seo" && (
        <section className="card pf-card pfe-tab-panel">
          <h2><Icon name="search" size={14} /> SEO &amp; Meta</h2>
          <label className="pfe-field"><span>SEO Title</span><input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></label>
          <label className="pfe-field"><span>SEO Description</span><textarea rows={4} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></label>
        </section>
      )}

      {tab === "history" && (
        <section className="card pf-card pfe-tab-panel">
          <h2><Icon name="clock" size={14} /> History</h2>
          <ul className="pfe-audit pfe-audit-wide">
            {(form.auditTrail || []).map((a) => (
              <li key={a.id}>
                <div className="pfe-audit-avatar">{a.userName?.charAt(0) || "A"}</div>
                <div>
                  <strong>{a.action}</strong>
                  <p>{a.detail}</p>
                  <span className="muted">{a.userName} ({a.userRole}) · {a.atLabel}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="card pf-card pfe-foot-banner">
        <p>
          <Icon name="info" size={14} />
          Make sure to review all details before saving. Changes will be reflected across all associated channels and stores.
        </p>
      </footer>
    </div>
  );
}
