import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const QUICK = [
  { id: "add", icon: "plus", label: "Add New Product", tone: "purple", to: "/products/new" },
  { id: "import", icon: "upload", label: "Bulk Import", tone: "blue" },
  { id: "adjust", icon: "box", label: "Inventory Adjustment", tone: "orange", to: "/products/adjustments" },
  { id: "categories", icon: "folder", label: "Manage Categories", tone: "green", to: "/products/categories" },
  { id: "brands", icon: "tag", label: "Manage Brands", tone: "purple", to: "/products/brands" },
  { id: "analytics", icon: "chart", label: "View Analytics", tone: "blue" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function pct(n) {
  if (n == null) return "";
  const v = Number(n);
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
}

function stockLabel(key) {
  if (key === "low") return { label: "Low Stock", cls: "sk-low" };
  if (key === "out") return { label: "Out of Stock", cls: "sk-out" };
  return { label: "In Stock", cls: "sk-in" };
}

function Donut({ parts, total, sub, center }) {
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
        <text x="70" y="64" textAnchor="middle" className="donut-total">{center || fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">{sub}</text>
      </svg>
      <ul className="donut-legend prod-donut-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{Number(p.pct).toFixed(1)}%</b>
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
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      category: next.category ?? category,
      brand: next.brand ?? brand,
      status: next.status ?? status,
      stock: next.stock ?? stock,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.category) p.set("category", vals.category);
    if (vals.brand) p.set("brand", vals.brand);
    if (vals.status) p.set("status", vals.status);
    if (vals.stock) p.set("stock", vals.stock);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/products-catalog?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setSelected([]);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load products."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, category, brand, status, stock]);

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

  const stats = data?.stats || {};
  const products = data?.products || [];
  const meta = data?.meta || { categories: [], brands: [] };
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const allChecked = products.length > 0 && products.every((p) => selected.includes(p.id));

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
    setStock("");
    setPage(1);
    load({ q: "", category: "", brand: "", status: "", stock: "", page: 1 });
  }

  function exportCsv() {
    const rows = [
      ["Product", "SKU", "Category", "Price", "Stock", "Status", "Stock Status", "Created At"],
      ...products.map((p) => [
        p.name,
        p.sku,
        p.category,
        p.priceKes,
        p.stock,
        p.isActive ? "Active" : "Inactive",
        stockLabel(p.stockStatus).label,
        p.createdLabel,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "netza-products.csv";
    a.click();
    setToast("Products exported");
  }

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
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
            Products
            <span className="prod-title-icon solid"><Icon name="box" size={16} /></span>
          </h1>
          <p>Manage all your products, inventory and catalog.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("Product analytics coming soon")}>
            <Icon name="chart" size={14} /> View Analytics
          </button>
          <Link className="btn btn-purple btn-small prod-add-dd" to="/products/new">
            <Icon name="plus" size={14} /> Add New Product
            <Icon name="chevron" size={14} />
          </Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats seven prod-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Products</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Products</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint up">{pct(stats.activePct)}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Out of Stock</div>
            <div className="prod-stat-n red">{fmtNum(stats.outOfStock)}</div>
            <div className="cat-stat-hint down">{pct(stats.outPct)}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="x" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Low Stock</div>
            <div className="prod-stat-n gold">{fmtNum(stats.lowStock)}</div>
            <div className="cat-stat-hint">{pct(stats.lowPct)}</div>
          </div>
          <div className="prod-stat-icon gold"><Icon name="bars" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Categories</div>
            <div className="prod-stat-n blue">{fmtNum(stats.categories)}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="folder" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Brands</div>
            <div className="prod-stat-n indigo">{fmtNum(stats.brands)}</div>
          </div>
          <div className="prod-stat-icon indigo"><Icon name="tag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Value (Stock)</div>
            <div className="prod-stat-n teal">{kes(stats.stockValue)}</div>
          </div>
          <div className="prod-stat-icon teal"><Icon name="coin" size={16} /></div>
        </article>
      </section>

      <div className="prod-layout">
        <div className="prod-main">
          <section className="card prod-filters">
            <form className="prod-filter-row" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products, SKU, barcode..."
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={stock} onChange={(e) => { setStock(e.target.value); setPage(1); }}>
                <option value="">All Stock Status</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setMore((v) => !v)}>
                <Icon name="filter" size={14} /> More Filters
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={reset}>Reset</button>
              <button className="btn btn-purple btn-small" type="submit">Filter</button>
            </form>
            {more && (
              <p className="muted prod-more-hint">Additional filters for price range, tags, and supplier can be configured here.</p>
            )}
          </section>

          {selected.length > 0 && (
            <div className="prod-bulk">
              <span>{selected.length} selected</span>
              <button className="btn btn-danger btn-small" type="button" onClick={() => setToast("Bulk actions applied")}>
                Bulk Actions
              </button>
            </div>
          )}

          <section className="card prod-table-wrap">
            <table className="table prod-table prod-table-v2">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => setSelected(e.target.checked ? products.map((p) => p.id) : [])}
                    />
                  </th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price (KSh)</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Stock Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const sk = stockLabel(p.stockStatus);
                  return (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={(e) =>
                            setSelected((ids) => (e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id)))
                          }
                        />
                      </td>
                      <td>
                        <div className="prod-cell">
                          {p.image ? <img src={p.image} alt="" /> : <div className="prod-ph" />}
                          <div>
                            <strong>{p.name}</strong>
                            <div className="muted">{p.sub}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{p.sku}</td>
                      <td>{p.category}</td>
                      <td>{fmtNum(p.priceKes)}</td>
                      <td><b>{fmtNum(p.stock)}</b></td>
                      <td>
                        <span className={`st-pill ${p.isActive ? "st-active" : "st-inactive"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <span className={`sk-pill ${sk.cls}`}>{sk.label}</span>
                      </td>
                      <td>{p.createdLabel}</td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => navigate(`/products/${p.id}`)}><Icon name="eye" size={14} /></button>
                          <button type="button" title="Edit" onClick={() => navigate(`/products/${p.id}`)}><Icon name="pencil" size={14} /></button>
                          <button type="button" title="More"><Icon name="more" size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="10" className="muted">No products match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
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

          <div className="prod-foot-grid">
            <section className="card pf-card">
              <h2><Icon name="box" size={14} /> Inventory Summary</h2>
              <ul className="prod-summary-list">
                {(data.inventorySummary || []).map((row) => (
                  <li key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card pf-card">
              <h2><Icon name="chart" size={14} /> Stock Status Overview</h2>
              <Donut parts={data.stockOverview} total={stats.total} sub="Products" center={fmtNum(stats.total)} />
            </section>
            <section className="card pf-card">
              <h2><Icon name="clock" size={14} /> Recent Product Activities</h2>
              <ul className="prod-activity">
                {(data.recentActivities || []).map((a) => (
                  <li key={a.id}>
                    <i className={`prod-act-dot ${a.tone}`} />
                    <div>
                      <p>{a.text}</p>
                      <span className="muted">{a.atLabel}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <aside className="prod-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Products by Category</h2>
            <Donut parts={data.categoryDonut} total={stats.total} sub="Products" />
          </section>
          <section className="card pf-card">
            <h2><Icon name="trophy" size={14} /> Top Selling Products</h2>
            <ul className="prod-top-list">
              {(data.topSelling || []).map((p, i) => (
                <li key={p.name}>
                  <span className="prod-top-rank">{i + 1}</span>
                  {p.image ? <img src={p.image} alt="" /> : <div className="prod-ph" />}
                  <div>
                    <strong>{p.name}</strong>
                    <span className="muted">{fmtNum(p.sold)} Sold</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card pf-card">
            <h2><Icon name="bolt" size={14} /> Quick Actions</h2>
            <div className="prod-quick-grid">
              {QUICK.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`prod-quick ${item.tone}`}
                  onClick={() => {
                    if (item.to) navigate(item.to);
                    else if (item.id === "import") fileRef.current?.click();
                    else setToast(`${item.label} opened`);
                  }}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
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

      <footer className="card pf-card prod-foot-banner">
        <p>
          <Icon name="info" size={14} />
          <strong>Tip:</strong> Keep your inventory updated to avoid stockouts and improve customer satisfaction.
        </p>
      </footer>
    </div>
  );
}
