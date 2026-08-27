import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

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
  if (status === "completed") return "dlvret-st-completed";
  if (status === "pending") return "dlvret-st-pending";
  if (status === "rejected") return "dlvret-st-rejected";
  return "dlvret-st-pending";
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap dlvret-donut">
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
      <ul className="donut-legend dlvret-legend">
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

export default function DeliveryReturns() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [reasonF, setReasonF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      reason: next.reason ?? reasonF,
      returnType: next.returnType ?? typeF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.reason) p.set("reason", vals.reason);
    if (vals.returnType) p.set("returnType", vals.returnType);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/delivery-returns?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load returns."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, reasonF, typeF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setCreateOpen(false);
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
    setReasonF("");
    setTypeF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", status: "", reason: "", returnType: "", page: 1 });
  }

  function patchReturn(row, next) {
    const updated = { ...row, ...next };
    setData((d) => ({
      ...d,
      returns: (d.returns || []).map((r) => (r.id === row.id ? updated : r)),
    }));
    setViewing((v) => (v && v.id === row.id ? updated : v));
    setMenu(null);
    return updated;
  }

  function markCompleted(row) {
    patchReturn(row, { status: "completed", statusLabel: "Completed", refund: row.refund || 0 });
    setToast(`${row.returnId} marked completed`);
  }

  function markRejected(row) {
    if (!confirm(`Reject return ${row.returnId}?`)) return;
    patchReturn(row, { status: "rejected", statusLabel: "Rejected", refund: 0 });
    setToast(`${row.returnId} rejected`);
  }

  function processRefund(row) {
    if (row.status === "rejected") {
      setToast("Cannot refund a rejected return");
      setMenu(null);
      return;
    }
    const amount = row.refund > 0 ? row.refund : 0;
    patchReturn(row, {
      status: "completed",
      statusLabel: "Completed",
      refund: amount || row.refund,
    });
    setToast(amount > 0 ? `Refund of ${fmtKes(amount)} processed` : `Refund processed for ${row.returnId}`);
  }

  function openOrder(row) {
    setMenu(null);
    setViewing(null);
    navigate(`/orders?q=${encodeURIComponent(row.orderId)}`);
  }

  if (!data) {
    return (
      <div className="dlvret-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/delivery">Delivery</Link>
          <span>›</span>
          <strong>Returns</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading returns…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.returns || [];
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
    <div className="dlvret-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/delivery">Delivery</Link>
        <span>›</span>
        <strong>Returns</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="refresh" size={16} /></span>
            Returns
          </h1>
          <p>Manage returned shipments, process refunds and track return reasons.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/delivery?tab=settings")}>
            <Icon name="gear" size={14} /> Return Settings
          </button>
          <div className="dlvret-dd-wrap">
            <button
              className="btn btn-purple btn-small dlvret-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCreateOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Create Return
              <Icon name="chevron" size={14} />
            </button>
            {createOpen && (
              <div className="dlvret-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCreateOpen(false); setToast("Manual return form coming soon"); }}>Manual Return</button>
                <button type="button" onClick={() => { setCreateOpen(false); navigate("/orders"); }}>From Order</button>
                <button type="button" onClick={() => { setCreateOpen(false); setToast("Bulk return import started"); }}>Bulk Import</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five dlvret-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Returns</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalDelta)}`}>
              {deltaArrow(stats.totalDelta)} {Math.abs(stats.totalDelta).toFixed(1)}% {stats.totalHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Completed Returns</div>
            <div className="prod-stat-n green">{fmtNum(stats.completed)}</div>
            <div className="cat-stat-hint up">{Number(stats.completedPct).toFixed(1)}% {stats.completedHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Pending Returns</div>
            <div className="prod-stat-n orange">{fmtNum(stats.pending)}</div>
            <div className="cat-stat-hint up">{Number(stats.pendingPct).toFixed(1)}% {stats.pendingHint}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Refunds Issued</div>
            <div className="prod-stat-n blue">{fmtKes(stats.refundsIssued)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.refundsDelta)}`}>
              {deltaArrow(stats.refundsDelta)} {Math.abs(stats.refundsDelta).toFixed(1)}% {stats.refundsHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="wallet" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Rejected Returns</div>
            <div className="prod-stat-n red">{fmtNum(stats.rejected)}</div>
            <div className="cat-stat-hint up">{Number(stats.rejectedPct).toFixed(1)}% {stats.rejectedHint}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div>
        </article>
      </section>

      <div className="dlvret-layout">
        <div className="dlvret-main">
          <section className="card prod-filters">
            <form className="prod-filter-row dlvret-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search returns..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {(data.filters?.statuses || []).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select value={reasonF} onChange={(e) => { setReasonF(e.target.value); setPage(1); }}>
                <option value="">All Reasons</option>
                {(data.filters?.reasons || []).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Return Types</option>
                {(data.filters?.returnTypes || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div className="dlvret-dates">
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

          <section className="card dlvret-table-card">
            <div className="prod-table-wrap dlvret-scroll">
              <table className="table prod-table dlvret-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Return ID</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Return Date</th>
                    <th>Refund Amt. (KES)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td>
                        <button className="link-reset dlvret-id" type="button" onClick={() => { setViewing(r); setMenu(null); }}>
                          {r.returnId}
                        </button>
                      </td>
                      <td>
                        <button className="link-reset dlvret-id muted" type="button" onClick={() => openOrder(r)}>
                          {r.orderId}
                        </button>
                      </td>
                      <td>
                        <div className="prod-cell dlvret-customer">
                          <img src={r.customerAvatar} alt="" />
                          <div>
                            <strong>{r.customerName}</strong>
                            <div className="muted">{r.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td>{r.reason}</td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div>{r.date}</div>
                        <div className="muted dlvret-sub">{r.time}</div>
                      </td>
                      <td><strong>{r.refund > 0 ? fmtNum(r.refund) : "—"}</strong></td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => { setViewing(r); setMenu(null); }}>
                            <Icon name="eye" size={14} />
                          </button>
                          <span className="ord-menu-wrap">
                            <button
                              type="button"
                              title="More"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenu(menu === r.id ? null : r.id);
                              }}
                            >
                              <Icon name="more" size={14} />
                            </button>
                            {menu === r.id && (
                              <div className={`ord-menu ${r.n >= rows.length ? "dlvret-menu-up" : ""}`} onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => { setViewing(r); setMenu(null); }}>View details</button>
                                <button type="button" onClick={() => openOrder(r)}>Open order</button>
                                {r.status === "pending" && (
                                  <button type="button" onClick={() => markCompleted(r)}>Mark completed</button>
                                )}
                                {r.status !== "rejected" && (
                                  <button type="button" onClick={() => processRefund(r)}>Process refund</button>
                                )}
                                {r.status !== "rejected" && (
                                  <button type="button" className="danger" onClick={() => markRejected(r)}>Reject return</button>
                                )}
                              </div>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="9" className="muted">No returns match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} returns</span>
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

        <aside className="dlvret-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Returns by Status</h2>
            <Donut parts={data.statusDonut} total={stats.total} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="bars" size={14} /> Top Return Reasons</h2>
            <ul className="dlvret-bars">
              {(data.topReasons || []).map((r) => (
                <li key={r.name}>
                  <div className="dlvret-bar-meta">
                    <span>{r.name}</span>
                    <b>{Number(r.pct).toFixed(1)}%</b>
                  </div>
                  <div className="dlvret-bar-track">
                    <i style={{ width: `${r.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="wallet" size={14} /> Financial Summary</h2>
            <ul className="dlvret-fin">
              {(data.financial || []).map((f) => (
                <li key={f.key}>
                  <span className="muted">{f.label}</span>
                  <strong>{f.value}</strong>
                </li>
              ))}
            </ul>
          </section>

          {data.policyNote && (
            <aside className="dlvret-policy">
              <Icon name="warning" size={14} />
              <p>{data.policyNote}</p>
            </aside>
          )}
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card dlvret-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}

      {viewing && (
        <div className="prod-modal" onClick={() => setViewing(null)}>
          <div className="card prod-modal-card dlvret-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <div>
                <h2>{viewing.returnId}</h2>
                <p className="muted">{viewing.date} · {viewing.time}</p>
              </div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(null)}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="dlvret-modal-status">
              <span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>
              <span className="muted">{viewing.returnTypeLabel || viewing.returnType}</span>
            </div>
            <dl className="dlvret-modal-meta">
              <div>
                <dt>Customer</dt>
                <dd>
                  <strong>{viewing.customerName}</strong>
                  <span className="muted">{viewing.customerPhone}</span>
                </dd>
              </div>
              <div>
                <dt>Order</dt>
                <dd>
                  <button className="link-reset dlvret-id" type="button" onClick={() => openOrder(viewing)}>
                    {viewing.orderId}
                  </button>
                </dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{viewing.reason}</dd>
              </div>
              <div>
                <dt>Refund amount</dt>
                <dd><strong>{viewing.refund > 0 ? fmtKes(viewing.refund) : "—"}</strong></dd>
              </div>
            </dl>
            <div className="prod-actions rule-drawer-acts dlvret-modal-acts">
              {viewing.status === "pending" && (
                <button className="btn btn-purple btn-small" type="button" onClick={() => markCompleted(viewing)}>
                  Mark completed
                </button>
              )}
              {viewing.status !== "rejected" && (
                <button className="btn btn-ghost btn-small" type="button" onClick={() => processRefund(viewing)}>
                  Process refund
                </button>
              )}
              {viewing.status !== "rejected" && (
                <button className="btn btn-ghost btn-small danger" type="button" onClick={() => markRejected(viewing)}>
                  Reject
                </button>
              )}
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
