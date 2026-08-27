import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DetailMeta } from "../DeliveryRowMenu";

function fmtNum(n, digits = 0) {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n || 0);
}

function fmtKes(n) {
  return `KES ${fmtNum(n)}`;
}

function deltaCls(n) {
  const v = Number(n) || 0;
  if (v === 0) return "";
  return v > 0 ? "up" : "down";
}

function deltaArrow(n) {
  return Number(n) >= 0 ? "↑" : "↓";
}

function summaryValue(item) {
  if (item.kind === "money") return fmtKes(item.value);
  return fmtNum(item.value);
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap invrpt-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="14" />
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
              strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="62" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="78" textAnchor="middle" className="donut-sub">Total Products</text>
      </svg>
      <ul className="donut-legend invrpt-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <em>{Number(p.pct).toFixed(1)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValueChart({ data }) {
  const labels = data?.labels || [];
  const values = data?.values || [];
  const w = 520;
  const h = 220;
  const pad = { t: 16, r: 16, b: 28, l: 52 };
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0) * 0.92;
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  function xy(v, i) {
    const x = pad.l + (i / Math.max(values.length - 1, 1)) * iw;
    const y = pad.t + ih - ((v - min) / (max - min || 1)) * ih;
    return { x, y };
  }

  const linePts = values.map((v, i) => {
    const { x, y } = xy(v, i);
    return `${x},${y}`;
  }).join(" ");

  const areaPts = [
    `${pad.l},${pad.t + ih}`,
    ...values.map((v, i) => {
      const { x, y } = xy(v, i);
      return `${x},${y}`;
    }),
    `${pad.l + iw},${pad.t + ih}`,
  ].join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(min + (max - min) * t));

  return (
    <div className="invrpt-line">
      <svg viewBox={`0 0 ${w} ${h}`} className="invrpt-line-svg" role="img" aria-label="Inventory value over time">
        <defs>
          <linearGradient id="invrptFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6c5dd3" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6c5dd3" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => {
          const y = pad.t + ih - ((t - min) / (max - min || 1)) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" className="invrpt-axis">
                {(t / 1000000).toFixed(1)}M
              </text>
            </g>
          );
        })}
        <polygon fill="url(#invrptFill)" points={areaPts} />
        <polyline
          fill="none"
          stroke="#6c5dd3"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={linePts}
        />
        {values.map((v, i) => {
          const { x, y } = xy(v, i);
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#6c5dd3" stroke="#fff" strokeWidth="1.5" />;
        })}
        {labels.map((l, i) => {
          const x = pad.l + (i / Math.max(labels.length - 1, 1)) * iw;
          return (
            <text key={l} x={x} y={h - 8} textAnchor="middle" className="invrpt-axis">{l}</text>
          );
        })}
      </svg>
    </div>
  );
}

