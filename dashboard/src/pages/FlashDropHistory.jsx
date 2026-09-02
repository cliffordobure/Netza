import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const QUICK = [
  { id: "create", icon: "plus", label: "Create Flash Drop", tone: "purple" },
  { id: "schedule", icon: "calendar", label: "Schedule Drop", tone: "orange" },
  { id: "analytics", icon: "chart", label: "View Analytics", tone: "blue" },
  { id: "export", icon: "download", label: "Export Report", tone: "green" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return "0%";
  const v = Number(n);
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
}

function pagerItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages]);
  if (page <= 4) [2, 3, 4, 5].forEach((n) => set.add(n));
  else if (page >= pages - 3) [pages - 4, pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));
  else [page - 1, page, page + 1].forEach((n) => set.add(n));
  return [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
}

function catClass(name) {
  const id = String(name || "").toLowerCase();
  if (id.includes("cctv")) return "fd-cat-cctv";
  if (id.includes("voucher")) return "fd-cat-vouchers";
  if (id.includes("wifi") || id.includes("wi-fi")) return "fd-cat-wifi";
  if (id.includes("accessor")) return "fd-cat-accessories";
  if (id.includes("gadget")) return "fd-cat-gadgets";
  if (id.includes("access")) return "fd-cat-access";
  if (id.includes("cabl")) return "fd-cat-cabling";
  if (id.includes("power") || id.includes("other")) return "fd-cat-power";
  return "fd-cat-networking";
}

function statusMeta(status) {
  if (status === "expired") return { label: "Expired", cls: "fd-st-expired" };
  if (status === "cancelled") return { label: "Cancelled", cls: "ord-st-cancelled" };
  return { label: "Completed", cls: "st-pub" };
}

