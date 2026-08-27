import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DeliveryRowMenu, DetailMeta } from "../DeliveryRowMenu";

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

function segmentCls(segment) {
  if (segment === "premium") return "custrpt-seg-premium";
  if (segment === "vip") return "custrpt-seg-vip";
  if (segment === "new") return "custrpt-seg-new";
  return "custrpt-seg-regular";
}

function summaryValue(item) {
  if (item.kind === "pct") return `${Number(item.value).toFixed(1)}%`;
  if (item.kind === "months") return `${Number(item.value).toFixed(1)} months`;
  return fmtNum(item.value);
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap custrpt-donut">
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
        <text x="70" y="66" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="82" textAnchor="middle" className="donut-sub">Total</text>
      </svg>
      <ul className="donut-legend custrpt-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{fmtNum(p.value)}</b>
            <em>{Number(p.pct).toFixed(1)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GrowthChart({ data }) {
  const labels = data?.labels || [];
  const series = [
    { key: "total", label: "Total Customers", color: "#5b4bc9", values: data?.total || [] },
    { key: "new", label: "New Customers", color: "#16a34a", values: data?.newCustomers || [] },
    { key: "active", label: "Active Customers", color: "#38bdf8", values: data?.active || [] },
  ];
  const w = 520;
  const h = 220;
  const pad = { t: 16, r: 16, b: 28, l: 44 };
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1000);
  const min = 0;
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const yTicks = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

  function pts(values) {
    return values
      .map((v, i) => {
        const x = pad.l + (i / Math.max(values.length - 1, 1)) * iw;
        const y = pad.t + ih - ((v - min) / (max - min || 1)) * ih;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="custrpt-line">
      <svg viewBox={`0 0 ${w} ${h}`} className="custrpt-line-svg" role="img" aria-label="Customer growth chart">
        {yTicks.map((t) => {
          const y = pad.t + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" className="custrpt-axis">{fmtNum(t)}</text>
            </g>
          );
        })}
        {series.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pts(s.values)}
          />
        ))}
        {labels.map((l, i) => {
          const x = pad.l + (i / Math.max(labels.length - 1, 1)) * iw;
          return (
            <text key={l} x={x} y={h - 8} textAnchor="middle" className="custrpt-axis">{l}</text>
          );
        })}
      </svg>
      <div className="custrpt-line-legend">
        {series.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} /> {s.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function CustomerReports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [segmentF, setSegmentF] = useState("");
  const [locationF, setLocationF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      segment: next.segment ?? segmentF,
      location: next.location ?? locationF,
      status: next.status ?? statusF,
      channel: next.channel ?? channelF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.segment) p.set("segment", vals.segment);
    if (vals.location) p.set("location", vals.location);
    if (vals.status) p.set("status", vals.status);
    if (vals.channel) p.set("channel", vals.channel);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/customer-reports?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load customer reports."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, segmentF, locationF, statusF, channelF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setCustomOpen(false);
      setMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function reset() {
    setSegmentF("");
    setLocationF("");
    setStatusF("");
    setChannelF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ segment: "", location: "", status: "", channel: "", page: 1 });
  }

  function exportCsv() {
    const rows = data?.customers || [];
    const header = ["#", "Customer", "Email", "Phone", "Segment", "Orders", "Spend", "Avg Order", "Last Order", "Location"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        JSON.stringify(r.name),
        JSON.stringify(r.email),
        JSON.stringify(r.phone),
        r.segmentLabel,
        r.orders,
        r.spend,
        r.avgOrder,
        JSON.stringify(r.lastOrder),
        r.location,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer-reports.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setToast("Customer report exported");
  }

  function openCustomer(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(r);
  }

  if (!data) {
    return (
      <div className="custrpt-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/reports?tab=delivery">Reports</Link>
          <span>›</span>
          <strong>Customer Reports</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading customer reports…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.customers || [];
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
    <div className="custrpt-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/reports?tab=delivery">Reports</Link>
        <span>›</span>
        <strong>Customer Reports</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="users" size={16} /></span>
            Customer Reports
          </h1>
          <p>This report section is ready for detailed analytics.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <div className="custrpt-dd-wrap">
            <button
              className="btn btn-purple btn-small custrpt-create-dd"
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
              <div className="custrpt-dd" onClick={(e) => e.stopPropagation()}>
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

      <section className="pts-stats six custrpt-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Customers</div>
            <div className="prod-stat-n blue">{fmtNum(stats.totalCustomers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalCustomersDelta)}`}>
              {deltaArrow(stats.totalCustomersDelta)} {Math.abs(stats.totalCustomersDelta).toFixed(1)}% {stats.totalCustomersHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">New Customers</div>
            <div className="prod-stat-n green">{fmtNum(stats.newCustomers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.newCustomersDelta)}`}>
              {deltaArrow(stats.newCustomersDelta)} {Math.abs(stats.newCustomersDelta).toFixed(1)}% {stats.newCustomersHint}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="usersPlus" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Customers</div>
            <div className="prod-stat-n blue">{fmtNum(stats.activeCustomers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.activeCustomersDelta)}`}>
              {deltaArrow(stats.activeCustomersDelta)} {Math.abs(stats.activeCustomersDelta).toFixed(1)}% {stats.activeCustomersHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Repeat Customers</div>
            <div className="prod-stat-n orange">{fmtNum(stats.repeatCustomers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.repeatCustomersDelta)}`}>
              {deltaArrow(stats.repeatCustomersDelta)} {Math.abs(stats.repeatCustomersDelta).toFixed(1)}% {stats.repeatCustomersHint}
            </div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="refresh" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Inactive Customers</div>
            <div className="prod-stat-n red">{fmtNum(stats.inactiveCustomers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.inactiveCustomersDelta)}`}>
              {deltaArrow(stats.inactiveCustomersDelta)} {Math.abs(stats.inactiveCustomersDelta).toFixed(1)}% {stats.inactiveCustomersHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="ban" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Customer Spend (KES)</div>
            <div className="prod-stat-n purple">{fmtKes(stats.avgSpend)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.avgSpendDelta)}`}>
              {deltaArrow(stats.avgSpendDelta)} {Math.abs(stats.avgSpendDelta).toFixed(1)}% {stats.avgSpendHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="wallet" size={16} /></div>
        </article>
      </section>

      <section className="card prod-filters">
        <form
          className="prod-filter-row custrpt-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load({ page: 1 });
          }}
        >
          <div className="custrpt-dates">
            <Icon name="calendar" size={14} />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <select value={segmentF} onChange={(e) => { setSegmentF(e.target.value); setPage(1); }}>
            <option value="">All Customer Segments</option>
            {(data.filters?.segments || []).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={locationF} onChange={(e) => { setLocationF(e.target.value); setPage(1); }}>
            <option value="">All Locations</option>
            {(data.filters?.locations || []).map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {(data.filters?.statuses || []).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
            <option value="">All Channels</option>
            {(data.filters?.channels || []).map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-small" type="submit">
            <Icon name="filter" size={14} /> Filters
          </button>
          <button className="link-reset" type="button" onClick={reset}>Reset</button>
        </form>
      </section>

      <div className="custrpt-charts">
        <section className="card pf-card custrpt-overview">
          <h2><Icon name="trend" size={14} /> Customer Growth</h2>
          <GrowthChart data={data.growth} />
        </section>
        <section className="card pf-card">
          <h2><Icon name="chart" size={14} /> Customers by Segment</h2>
          <Donut parts={data.segmentDonut} total={stats.totalCustomers} />
        </section>
        <section className="card pf-card">
          <h2><Icon name="pin" size={14} /> Customers by Location (Top 5)</h2>
          <ul className="custrpt-bars">
            {(data.locations || []).map((loc) => (
              <li key={loc.key}>
                <div className="custrpt-bar-meta">
                  <span>{loc.name}</span>
                  <b>{Number(loc.pct).toFixed(1)}%</b>
                </div>
                <div className="custrpt-bar-track">
                  <i style={{ width: `${loc.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="custrpt-bottom">
        <section className="card custrpt-table-card">
          <div className="custrpt-table-head">
            <h2>Top Customers</h2>
          </div>
          <div className="prod-table-wrap custrpt-scroll">
            <table className="table prod-table custrpt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Email / Phone</th>
                  <th>Segment</th>
                  <th>Total Orders</th>
                  <th>Total Spend (KES)</th>
                  <th>Avg. Order (KES)</th>
                  <th>Last Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <div className="prod-cell custrpt-customer">
                        <img src={r.avatar} alt="" />
                        <strong>{r.name}</strong>
                      </div>
                    </td>
                    <td>
                      <div>{r.email}</div>
                      <div className="muted custrpt-sub">{r.phone}</div>
                    </td>
                    <td><span className={`st-pill ${segmentCls(r.segment)}`}>{r.segmentLabel}</span></td>
                    <td><strong>{fmtNum(r.orders)}</strong></td>
                    <td><strong>{fmtNum(r.spend)}</strong></td>
                    <td>{fmtNum(r.avgOrder)}</td>
                    <td>{r.lastOrder}</td>
                    <td>
                      <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                        <button type="button" title="View" onClick={(e) => openCustomer(r, e)}>
                          <Icon name="eye" size={14} />
                        </button>
                        <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                          <button type="button" onClick={(e) => openCustomer(r, e)}>View details</button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu(null);
                              navigate(`/customers?q=${encodeURIComponent(r.name)}`);
                            }}
                          >
                            Open customer
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu(null);
                              if (navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(r.email).catch(() => {});
                              }
                              setToast(`Copied email for “${r.name}”`);
                            }}
                          >
                            Copy email
                          </button>
                        </DeliveryRowMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="9" className="muted">No customers match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} customers</span>
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

        <aside className="custrpt-side">
          <section className="card pf-card">
            <h2><Icon name="users" size={14} /> Customer Summary</h2>
            <ul className="custrpt-summary">
              {(data.summary || []).map((s) => (
                <li key={s.key}>
                  <span className="muted">{s.label}</span>
                  <strong>{summaryValue(s)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bulb" size={14} /> Customer Insights</h2>
            <ul className="custrpt-insights">
              {(data.insights || []).map((ins) => (
                <li key={ins.key}>
                  <span className={`custrpt-ins-ico ${ins.tone === "down" ? "down" : ""}`}>
                    <Icon name={ins.icon} size={14} />
                  </span>
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
          subtitle={`${viewing.email} · ${viewing.phone}`}
          statusNode={<span className={`st-pill ${segmentCls(viewing.segment)}`}>{viewing.segmentLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <button
              className="btn btn-purple btn-small"
              type="button"
              onClick={() => {
                setViewing(null);
                navigate(`/customers?q=${encodeURIComponent(viewing.name)}`);
              }}
            >
              Open customer
            </button>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Location", value: viewing.location },
              { label: "Channel", value: viewing.channelLabel },
              { label: "Total Orders", value: <strong>{fmtNum(viewing.orders)}</strong> },
              { label: "Total Spend", value: <strong>{fmtKes(viewing.spend)}</strong> },
              { label: "Avg. Order", value: fmtKes(viewing.avgOrder) },
              { label: "Last Order", value: viewing.lastOrder },
              { label: "Status", value: viewing.statusLabel },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