export default function InventoryReports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [categoryF, setCategoryF] = useState("");
  const [brandF, setBrandF] = useState("");
  const [warehouseF, setWarehouseF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      category: next.category ?? categoryF,
      brand: next.brand ?? brandF,
      warehouse: next.warehouse ?? warehouseF,
      status: next.status ?? statusF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.category) p.set("category", vals.category);
    if (vals.brand) p.set("brand", vals.brand);
    if (vals.warehouse) p.set("warehouse", vals.warehouse);
    if (vals.status) p.set("status", vals.status);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/inventory-reports?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load inventory reports."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, categoryF, brandF, warehouseF, statusF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() { setCustomOpen(false); }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function reset() {
    setCategoryF("");
    setBrandF("");
    setWarehouseF("");
    setStatusF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ category: "", brand: "", warehouse: "", status: "", page: 1 });
  }

  function exportCsv() {
    const rows = data?.products || [];
    const header = ["#", "Product", "SKU", "Category", "Warehouse", "Current Stock", "Reorder Level", "Status"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        JSON.stringify(r.name),
        r.sku,
        JSON.stringify(r.category),
        JSON.stringify(r.warehouse),
        r.stock,
        r.reorderLevel,
        r.statusLabel,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-reports.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setToast("Inventory report exported");
  }

  function reorder(r) {
    setToast(`Reorder started for “${r.name}”`);
  }

  if (!data) {
    return (
      <div className="invrpt-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/reports?tab=delivery">Reports</Link>
          <span>›</span>
          <strong>Inventory Reports</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading inventory reports…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.products || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
  }

  return (
    <div className="invrpt-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/reports?tab=delivery">Reports</Link>
        <span>›</span>
        <strong>Inventory Reports</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="box" size={16} /></span>
            Inventory Reports
          </h1>
          <p>This report section is ready for detailed analytics.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <div className="invrpt-dd-wrap">
            <button
              className="btn btn-purple btn-small invrpt-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCustomOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Custom Report
              <Icon name="chevron" size={14} />
            </button>
            {customOpen && (
              <div className="invrpt-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Custom report builder coming soon"); }}>Build Custom Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Scheduled report created"); }}>Schedule Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); navigate("/reports?tab=delivery"); }}>Back to Delivery Reports</button>
              </div>
            )}
          </div>
          <button className="btn btn-purple btn-small" type="button" onClick={() => navigate("/reports?tab=delivery")}>
            ← Back to Delivery Reports
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five invrpt-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Products</div>
            <div className="prod-stat-n purple">{fmtNum(stats.totalProducts)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalProductsDelta)}`}>
              {deltaArrow(stats.totalProductsDelta)} {Math.abs(stats.totalProductsDelta).toFixed(1)}% {stats.totalProductsHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">In Stock</div>
            <div className="prod-stat-n green">{fmtNum(stats.inStock)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.inStockDelta)}`}>
              {deltaArrow(stats.inStockDelta)} {Math.abs(stats.inStockDelta).toFixed(1)}% {stats.inStockHint}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Low Stock</div>
            <div className="prod-stat-n orange">{fmtNum(stats.lowStock)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.lowStockDelta)}`}>
              {deltaArrow(stats.lowStockDelta)} {Math.abs(stats.lowStockDelta).toFixed(1)}% {stats.lowStockHint}
            </div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="warning" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Out of Stock</div>
            <div className="prod-stat-n red">{fmtNum(stats.outOfStock)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.outOfStockDelta)}`}>
              {deltaArrow(stats.outOfStockDelta)} {Math.abs(stats.outOfStockDelta).toFixed(1)}% {stats.outOfStockHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Stock Value (KES)</div>
            <div className="prod-stat-n blue">{fmtKes(stats.stockValue)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.stockValueDelta)}`}>
              {deltaArrow(stats.stockValueDelta)} {Math.abs(stats.stockValueDelta).toFixed(1)}% {stats.stockValueHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="wallet" size={16} /></div>
        </article>
      </section>

      <section className="card prod-filters">
        <form
          className="prod-filter-row invrpt-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load({ page: 1 });
          }}
        >
          <div className="invrpt-dates">
            <Icon name="calendar" size={14} />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <select value={categoryF} onChange={(e) => { setCategoryF(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {(data.filters?.categories || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={brandF} onChange={(e) => { setBrandF(e.target.value); setPage(1); }}>
            <option value="">All Brands</option>
            {(data.filters?.brands || []).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select value={warehouseF} onChange={(e) => { setWarehouseF(e.target.value); setPage(1); }}>
            <option value="">All Warehouses</option>
            {(data.filters?.warehouses || []).map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {(data.filters?.statuses || []).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-small" type="submit">
            <Icon name="filter" size={14} /> Filters
          </button>
          <button className="link-reset" type="button" onClick={reset}>Reset</button>
        </form>
      </section>

      <div className="invrpt-charts">
        <section className="card pf-card invrpt-overview">
          <h2><Icon name="trend" size={14} /> Inventory Value Over Time (KES)</h2>
          <ValueChart data={data.valueOverTime} />
        </section>
        <section className="card pf-card">
          <h2><Icon name="chart" size={14} /> Stock Status Distribution</h2>
          <Donut parts={data.statusDonut} total={stats.totalProducts} />
        </section>
        <section className="card pf-card">
          <h2><Icon name="box" size={14} /> Top Categories by Stock Value</h2>
          <ul className="invrpt-bars">
            {(data.categories || []).map((cat) => (
              <li key={cat.key}>
                <div className="invrpt-bar-meta">
                  <span>{cat.name}</span>
                  <b>{Number(cat.pct).toFixed(1)}%</b>
                </div>
                <div className="invrpt-bar-track">
                  <i style={{ width: `${cat.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="invrpt-bottom">
        <section className="card invrpt-table-card">
          <div className="invrpt-table-head">
            <h2>Low Stock Alert</h2>
          </div>
          <div className="prod-table-wrap invrpt-scroll">
            <table className="table prod-table invrpt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Warehouse</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <button className="link-reset invrpt-prod-btn" type="button" onClick={() => setViewing(r)}>
                        <div className="prod-cell invrpt-product">
                          <img src={r.image} alt="" />
                          <strong>{r.name}</strong>
                        </div>
                      </button>
                    </td>
                    <td><code className="invrpt-sku">{r.sku}</code></td>
                    <td>{r.category}</td>
                    <td>{r.warehouse}</td>
                    <td><strong className="invrpt-stock">{fmtNum(r.stock)}</strong></td>
                    <td>{fmtNum(r.reorderLevel)}</td>
                    <td><span className="st-pill invrpt-st-low">{r.statusLabel}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-small invrpt-reorder" type="button" onClick={() => reorder(r)}>
                        <Icon name="cart" size={13} /> Reorder
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="9" className="muted">No low stock items match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} low stock items</span>
            <div className="pager-btns">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevronLeft" size={14} />
              </button>
              {pageButtons().map((n) => (
                <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
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
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </footer>
        </section>

        <aside className="invrpt-side">
          <section className="card pf-card">
            <h2><Icon name="box" size={14} /> Inventory Summary</h2>
            <ul className="invrpt-summary">
              {(data.summary || []).map((s) => (
                <li key={s.key}>
                  <span className="muted">{s.label}</span>
                  <strong>{summaryValue(s)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bulb" size={14} /> Inventory Insights</h2>
            <ul className="invrpt-insights">
              {(data.insights || []).map((ins) => (
                <li key={ins.key}>
                  <span className="invrpt-ins-ico"><Icon name={ins.icon} size={14} /></span>
                  <span>{ins.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {viewing && (
        <DeliveryDetailModal
          title={viewing.name}
          subtitle={`${viewing.sku} · ${viewing.category}`}
          statusNode={<span className="st-pill invrpt-st-low">{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                onClick={() => {
                  setViewing(null);
                  navigate(`/products?q=${encodeURIComponent(viewing.sku)}`);
                }}
              >
                Open product
              </button>
              <button
                className="btn btn-purple btn-small"
                type="button"
                onClick={() => {
                  reorder(viewing);
                  setViewing(null);
                }}
              >
                <Icon name="cart" size={13} /> Reorder
              </button>
            </>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Brand", value: viewing.brand },
              { label: "Warehouse", value: viewing.warehouse },
              { label: "Current Stock", value: <strong className="invrpt-stock">{fmtNum(viewing.stock)}</strong> },
              { label: "Reorder Level", value: fmtNum(viewing.reorderLevel) },
              { label: "Stock Value", value: fmtKes(viewing.value) },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
