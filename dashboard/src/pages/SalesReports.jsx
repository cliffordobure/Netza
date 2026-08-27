import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

function Donut({ parts, totalLabel, centerValue }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap slsrpt-donut">
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
        <text x="70" y="58" textAnchor="middle" className="donut-sub">KES</text>
        <text x="70" y="74" textAnchor="middle" className="donut-total slsrpt-donut-val">{centerValue}</text>
        <text x="70" y="88" textAnchor="middle" className="donut-sub">{totalLabel}</text>
      </svg>
      <ul className="donut-legend slsrpt-legend">
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

function LineChart({ data }) {
  const labels = data?.labels || [];
  const revenue = data?.revenue || [];
  const orders = data?.orders || [];
  const w = 220;
  const h = 120;
  const pad = 18;
  const maxR = Math.max(...revenue, 1);
  const maxO = Math.max(...orders, 1);

  function pts(values, max) {
    return values
      .map((v, i) => {
        const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="slsrpt-line">
      <svg viewBox={`0 0 ${w} ${h}`} className="slsrpt-line-svg" aria-hidden="true">
        {[0, 0.5, 1].map((t) => {
          const y = h - pad - t * (h - pad * 2);
          return <line key={t} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />;
        })}
        <polyline fill="none" stroke="#6c5dd3" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={pts(revenue, maxR)} />
        <polyline fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={pts(orders, maxO)} />
      </svg>
      <div className="slsrpt-line-legend">
        <span><i style={{ background: "#6c5dd3" }} /> Revenue</span>
        <span><i style={{ background: "#16a34a" }} /> Orders</span>
      </div>
      <div className="slsrpt-line-labels">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export default function SalesReports() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [channelF, setChannelF] = useState("");
  const [paymentF, setPaymentF] = useState("");
  const [zoneF, setZoneF] = useState("");
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
      q: next.q ?? q,
      channel: next.channel ?? channelF,
      payment: next.payment ?? paymentF,
      zone: next.zone ?? zoneF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.channel) p.set("channel", vals.channel);
    if (vals.payment) p.set("payment", vals.payment);
    if (vals.zone) p.set("zone", vals.zone);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/sales-reports?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load sales reports."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, channelF, paymentF, zoneF]);

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

  function search(e) {
    e.preventDefault();
    setPage(1);
    load({ q, page: 1 });
  }

  function reset() {
    setQ("");
    setChannelF("");
    setPaymentF("");
    setZoneF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", channel: "", payment: "", zone: "", page: 1 });
  }

  function triggerCsv(filename, lines) {
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function downloadChannel(row, e) {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    try {
      const lines = [
        "Field,Value",
        `Sales Channel,${JSON.stringify(row.channel || "")}`,
        `Orders,${row.orders ?? 0}`,
        `Revenue (KES),${row.revenue ?? 0}`,
        `Discounts (KES),${row.discounts ?? 0}`,
        `Net Revenue (KES),${row.netRevenue ?? 0}`,
        `Profit (KES),${row.profit ?? 0}`,
        `Profit Margin,${Number(row.margin || 0).toFixed(1)}%`,
        `Growth,${Number(row.growth || 0).toFixed(1)}%`,
      ];
      triggerCsv(`${String(row.channel || "sales-channel").replace(/[^\w\-]+/g, "-").toLowerCase()}.csv`, lines);
      setMenu(null);
      setToast(`Downloaded “${row.channel}”`);
    } catch (err) {
      setError(err.message || "Download failed.");
    }
  }

  function openChannel(row, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(row);
  }

  if (!data) {
    return (
      <div className="slsrpt-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/reports?tab=delivery">Reports</Link>
          <span>›</span>
          <strong>Sales</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading sales reports…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.channels || [];
  const totals = data.totals || {};
  const total = data.total || 0;
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  function exportAll() {
    const header = ["#", "Sales Channel", "Orders", "Revenue", "Discounts", "Net Revenue", "Profit", "Profit Margin", "Growth"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        JSON.stringify(r.channel || ""),
        r.orders ?? 0,
        r.revenue ?? 0,
        r.discounts ?? 0,
        r.netRevenue ?? 0,
        r.profit ?? 0,
        `${Number(r.margin || 0).toFixed(1)}%`,
        `${Number(r.growth || 0).toFixed(1)}%`,
      ].join(","));
    }
    triggerCsv("sales-summary.csv", lines);
    setToast("Exported sales summary");
  }

  return (
    <div className="slsrpt-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/reports?tab=delivery">Reports</Link>
        <span>›</span>
        <strong>Sales</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="chart" size={16} /></span>
            Sales Reports
          </h1>
          <p>Track sales performance, revenue, trends and product popularity.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportAll}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <div className="slsrpt-dd-wrap">
            <button
              className="btn btn-purple btn-small slsrpt-create-dd"
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
              <div className="slsrpt-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Custom report builder coming soon"); }}>Build Custom Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Scheduled report created"); }}>Schedule Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Template gallery opening soon"); }}>From Template</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six slsrpt-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Revenue</div>
            <div className="prod-stat-n green">{fmtKes(stats.revenue)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.revenueDelta)}`}>
              {deltaArrow(stats.revenueDelta)} {Math.abs(stats.revenueDelta).toFixed(1)}% {stats.revenueHint}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="bag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Orders</div>
            <div className="prod-stat-n purple">{fmtNum(stats.orders)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.ordersDelta)}`}>
              {deltaArrow(stats.ordersDelta)} {Math.abs(stats.ordersDelta).toFixed(1)}% {stats.ordersHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Average Order Value</div>
            <div className="prod-stat-n orange">{fmtKes(stats.aov)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.aovDelta)}`}>
              {deltaArrow(stats.aovDelta)} {Math.abs(stats.aovDelta).toFixed(1)}% {stats.aovHint}
            </div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="cart" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Discounts</div>
            <div className="prod-stat-n red">{fmtKes(stats.discounts)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.discountsDelta)}`}>
              {deltaArrow(stats.discountsDelta)} {Math.abs(stats.discountsDelta).toFixed(1)}% {stats.discountsHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="tag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Gross Profit</div>
            <div className="prod-stat-n blue">{fmtKes(stats.grossProfit)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.grossProfitDelta)}`}>
              {deltaArrow(stats.grossProfitDelta)} {Math.abs(stats.grossProfitDelta).toFixed(1)}% {stats.grossProfitHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="bars" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Profit Margin</div>
            <div className="prod-stat-n green">{Number(stats.margin).toFixed(1)}%</div>
            <div className={`cat-stat-hint ${deltaCls(stats.marginDelta)}`}>
              {deltaArrow(stats.marginDelta)} {Math.abs(stats.marginDelta).toFixed(1)}% {stats.marginHint}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="percent" size={16} /></div>
        </article>
      </section>

      <div className="slsrpt-layout">
        <div className="slsrpt-main">
          <section className="card prod-filters">
            <form className="prod-filter-row slsrpt-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sales reports..." />
              </div>
              <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
                <option value="">All Sales Channels</option>
                {(data.filters?.channels || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={paymentF} onChange={(e) => { setPaymentF(e.target.value); setPage(1); }}>
                <option value="">All Payment Methods</option>
                {(data.filters?.payments || []).map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select value={zoneF} onChange={(e) => { setZoneF(e.target.value); setPage(1); }}>
                <option value="">All Zones</option>
                {(data.filters?.zones || []).map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <div className="slsrpt-dates">
                <Icon name="calendar" size={14} />
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="muted">–</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          </section>

          <section className="card slsrpt-table-card">
            <div className="slsrpt-table-head">
              <h2>Sales Summary</h2>
            </div>
            <div className="prod-table-wrap slsrpt-scroll">
              <table className="table prod-table slsrpt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sales Channel</th>
                    <th>Orders</th>
                    <th>Revenue (KES)</th>
                    <th>Discounts (KES)</th>
                    <th>Net Revenue (KES)</th>
                    <th>Profit (KES)</th>
                    <th>Profit Margin</th>
                    <th>Growth</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td><strong>{r.channel}</strong></td>
                      <td>{fmtNum(r.orders)}</td>
                      <td><strong>{fmtNum(r.revenue)}</strong></td>
                      <td>{fmtNum(r.discounts)}</td>
                      <td>{fmtNum(r.netRevenue)}</td>
                      <td>{fmtNum(r.profit)}</td>
                      <td>{Number(r.margin).toFixed(1)}%</td>
                      <td>
                        <span className={`slsrpt-growth ${deltaCls(r.growth)}`}>
                          {deltaArrow(r.growth)} {Math.abs(r.growth).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                          <button type="button" title="View channel" onClick={(e) => openChannel(r, e)}>
                            <Icon name="eye" size={14} />
                          </button>
                          <button type="button" title="Download CSV" onClick={(e) => downloadChannel(r, e)}>
                            <Icon name="download" size={14} />
                          </button>
                          <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length}>
                            <button type="button" onClick={(e) => openChannel(r, e)}>View details</button>
                            <button type="button" onClick={(e) => downloadChannel(r, e)}>Download CSV</button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenu(null);
                                if (navigator.clipboard?.writeText) {
                                  navigator.clipboard.writeText(`${window.location.origin}/reports?tab=sales&channel=${encodeURIComponent(r.channel)}`).catch(() => {});
                                }
                                setToast(`Share link copied for “${r.channel}”`);
                              }}
                            >
                              Copy share link
                            </button>
                          </DeliveryRowMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length > 0 && (
                    <tr className="slsrpt-total-row">
                      <td />
                      <td><strong>Total</strong></td>
                      <td><strong>{fmtNum(totals.orders)}</strong></td>
                      <td><strong>{fmtNum(totals.revenue)}</strong></td>
                      <td><strong>{fmtNum(totals.discounts)}</strong></td>
                      <td><strong>{fmtNum(totals.netRevenue)}</strong></td>
                      <td><strong>{fmtNum(totals.profit)}</strong></td>
                      <td><strong>{Number(totals.margin).toFixed(1)}%</strong></td>
                      <td />
                      <td />
                    </tr>
                  )}
                  {rows.length === 0 && (
                    <tr><td colSpan="10" className="muted">No sales channels match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} sales channels</span>
              <span />
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

        <aside className="slsrpt-side">
          <section className="card pf-card">
            <h2><Icon name="trend" size={14} /> Sales Trend</h2>
            <LineChart data={data.salesTrend} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="bars" size={14} /> Top Selling Categories</h2>
            <ul className="slsrpt-bars">
              {(data.topCategories || []).map((c) => (
                <li key={c.name}>
                  <div className="slsrpt-bar-meta">
                    <span>{c.name}</span>
                    <b>{fmtKes(c.revenue)} · {Number(c.pct).toFixed(1)}%</b>
                  </div>
                  <div className="slsrpt-bar-track">
                    <i style={{ width: `${c.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="wallet" size={14} /> Sales by Payment Method</h2>
            <Donut
              parts={data.paymentDonut}
              totalLabel="Total"
              centerValue={fmtNum(stats.revenue)}
            />
          </section>
        </aside>
      </div>

      {data.insight && (
        <footer className="card slsrpt-insight">
          <div className="slsrpt-insight-body">
            <span className="slsrpt-insight-ico"><Icon name="star" size={16} /></span>
            <p>{data.insight}</p>
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(rows[0] || null)}>
            <Icon name="chart" size={14} /> View Detailed Analysis
          </button>
        </footer>
      )}

      {viewing && (
        <DeliveryDetailModal
          title={viewing.channel}
          subtitle="Sales channel summary"
          statusNode={(
            <span className={`slsrpt-growth ${deltaCls(viewing.growth)}`}>
              {deltaArrow(viewing.growth)} {Math.abs(viewing.growth).toFixed(1)}% growth
            </span>
          )}
          onClose={() => setViewing(null)}
          actions={(
            <button className="btn btn-purple btn-small" type="button" onClick={(e) => downloadChannel(viewing, e)}>
              <Icon name="download" size={14} /> Download CSV
            </button>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Channel", value: <strong>{viewing.channel}</strong> },
              { label: "Orders", value: fmtNum(viewing.orders) },
              { label: "Revenue", value: fmtKes(viewing.revenue) },
              { label: "Discounts", value: fmtKes(viewing.discounts) },
              { label: "Net revenue", value: fmtKes(viewing.netRevenue) },
              { label: "Profit", value: fmtKes(viewing.profit) },
              { label: "Profit margin", value: `${Number(viewing.margin).toFixed(1)}%` },
              { label: "Growth", value: `${Number(viewing.growth).toFixed(1)}%` },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
