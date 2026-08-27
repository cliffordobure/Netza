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

function statusCls(status) {
  if (status === "delivered") return "ordrpt-st-delivered";
  if (status === "shipped") return "ordrpt-st-shipped";
  if (status === "processing") return "ordrpt-st-processing";
  if (status === "pending") return "ordrpt-st-pending";
  if (status === "cancelled") return "ordrpt-st-cancelled";
  return "ordrpt-st-pending";
}

function payCls(payment) {
  if (payment === "mpesa") return "pay-m-mpesa";
  if (payment === "card") return "pay-m-card";
  if (payment === "cash") return "pay-m-cash";
  return "pay-m-bank";
}

function channelIcon(channel) {
  if (channel === "mobile") return "phone";
  if (channel === "web") return "globe";
  if (channel === "pos") return "box";
  return "phone";
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap ordrpt-donut">
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
      <ul className="donut-legend ordrpt-legend">
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

function OverviewChart({ data }) {
  const labels = data?.labels || [];
  const series = [
    { key: "total", label: "Total Orders", color: "#6c5dd3", values: data?.total || [] },
    { key: "completed", label: "Completed", color: "#16a34a", values: data?.completed || [] },
    { key: "pending", label: "Pending", color: "#ea580c", values: data?.pending || [] },
    { key: "cancelled", label: "Cancelled", color: "#dc2626", values: data?.cancelled || [] },
  ];
  const w = 520;
  const h = 220;
  const pad = { t: 16, r: 16, b: 28, l: 36 };
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1000);
  const min = 0;
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  function pts(values) {
    return values
      .map((v, i) => {
        const x = pad.l + (i / Math.max(values.length - 1, 1)) * iw;
        const y = pad.t + ih - ((v - min) / (max - min || 1)) * ih;
        return `${x},${y}`;
      })
      .join(" ");
  }

  const yTicks = [0, 250, 500, 750, 1000];

  return (
    <div className="ordrpt-line">
      <svg viewBox={`0 0 ${w} ${h}`} className="ordrpt-line-svg" role="img" aria-label="Orders overview chart">
        {yTicks.map((t) => {
          const y = pad.t + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" className="ordrpt-axis">{t}</text>
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
            <text key={l} x={x} y={h - 8} textAnchor="middle" className="ordrpt-axis">{l}</text>
          );
        })}
      </svg>
      <div className="ordrpt-line-legend">
        {series.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} /> {s.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function OrderReports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [statusF, setStatusF] = useState("");
  const [paymentF, setPaymentF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [zoneF, setZoneF] = useState("");
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
      status: next.status ?? statusF,
      payment: next.payment ?? paymentF,
      channel: next.channel ?? channelF,
      zone: next.zone ?? zoneF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.status) p.set("status", vals.status);
    if (vals.payment) p.set("payment", vals.payment);
    if (vals.channel) p.set("channel", vals.channel);
    if (vals.zone) p.set("zone", vals.zone);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/order-reports?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load order reports."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, paymentF, channelF, zoneF]);

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
    setStatusF("");
    setPaymentF("");
    setChannelF("");
    setZoneF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ status: "", payment: "", channel: "", zone: "", page: 1 });
  }

  function exportCsv() {
    const rows = data?.orders || [];
    const header = ["#", "Order ID", "Customer", "Phone", "Date", "Time", "Status", "Amount", "Payment", "Channel"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        r.orderId,
        JSON.stringify(r.customerName),
        JSON.stringify(r.customerPhone),
        JSON.stringify(r.date),
        JSON.stringify(r.time),
        r.statusLabel,
        r.amount,
        r.paymentLabel,
        r.channelLabel,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "order-reports.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setToast("Order report exported");
  }

  if (!data) {
    return (
      <div className="ordrpt-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/reports?tab=delivery">Reports</Link>
          <span>›</span>
          <strong>Order Reports</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading order reports…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.orders || [];
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
    <div className="ordrpt-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/reports?tab=delivery">Reports</Link>
        <span>›</span>
        <strong>Order Reports</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="chart" size={16} /></span>
            Order Reports
          </h1>
          <p>Analyze order volume, fulfillment status, channels and revenue performance.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <div className="ordrpt-dd-wrap">
            <button
              className="btn btn-purple btn-small ordrpt-create-dd"
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
              <div className="ordrpt-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Custom report builder coming soon"); }}>Build Custom Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Scheduled report created"); }}>Schedule Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); navigate("/reports?tab=delivery"); }}>Back to Delivery Reports</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five ordrpt-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Orders</div>
            <div className="prod-stat-n purple">{fmtNum(stats.totalOrders)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalOrdersDelta)}`}>
              {deltaArrow(stats.totalOrdersDelta)} {Math.abs(stats.totalOrdersDelta).toFixed(1)}% {stats.totalOrdersHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Completed Orders</div>
            <div className="prod-stat-n green">{fmtNum(stats.completed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.completedDelta)}`}>
              {deltaArrow(stats.completedDelta)} {Math.abs(stats.completedDelta).toFixed(1)}% {stats.completedHint}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Pending Orders</div>
            <div className="prod-stat-n orange">{fmtNum(stats.pending)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.pendingDelta)}`}>
              {deltaArrow(stats.pendingDelta)} {Math.abs(stats.pendingDelta).toFixed(1)}% {stats.pendingHint}
            </div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Cancelled Orders</div>
            <div className="prod-stat-n red">{fmtNum(stats.cancelled)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.cancelledDelta)}`}>
              {deltaArrow(stats.cancelledDelta)} {Math.abs(stats.cancelledDelta).toFixed(1)}% {stats.cancelledHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Revenue (KES)</div>
            <div className="prod-stat-n purple">{fmtKes(stats.revenue)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.revenueDelta)}`}>
              {deltaArrow(stats.revenueDelta)} {Math.abs(stats.revenueDelta).toFixed(1)}% {stats.revenueHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="wallet" size={16} /></div>
        </article>
      </section>

      <section className="card prod-filters">
        <form
          className="prod-filter-row ordrpt-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load({ page: 1 });
          }}
        >
          <div className="ordrpt-dates">
            <Icon name="calendar" size={14} />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {(data.filters?.statuses || []).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={paymentF} onChange={(e) => { setPaymentF(e.target.value); setPage(1); }}>
            <option value="">All Payment Methods</option>
            {(data.filters?.payments || []).map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
            <option value="">All Channels</option>
            {(data.filters?.channels || []).map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select value={zoneF} onChange={(e) => { setZoneF(e.target.value); setPage(1); }}>
            <option value="">All Zones</option>
            {(data.filters?.zones || []).map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-small" type="submit">
            <Icon name="filter" size={14} /> Filters
          </button>
          <button className="link-reset" type="button" onClick={reset}>Reset</button>
        </form>
      </section>

      <div className="ordrpt-charts">
        <section className="card pf-card ordrpt-overview">
          <h2><Icon name="trend" size={14} /> Orders Overview</h2>
          <OverviewChart data={data.ordersOverview} />
        </section>
        <section className="card pf-card">
          <h2><Icon name="chart" size={14} /> Orders by Status</h2>
          <Donut parts={data.statusDonut} total={stats.totalOrders} />
        </section>
        <section className="card pf-card">
          <h2><Icon name="globe" size={14} /> Orders by Channel</h2>
          <Donut parts={data.channelDonut} total={stats.totalOrders} />
        </section>
      </div>

      <div className="ordrpt-bottom">
        <section className="card ordrpt-table-card">
          <div className="ordrpt-table-head">
            <h2>Top Orders</h2>
          </div>
          <div className="prod-table-wrap ordrpt-scroll">
            <table className="table prod-table ordrpt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount (KES)</th>
                  <th>Payment</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <button className="link-reset ordrpt-id" type="button" onClick={() => setViewing(r)}>
                        {r.orderId}
                      </button>
                    </td>
                    <td>
                      <div className="prod-cell ordrpt-customer">
                        <img src={r.customerAvatar} alt="" />
                        <div>
                          <strong>{r.customerName}</strong>
                          <div className="muted">{r.customerPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{r.date}</div>
                      <div className="muted ordrpt-sub">{r.time}</div>
                    </td>
                    <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                    <td><strong>{fmtNum(r.amount)}</strong></td>
                    <td><span className={`pay-method ${payCls(r.payment)}`}>{r.paymentLabel}</span></td>
                    <td>
                      <span className="ordrpt-channel">
                        <Icon name={channelIcon(r.channel)} size={12} />
                        {r.channelLabel}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="8" className="muted">No orders match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} orders</span>
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

        <aside className="ordrpt-side">
          <section className="card pf-card">
            <h2><Icon name="wallet" size={14} /> Sales Summary</h2>
            <ul className="ordrpt-summary">
              {(data.salesSummary || []).map((s) => (
                <li key={s.key}>
                  <span className="muted">{s.label}</span>
                  <strong>{fmtNum(s.value)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bulb" size={14} /> Order Insights</h2>
            <ul className="ordrpt-insights">
              {(data.insights || []).map((ins) => (
                <li key={ins.key}>
                  <span className="ordrpt-ins-ico"><Icon name={ins.icon} size={14} /></span>
                  <span>{ins.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {viewing && (
        <DeliveryDetailModal
          title={viewing.orderId}
          subtitle={`${viewing.date} · ${viewing.time}`}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <button
              className="btn btn-purple btn-small"
              type="button"
              onClick={() => {
                setViewing(null);
                navigate(`/orders?q=${encodeURIComponent(viewing.orderId)}`);
              }}
            >
              Open order
            </button>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Customer", value: (<><strong>{viewing.customerName}</strong><span className="muted">{viewing.customerPhone}</span></>) },
              { label: "Amount", value: <strong>{fmtKes(viewing.amount)}</strong> },
              { label: "Payment", value: viewing.paymentLabel },
              { label: "Channel", value: viewing.channelLabel },
              { label: "Zone", value: viewing.zone },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