function HoverLine({ series, tipIndex }) {
  const w = 280;
  const h = 150;
  const padX = 18;
  const padY = 24;
  const [hover, setHover] = useState(tipIndex);
  const values = (series || []).map((p) => p.revenue || 0);
  const max = Math.max(...values, 1);
  const coords = (series || []).map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(series.length - 1, 1);
    const y = h - padY - ((p.revenue || 0) / max) * (h - padY * 2);
    return { ...p, x, y };
  });
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = first && last ? `${line} L${last.x},${h - padY} L${first.x},${h - padY} Z` : "";
  const active = coords[hover] ?? coords[tipIndex] ?? coords[0];
  return (
    <div className="ca-chart-wrap">
      {active && (
        <div className="chart-tip-html ca-tip">
          {active.dateLabel}
          <span>{kes(active.revenue)}</span>
        </div>
      )}
      <svg className="cd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Revenue by month">
        <path d={area} fill="rgba(109,40,217,0.16)" />
        <path d={line} fill="none" stroke="#6D28D9" strokeWidth="2.4" />
        {coords.map((c, i) => (
          <g key={c.d}>
            {c.label ? <text x={c.x} y={h - 6} textAnchor="middle" className="comp-chart-lbl">{c.label}</text> : null}
            <rect x={c.x - 12} y={padY - 8} width="24" height={h - padY * 2 + 16} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        {active && (
          <>
            <line x1={active.x} y1={padY} x2={active.x} y2={h - padY} stroke="#c4b5fd" strokeDasharray="3 3" />
            <circle cx={active.x} cy={active.y} r="4.5" fill="#6D28D9" stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.count || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap fdc-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {(parts || []).map((p) => {
          const value = p.count || 0;
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
      <ul className="donut-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{fmtNum(p.count)} · {Number(p.pct).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function cellValue(row, key) {
  if (row.money) return kes(row[key]);
  if (row.pct) return pct(row[key]);
  return fmtNum(row[key]);
}

export default function FlashDropHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({});
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [catF, setCatF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-05-27");
  const [year, setYear] = useState("2026");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function query() {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.trim()) qs.set("q", q.trim());
    if (statusF) qs.set("status", statusF);
    if (catF) qs.set("category", catF);
    if (channelF) qs.set("channel", channelF);
    return qs.toString();
  }

  function load() {
    api(`/admin/flash-drop-history?${query()}`)
      .then((d) => {
        setRows(d.drops || []);
        setTotal(d.total || 0);
        setMeta(d);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load drop history."));
  }

  useEffect(() => { load(); }, [page, limit, q, statusF, catF, channelF]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = meta.stats || {};
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const pageNums = pagerItems(page, pages);
  const maxCat = Math.max(...(meta.categories || []).map((c) => c.pct), 1);

  function exportCsv() {
    const header = ["#", "SKU", "Name", "Category", "Discount", "Status", "Start", "End", "Stock", "Sold", "Revenue", "Participants"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([r.n, r.sku, `"${r.name}"`, r.category, r.discountLabel, r.status, r.startLabel, r.endLabel, r.stock, r.sold, r.revenue, r.participants].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-flash-drop-history.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("History report exported");
  }

  function runQuick(id) {
    if (id === "create") navigate("/flash-drops/new");
    else if (id === "schedule") navigate("/flash-drops/new?schedule=1");
    else if (id === "analytics") navigate("/flash-drops?tab=analytics");
    else if (id === "export") exportCsv();
  }

  return (
    <div className="fd-page fdh-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Drop History</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drop History
            <span className="prod-title-icon"><Icon name="clock" size={16} /></span>
          </h1>
          <p>View performance and details of all completed and past flash drops.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => navigate("/flash-drops?tab=analytics")}>
            <Icon name="chart" size={14} /> View Analytics
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats seven">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Drops</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Completed Drops</div>
            <div className="prod-stat-n green">{fmtNum(stats.completed)}</div>
            <div className="cat-stat-hint">{Number(stats.completedPct || 0).toFixed(1)}% of total</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Cancelled Drops</div>
            <div className="prod-stat-n red">{fmtNum(stats.cancelled)}</div>
            <div className="cat-stat-hint">{Number(stats.cancelledPct || 0).toFixed(1)}% of total</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="ban" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Expired Drops</div>
            <div className="prod-stat-n orange">{fmtNum(stats.expired)}</div>
            <div className="cat-stat-hint">{Number(stats.expiredPct || 0).toFixed(1)}% of total</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="hourglass" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Items Sold</div>
            <div className="prod-stat-n orange">{fmtNum(stats.sold)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="cart" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Revenue</div>
            <div className="prod-stat-n green">{kes(stats.revenue)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="coin" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Discount</div>
            <div className="prod-stat-n purple">{stats.avgDiscount ? `${Number(stats.avgDiscount).toFixed(1)}%` : "0%"}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="percent" size={16} /></div>
        </article>
      </section>

      <div className="pts-layout has-side comp-layout">
        <section className="card cat-table-card">
          <form
            className="attr-filters"
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
          >
            <div className="ord-dates" title="Select Date Range">
              <Icon name="calendar" size={14} />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="muted">–</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={catF} onChange={(e) => { setCatF(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {(meta.categoriesList || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
              <option value="">All Channels</option>
              <option value="app">Mobile App</option>
              <option value="website">Website</option>
              <option value="email">Email</option>
              <option value="social">Social Media</option>
              <option value="other">Other</option>
            </select>
            <div className="prod-search">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search flash drops..." />
            </div>
            <button className="btn btn-ghost btn-small" type="submit">
              <Icon name="filter" size={14} /> Filter
            </button>
          </form>

          <div className="prod-table-wrap">
            <table className="table prod-table pts-table fdh-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Drop / Product</th>
                  <th>Category</th>
                  <th>Discount</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                  <th>Participants</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = statusMeta(r.status);
                  return (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td>
                        <button className="rule-name rwd-name" type="button" onClick={() => setViewing(r)}>
                          <img src={r.image} alt="" className="rwd-thumb" />
                          <span>
                            <strong>{r.name}</strong>
                            <div className="muted">{r.sku}</div>
                          </span>
                        </button>
                      </td>
                      <td><span className={`fd-cat ${catClass(r.category)}`}>{r.category}</span></td>
                      <td className="fd-discount">{r.discountLabel}</td>
                      <td>{r.startLabel}</td>
                      <td>{r.endLabel}</td>
                      <td><span className={`st-pill ${st.cls}`}>{st.label}</span></td>
                      <td>{fmtNum(r.stock)}</td>
                      <td>
                        <div className="fd-sold">
                          <b className={r.soldPct >= 100 ? "fdh-sold-ok" : ""}>{fmtNum(r.sold)} ({r.soldPct}%)</b>
                          <span className="fd-sold-bar"><i style={{ width: `${Math.min(100, r.soldPct || 0)}%` }} /></span>
                        </div>
                      </td>
                      <td>{kes(r.revenue)}</td>
                      <td>{fmtNum(r.participants)}</td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => { setViewing(r); setMenu(null); }}><Icon name="eye" size={14} /></button>
                          <span className="ord-menu-wrap">
                            <button type="button" title="More" onClick={() => setMenu(menu === r.id ? null : r.id)}><Icon name="more" size={14} /></button>
                            {menu === r.id && (
                              <div className="ord-menu">
                                <button type="button" onClick={() => { setViewing(r); setMenu(null); }}>View details</button>
                                <button type="button" onClick={() => { setToast("Drop duplicated"); setMenu(null); }}>Duplicate</button>
                                <button type="button" onClick={() => { exportCsv(); setMenu(null); }}>Export</button>
                              </div>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan="12" className="muted">No flash drops match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} drops</span>
            <div className="pager-btns">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevronLeft" size={14} /></button>
              {pageNums.map((n, i) => (
                <span key={n} className="cd-page-cluster">
                  {i > 0 && n - pageNums[i - 1] > 1 && <span className="muted">…</span>}
                  <button type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
                </span>
              ))}
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}><Icon name="chevronRight" size={14} /></button>
            </div>
            <label className="pager-rows">
              Rows per page
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </footer>
        </section>

        <aside className="pts-side rwd-side">
          <section className="card pts-widget">
            <h3>History Overview</h3>
            <Donut parts={meta.overview || []} total={stats.total || 86} />
          </section>
          <section className="card pts-widget">
            <div className="fdh-wid-head">
              <h3>Revenue by Month</h3>
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="2026">This Year</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <HoverLine series={year === "2026" ? (meta.months || []) : []} tipIndex={meta.tipIndex ?? 4} />
          </section>
          <section className="card pts-widget">
            <h3>Top Categories by Revenue</h3>
            <ul className="fdh-cats">
              {(meta.categories || []).map((c) => (
                <li key={c.key}>
                  <div className="fdh-cat-lbl">
                    <strong>{c.name}</strong>
                    <em>{c.money}</em>
                  </div>
                  <span className="fda-bar-track"><i style={{ width: `${(c.pct / maxCat) * 100}%`, background: c.color }} /></span>
                  <span className="muted">{c.pct}%</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card pts-widget">
            <h3>Quick Actions</h3>
            <div className="fd-qa-grid">
              {QUICK.map((item) => (
                <button key={item.id} type="button" onClick={() => runQuick(item.id)}>
                  <span className={`rule-ico ${item.tone}`}><Icon name={item.icon} size={14} /></span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="fdh-foot">
        <section className="card pf-card">
          <h2>Drop Performance Summary</h2>
          <div className="prod-table-wrap">
            <table className="table prod-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Completed Drops</th>
                  <th>Expired Drops</th>
                  <th>Cancelled Drops</th>
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {(meta.performance || []).map((row) => (
                  <tr key={row.metric}>
                    <td><strong>{row.metric}</strong></td>
                    <td>{cellValue(row, "completed")}</td>
                    <td>{cellValue(row, "expired")}</td>
                    <td>{cellValue(row, "cancelled")}</td>
                    <td><strong>{cellValue(row, "overall")}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card pf-card">
          <h2>Recent Completed Drops</h2>
          <ul className="fdh-recent">
            {(meta.recent || []).map((d) => (
              <li key={d.sku}>
                <img src={d.image} alt="" />
                <div>
                  <strong>{d.name}</strong>
                  <div className="muted">{d.at}</div>
                  <div className="fd-live-prog">
                    <span>{kes(d.revenue)}</span>
                    <span>{d.sold}/{d.stock}</span>
                  </div>
                  <span className="fd-sold-bar"><i style={{ width: `${d.stock ? Math.min(100, (d.sold / d.stock) * 100) : 0}%` }} /></span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="cd-note">
        <Icon name="info" size={16} />
        <p>History data is kept for 24 months. Use filters to find specific flash drops.</p>
      </section>

      {viewing && (
        <div className="prod-modal" onClick={() => setViewing(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>{viewing.name}</h2>
              <button className="icon-btn" type="button" onClick={() => setViewing(null)}>×</button>
            </div>
            <div className="cust-drawer-top">
              <img src={viewing.image} alt="" />
              <div>
                <span className={`st-pill ${statusMeta(viewing.status).cls}`}>{statusMeta(viewing.status).label}</span>
                <p className="muted">{viewing.sku} · {viewing.category}</p>
              </div>
            </div>
            <dl className="fd-view">
              <div><dt>Discount</dt><dd>{viewing.discountLabel}</dd></div>
              <div><dt>Start</dt><dd>{viewing.startLabel}</dd></div>
              <div><dt>End</dt><dd>{viewing.endLabel}</dd></div>
              <div><dt>Stock</dt><dd>{fmtNum(viewing.stock)}</dd></div>
              <div><dt>Sold</dt><dd>{fmtNum(viewing.sold)} ({viewing.soldPct}%)</dd></div>
              <div><dt>Revenue</dt><dd>{kes(viewing.revenue)}</dd></div>
              <div><dt>Participants</dt><dd>{fmtNum(viewing.participants)}</dd></div>
            </dl>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(null)}>Close</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => { setViewing(null); navigate("/flash-drops?tab=analytics"); }}>View Analytics</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
