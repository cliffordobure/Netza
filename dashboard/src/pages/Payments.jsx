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

function statusCls(status) {
  if (status === "success") return "pay-st-success";
  if (status === "pending") return "pay-st-pending";
  if (status === "refunded") return "pay-st-refunded";
  if (status === "failed") return "pay-st-failed";
  return "pay-st-pending";
}

function methodCls(method) {
  if (method === "mpesa") return "pay-m-mpesa";
  if (method === "card") return "pay-m-card";
  if (method === "cash") return "pay-m-cash";
  if (method === "bank") return "pay-m-bank";
  return "pay-m-mpesa";
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap pay-donut">
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
        <text x="70" y="74" textAnchor="middle" className="donut-total pay-donut-val">{fmtNum(total)}</text>
        <text x="70" y="90" textAnchor="middle" className="donut-sub">Total</text>
      </svg>
      <ul className="donut-legend pay-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{fmtKes(p.value)}</b>
            <em>{Number(p.pct).toFixed(1)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_LABELS = {
  success: "Success",
  pending: "Pending",
  refunded: "Refunded",
  failed: "Failed",
};

export default function Payments() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [methodF, setMethodF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      method: next.method ?? methodF,
      channel: next.channel ?? channelF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.method) p.set("method", vals.method);
    if (vals.channel) p.set("channel", vals.channel);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/payments?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load payments."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, methodF, channelF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setRecordOpen(false);
      setSettleOpen(false);
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
    setStatusF("");
    setMethodF("");
    setChannelF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", status: "", method: "", channel: "", page: 1 });
  }

  function patchPayment(row, next) {
    const updated = {
      ...row,
      ...next,
      statusLabel: next.status ? (STATUS_LABELS[next.status] || next.status) : row.statusLabel,
    };
    setData((d) => ({
      ...d,
      payments: (d.payments || []).map((r) => (r.id === row.id ? updated : r)),
    }));
    setViewing((v) => (v && v.id === row.id ? updated : v));
    setMenu(null);
    return updated;
  }

  function openPayment(row, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(row);
  }

  function downloadPayment(row, e) {
    e?.stopPropagation?.();
    const lines = [
      "Field,Value",
      `Payment ID,${row.paymentId}`,
      `Order ID,${row.orderId}`,
      `Customer,${JSON.stringify(row.customerName)}`,
      `Phone,${JSON.stringify(row.customerPhone)}`,
      `Amount,${row.amount}`,
      `Method,${row.methodLabel}`,
      `Channel,${row.channelLabel}`,
      `Status,${row.statusLabel}`,
      `Date,${row.date} ${row.time}`,
      `Reference,${row.reference}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.paymentId}.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setMenu(null);
    setToast(`Downloaded ${row.paymentId}`);
  }

  function exportAll() {
    const rows = data?.payments || [];
    const header = ["#", "Payment ID", "Order ID", "Customer", "Amount", "Method", "Channel", "Status", "Date", "Time"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        r.paymentId,
        r.orderId,
        JSON.stringify(r.customerName),
        r.amount,
        r.methodLabel,
        r.channelLabel,
        r.statusLabel,
        JSON.stringify(r.date),
        JSON.stringify(r.time),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setToast("Payments exported");
  }

  if (!data) {
    return (
      <div className="pay-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <strong>Payments</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading payments…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.payments || [];
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
    <div className="pay-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <strong>Payments</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="wallet" size={16} /></span>
            Payments
          </h1>
          <p>Track and manage all incoming and outgoing payments in one place.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportAll}>
            <Icon name="download" size={14} /> Export Payments
          </button>
          <div className="pay-dd-wrap">
            <button
              className="btn btn-ghost btn-small pay-dd-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSettleOpen((v) => !v);
                setRecordOpen(false);
              }}
            >
              Settlement Report <Icon name="chevron" size={14} />
            </button>
            {settleOpen && (
              <div className="pay-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setSettleOpen(false); setToast("Daily settlement report ready"); }}>Daily Settlement</button>
                <button type="button" onClick={() => { setSettleOpen(false); setToast("Weekly settlement report ready"); }}>Weekly Settlement</button>
                <button type="button" onClick={() => { setSettleOpen(false); setToast("Monthly settlement report ready"); }}>Monthly Settlement</button>
              </div>
            )}
          </div>
          <div className="pay-dd-wrap">
            <button
              className="btn btn-purple btn-small pay-dd-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRecordOpen((v) => !v);
                setSettleOpen(false);
              }}
            >
              <Icon name="plus" size={14} /> Record Payment <Icon name="chevron" size={14} />
            </button>
            {recordOpen && (
              <div className="pay-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setRecordOpen(false); setToast("Manual payment form opened"); }}>Manual Payment</button>
                <button type="button" onClick={() => { setRecordOpen(false); navigate("/orders"); }}>From Order</button>
                <button type="button" onClick={() => { setRecordOpen(false); setToast("Bulk import started"); }}>Bulk Import</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six pay-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Payments</div>
            <div className="prod-stat-n purple">{fmtKes(stats.total)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalDelta)}`}>
              {deltaArrow(stats.totalDelta)} {Math.abs(stats.totalDelta).toFixed(1)}% {stats.totalHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="wallet" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Successful Payments</div>
            <div className="prod-stat-n green">{fmtKes(stats.successful)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.successfulDelta)}`}>
              {deltaArrow(stats.successfulDelta)} {Math.abs(stats.successfulDelta).toFixed(1)}% {stats.successfulHint}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Pending Payments</div>
            <div className="prod-stat-n orange">{fmtKes(stats.pending)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.pendingDelta)}`}>
              {deltaArrow(stats.pendingDelta)} {Math.abs(stats.pendingDelta).toFixed(1)}% {stats.pendingHint}
            </div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Refunds</div>
            <div className="prod-stat-n red">{fmtKes(stats.refunds)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.refundsDelta)}`}>
              {deltaArrow(stats.refundsDelta)} {Math.abs(stats.refundsDelta).toFixed(1)}% {stats.refundsHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="refresh" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Failed Payments</div>
            <div className="prod-stat-n red">{fmtKes(stats.failed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.failedDelta)}`}>
              {deltaArrow(stats.failedDelta)} {Math.abs(stats.failedDelta).toFixed(1)}% {stats.failedHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Payment Value</div>
            <div className="prod-stat-n blue">{fmtKes(stats.avgValue)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.avgDelta)}`}>
              {deltaArrow(stats.avgDelta)} {Math.abs(stats.avgDelta).toFixed(1)}% {stats.avgHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="chart" size={16} /></div>
        </article>
      </section>

      <div className="pay-layout">
        <div className="pay-main">
          <section className="card prod-filters">
            <form className="prod-filter-row pay-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search payments..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {(data.filters?.statuses || []).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select value={methodF} onChange={(e) => { setMethodF(e.target.value); setPage(1); }}>
                <option value="">All Payment Methods</option>
                {(data.filters?.methods || []).map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
                <option value="">All Channels</option>
                {(data.filters?.channels || []).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <div className="pay-dates">
                <Icon name="calendar" size={14} />
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="muted">–</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filters
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          </section>

          <section className="card pay-table-card">
            <div className="prod-table-wrap pay-scroll">
              <table className="table prod-table pay-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Payment ID</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount (KES)</th>
                    <th>Method</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Date &amp; Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td>
                        <button className="link-reset pay-id" type="button" onClick={(e) => openPayment(r, e)}>
                          {r.paymentId}
                        </button>
                      </td>
                      <td>
                        <button
                          className="link-reset pay-id muted"
                          type="button"
                          onClick={() => navigate(`/orders?q=${encodeURIComponent(r.orderId)}`)}
                        >
                          {r.orderId}
                        </button>
                      </td>
                      <td>
                        <div className="prod-cell pay-customer">
                          <img src={r.customerAvatar} alt="" />
                          <div>
                            <strong>{r.customerName}</strong>
                            <div className="muted">{r.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td><strong>{fmtNum(r.amount)}</strong></td>
                      <td><span className={`pay-method ${methodCls(r.method)}`}>{r.methodLabel}</span></td>
                      <td>{r.channelLabel}</td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div>{r.date}</div>
                        <div className="muted pay-sub">{r.time}</div>
                      </td>
                      <td>
                        <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                          <button type="button" title="View" onClick={(e) => openPayment(r, e)}>
                            <Icon name="eye" size={14} />
                          </button>
                          <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length}>
                            <button type="button" onClick={(e) => openPayment(r, e)}>View details</button>
                            <button type="button" onClick={(e) => downloadPayment(r, e)}>Download receipt</button>
                            <button type="button" onClick={() => { navigate(`/orders?q=${encodeURIComponent(r.orderId)}`); setMenu(null); }}>
                              Open order
                            </button>
                            {r.status === "pending" && (
                              <button type="button" onClick={() => { patchPayment(r, { status: "success" }); setToast(`${r.paymentId} marked successful`); }}>
                                Mark successful
                              </button>
                            )}
                            {r.status === "success" && (
                              <button type="button" onClick={() => { patchPayment(r, { status: "refunded" }); setToast(`Refund issued for ${r.paymentId}`); }}>
                                Issue refund
                              </button>
                            )}
                            {r.status !== "failed" && r.status !== "refunded" && (
                              <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                  if (!confirm(`Mark ${r.paymentId} as failed?`)) { setMenu(null); return; }
                                  patchPayment(r, { status: "failed" });
                                  setToast(`${r.paymentId} marked failed`);
                                }}
                              >
                                Mark failed
                              </button>
                            )}
                          </DeliveryRowMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="10" className="muted">No payments match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} payments</span>
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
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </footer>
          </section>
        </div>

        <aside className="pay-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Payment Overview</h2>
            <Donut parts={data.statusDonut} total={stats.total} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="bars" size={14} /> Payments by Method</h2>
            <ul className="pay-bars">
              {(data.methods || []).map((m) => (
                <li key={m.key}>
                  <div className="pay-bar-meta">
                    <span>{m.name}</span>
                    <b>{Number(m.pct).toFixed(1)}%</b>
                  </div>
                  <div className="pay-bar-track">
                    <i style={{ width: `${m.pct}%`, background: m.color }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="clock" size={14} /> Recent Activities</h2>
            <ul className="pay-activity">
              {(data.activities || []).map((a) => (
                <li key={a.id} className={`tone-${a.tone}`}>
                  <span className="pay-act-dot" />
                  <div>
                    <p>{a.text}</p>
                    <div className="pay-act-meta">
                      <strong>{fmtKes(a.amount)}</strong>
                      <span className="muted">{a.when}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bolt" size={14} /> Quick Actions</h2>
            <div className="pay-quick">
              <button type="button" onClick={() => setToast("Record payment form opened")}>
                <Icon name="plus" size={16} />
                <span>Record Payment</span>
              </button>
              <button type="button" onClick={() => setToast("Issue refund form opened")}>
                <Icon name="refresh" size={16} />
                <span>Issue Refund</span>
              </button>
              <button type="button" onClick={exportAll}>
                <Icon name="download" size={16} />
                <span>Download Statement</span>
              </button>
              <button type="button" onClick={() => setToast("Payment settings coming soon")}>
                <Icon name="gear" size={16} />
                <span>Payment Settings</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card pay-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}

      {viewing && (
        <DeliveryDetailModal
          title={viewing.paymentId}
          subtitle={`${viewing.date} · ${viewing.time}`}
          statusNode={(
            <>
              <span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>
              <span className={`pay-method ${methodCls(viewing.method)}`}>{viewing.methodLabel}</span>
            </>
          )}
          onClose={() => setViewing(null)}
          actions={(
            <>
              <button className="btn btn-purple btn-small" type="button" onClick={(e) => downloadPayment(viewing, e)}>
                <Icon name="download" size={14} /> Download
              </button>
              {viewing.status === "pending" && (
                <button className="btn btn-ghost btn-small" type="button" onClick={() => { patchPayment(viewing, { status: "success" }); setToast("Marked successful"); }}>
                  Mark successful
                </button>
              )}
              {viewing.status === "success" && (
                <button className="btn btn-ghost btn-small" type="button" onClick={() => { patchPayment(viewing, { status: "refunded" }); setToast("Refund issued"); }}>
                  Issue refund
                </button>
              )}
            </>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Customer", value: (<><strong>{viewing.customerName}</strong><span className="muted">{viewing.customerPhone}</span></>) },
              { label: "Order", value: viewing.orderId },
              { label: "Amount", value: <strong>{fmtKes(viewing.amount)}</strong> },
              { label: "Channel", value: viewing.channelLabel },
              { label: "Reference", value: viewing.reference },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
