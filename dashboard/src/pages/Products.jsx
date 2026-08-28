import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, mediaUrl } from "../api";
import { Icon } from "../icons";

const QUICK = [
  { id: "add", icon: "plus", label: "Add New Product", to: "/products/new" },
  { id: "import", icon: "upload", label: "Import Products" },
  { id: "low", icon: "warning", label: "Low Stock Report", stock: "low" },
  { id: "adjust", icon: "box", label: "Adjust Stock", to: "/products/adjustments" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function deltaHint(n, suffix = "vs last month") {
  const v = Number(n) || 0;
  const arrow = v >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(v).toFixed(1)}% ${suffix}`;
}

function stockLabel(key) {
  if (key === "low") return { label: "Low Stock", cls: "sk-low" };
  if (key === "out") return { label: "Out of Stock", cls: "sk-out" };
  return { label: "In Stock", cls: "sk-in" };
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap prod-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {(parts || []).map((p) => {
          const value = p.value || 0;
          const len = slices ? (value / slices) * c : 0;
          const el = (
            <circle
              key={p.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">Total</text>
      </svg>
      <ul className="donut-legend prod-donut-legend prod-inv-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <em>{fmtNum(p.value)}</em>
            <b>{Number(p.pct || 0).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fileRef = useRef(null);
  const [data, setData] = useState(null);
  const [q, setQ] = useState(params.get("q") || "");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [supplier, setSupplier] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [more, setMore] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      category: next.category ?? category,
      brand: next.brand ?? brand,
      status: next.status ?? status,
      supplier: next.supplier ?? supplier,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.category) p.set("category", vals.category);
    if (vals.brand) p.set("brand", vals.brand);
    if (vals.status) p.set("status", vals.status);
    if (vals.supplier) p.set("supplier", vals.supplier);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/products-catalog?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load products."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, category, brand, status, supplier]);

  useEffect(() => {
    const fromHeader = params.get("q") || "";
    if (fromHeader !== q) {
      setQ(fromHeader);
      setPage(1);
      load({ q: fromHeader, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function closeMenus() {
      setAddOpen(false);
    }
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  const stats = data?.stats || {};
  const products = data?.products || [];
  const meta = data?.meta || { categories: [], brands: [], suppliers: [] };
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const invParts = data?.inventorySummary?.length ? data.inventorySummary : data?.stockOverview || [];

  function search(e) {
    e.preventDefault();
    setPage(1);
    load({ q, page: 1 });
  }

  function reset() {
    setQ("");
    setCategory("");
    setBrand("");
    setStatus("");
    setSupplier("");
    setPage(1);
    load({ q: "", category: "", brand: "", status: "", supplier: "", page: 1 });
  }

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
  }

  async function removeProduct(p) {
    if (!confirm(`Delete ${p.name}? This cannot be undone from this list.`)) return;
    try {
      await api(`/admin/products/${p.id}`, { method: "DELETE" });
      setToast("Product deleted");
      load();
    } catch (err) {
      setError(err.message || "Could not delete product.");
    }
  }

  if (!data) {
    return (
      <div className="prod prod-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/products">Products</Link>
          <span>›</span>
          <strong>All Products</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading products…</p>}
      </div>
    );
  }

  return (
    <div className="prod prod-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/products">Products</Link>
        <span>›</span>
        <strong>All Products</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="box" size={16} /></span>
            All Products
          </h1>
          <p>Manage your inventory, track stock levels and product information.</p>
        </div>
        <div className="prod-actions">
          <button
            className="btn btn-ghost btn-small"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" size={14} /> Import Products
          </button>
          <div className="dlvzon-dd-wrap">
            <button
              className="btn btn-purple btn-small dlvzon-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Add Product
              <Icon name="chevron" size={14} />
            </button>
            {addOpen && (
              <div className="dlvzon-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setAddOpen(false); navigate("/products/new"); }}>
                  Single Product
                </button>
                <button type="button" onClick={() => { setAddOpen(false); fileRef.current?.click(); }}>
                  Bulk Import
                </button>
                <button type="button" onClick={() => { setAddOpen(false); navigate("/products/categories"); }}>
                  From Category
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six prod-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Products</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className={`cat-stat-hint ${(stats.totalPct || 0) >= 0 ? "up" : "down"}`}>
              {deltaHint(stats.totalPct)}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Low Stock Items</div>
            <div className="prod-stat-n orange">{fmtNum(stats.lowStock)}</div>
            <div className="cat-stat-hint down">↓ {Number(stats.lowPct || 0).toFixed(1)}% of total</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="warning" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Out of Stock Items</div>
            <div className="prod-stat-n red">{fmtNum(stats.outOfStock)}</div>
            <div className="cat-stat-hint down">↓ {Number(stats.outPct || 0).toFixed(1)}% of total</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="x" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Categories</div>
            <div className="prod-stat-n blue">{fmtNum(stats.categories)}</div>
            <div className="cat-stat-hint up">↑ active catalog</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="folder" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Brands</div>
            <div className="prod-stat-n indigo">{fmtNum(stats.brands)}</div>
            <div className="cat-stat-hint up">↑ active brands</div>
          </div>
          <div className="prod-stat-icon indigo"><Icon name="tag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Inventory Value</div>
            <div className="prod-stat-n green">{fmtNum(stats.stockValue)}</div>
            <div className={`cat-stat-hint ${(stats.stockValuePct || 0) >= 0 ? "up" : "down"}`}>
              {deltaHint(stats.stockValuePct)}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="coin" size={16} /></div>
        </article>
      </section>

      <div className="prod-layout">
        <div className="prod-main">
          <section className="card cat-table-card">
            <form className="attr-filters prod-filters-bar" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products..."
                />
              </div>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {meta.categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }}>
                <option value="">All Brands</option>
                {meta.brands.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={supplier} onChange={(e) => { setSupplier(e.target.value); setPage(1); }}>
                <option value="">All Suppliers</option>
                {(meta.suppliers || meta.brands || []).map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setMore((v) => !v)}>
                <Icon name="filter" size={14} /> More Filters
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
            {more && (
              <p className="muted prod-more-hint">
                Extra filters for price range, tags, and barcode can be configured here.
              </p>
            )}

            <div className="cat-table-wrap">
              <table className="table prod-table-v3">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Price (KES)</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const sk = stockLabel(p.stockStatus);
                    const isInactive = p.isActive === false;
                    return (
                      <tr key={p.id}>
                        <td className="muted">{fromN + i}</td>
                        <td className="prod-name-cell">
                          <button className="prod-cell-btn" type="button" onClick={() => navigate(`/products/${p.id}`)}>
                            {p.image ? <img src={mediaUrl(p.image)} alt="" /> : <div className="prod-ph" />}
                            <span className="prod-name-text">
                              <strong title={p.name}>{p.name}</strong>
                              {p.sku ? <em className="prod-sku-inline">{p.sku}</em> : null}
                            </span>
                          </button>
                        </td>
                        <td className="mono prod-sku-cell" title={p.sku || undefined}>{p.sku || "—"}</td>
                        <td>{p.category}</td>
                        <td>{p.brand || "—"}</td>
                        <td>{fmtNum(p.priceKes)}</td>
                        <td><b>{fmtNum(p.stock)}</b></td>
                        <td>
                          <span className={`sk-pill ${isInactive ? "sk-inactive" : sk.cls}`}>
                            {isInactive ? "Inactive" : sk.label}
                          </span>
                        </td>
                        <td>
                          <div className="prod-row-acts">
                            <button type="button" title="View" onClick={() => navigate(`/products/${p.id}`)}>
                              <Icon name="eye" size={14} />
                            </button>
                            <button type="button" title="Edit" onClick={() => navigate(`/products/${p.id}`)}>
                              <Icon name="pencil" size={14} />
                            </button>
                            <button type="button" title="Delete" className="danger" onClick={() => removeProduct(p)}>
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan="9" className="muted">No products match these filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} products</span>
              <div className="pager-btns">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="chevronLeft" size={14} />
                </button>
                {pageButtons().map((n) => (
                  <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>
                    {n}
                  </button>
                ))}
                {pages > 5 && (
                  <>
                    <span className="muted">…</span>
                    <button type="button" onClick={() => setPage(pages)}>{pages}</button>
                  </>
                )}
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
              <label className="prod-rows">
                Rows per page
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </footer>
          </section>
        </div>

        <aside className="prod-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Inventory Summary</h2>
            <Donut parts={invParts} total={stats.total} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="folder" size={14} /> Top Categories by Items</h2>
            <ul className="prod-cat-bars">
              {(data.topCategories || []).map((c) => (
                <li key={c.key}>
                  <div className="prod-cat-meta">
                    <strong>{c.name}</strong>
                    <b>{fmtNum(c.value)}</b>
                  </div>
                  <div className="prod-cat-track">
                    <i style={{ width: `${Math.max(6, c.pct)}%` }} />
                  </div>
                </li>
              ))}
              {(data.topCategories || []).length === 0 && (
                <li className="muted">No category data yet.</li>
              )}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bolt" size={14} /> Quick Actions</h2>
            <ul className="prod-quick-list">
              {QUICK.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.to) navigate(item.to);
                      else if (item.id === "import") fileRef.current?.click();
                      else if (item.stock) {
                        setStatus(item.stock);
                        setPage(1);
                      } else setToast(`${item.label} opened`);
                    }}
                  >
                    <span className="prod-qa-ico"><Icon name={item.icon} size={14} /></span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={() => setToast("Import started — processing CSV file")}
      />

      <footer className="card pf-card prod-foot-banner prod-foot-row">
        <p>
          <Icon name="info" size={14} />
          <span>
            <strong>Tip:</strong> Keep your inventory updated to avoid stockouts and lost sales. Set low stock alerts in Settings.
          </span>
        </p>
        <Link className="btn btn-ghost btn-small" to="/settings">
          Go to Settings
        </Link>
      </footer>
    </div>
  );
}
