import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

function fmtNum(n, digits = 0) {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n || 0);
}

function deltaCls(n, goodDown = false) {
  const v = Number(n) || 0;
  if (v === 0) return "";
  const positive = goodDown ? v < 0 : v > 0;
  return positive ? "up" : "down";
}

function deltaArrow(n) {
  return Number(n) >= 0 ? "↑" : "↓";
}

function statusCls(status) {
  if (status === "delivered") return "dlvshp-st-delivered";
  if (status === "in_transit") return "dlvshp-st-transit";
  if (status === "out_for_delivery") return "dlvshp-st-out";
  if (status === "ready") return "dlvshp-st-ready";
  if (status === "dispatched") return "dlvshp-st-dispatched";
  if (status === "draft") return "dlvshp-st-draft";
  if (status === "failed") return "dlvshp-st-failed";
  if (status === "returned") return "dlvshp-st-returned";
  return "dlvshp-st-transit";
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap dlvshp-donut">
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
      <ul className="donut-legend dlvshp-legend">
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

function Sparkline({ data, color }) {
  const values = data?.length ? data : [20, 28, 22, 36, 30, 42, 38, 48];
  const w = 64;
  const h = 24;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="dlvshp-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline fill="none" stroke={color || "#6c5dd3"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

export default function DeliveryShipments() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [courierF, setCourierF] = useState("");
  const [zoneF, setZoneF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState(() => new Set());

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      courier: next.courier ?? courierF,
      zone: next.zone ?? zoneF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.courier) p.set("courier", vals.courier);
    if (vals.zone) p.set("zone", vals.zone);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/delivery-shipments?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
        setSelected(new Set());
      })
      .catch((e) => setError(e.message || "Could not load shipments."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, courierF, zoneF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function search(e) {
    e.preventDefault();
    setPage(1);
    load({ q, page: 1 });
  }

  function reset() {
    setQ("");
    setStatusF("");
    setCourierF("");
    setZoneF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", status: "", courier: "", zone: "", page: 1 });
  }

  if (!data) {
    return (
      <div className="dlvshp-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/delivery">Delivery</Link>
          <span>›</span>
          <strong>Shipments</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading shipments…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.shipments || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
  }

  return (
    <div className="dlvshp-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/delivery">Delivery</Link>
        <span>›</span>
        <strong>Shipments</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="truck" size={16} /></span>
            Shipments
          </h1>
          <p>Manage and track all shipments in the delivery process.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("Shipment import started")}>
            <Icon name="upload" size={14} /> Import Shipments
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setToast("Create shipment form coming soon")}>
            <Icon name="plus" size={14} /> Create Shipment
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six dlvshp-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Draft</div>
            <div className="prod-stat-n purple">{fmtNum(stats.draft)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.draftPct).toFixed(1)}% {stats.draftHint}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="file" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Ready to Dispatch</div>
            <div className="prod-stat-n blue">{fmtNum(stats.ready)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.readyPct).toFixed(1)}% {stats.readyHint}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="send" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Dispatched</div>
            <div className="prod-stat-n green">{fmtNum(stats.dispatched)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.dispatchedPct).toFixed(1)}% {stats.dispatchedHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="truck" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Out for Delivery</div>
            <div className="prod-stat-n purple">{fmtNum(stats.outForDelivery)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.outForDeliveryPct).toFixed(1)}% {stats.outForDeliveryHint}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="bag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Delivered</div>
            <div className="prod-stat-n green">{fmtNum(stats.delivered)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.deliveredPct).toFixed(1)}% {stats.deliveredHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Returned</div>
            <div className="prod-stat-n red">{fmtNum(stats.returned)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.returnedPct).toFixed(1)}% {stats.returnedHint}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="refresh" size={16} /></div>
        </article>
      </section>

      <div className="dlvshp-layout">
        <div className="dlvshp-main">
          <section className="card prod-filters">
            <form className="prod-filter-row dlvshp-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shipments..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {(data.filters?.statuses || []).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select value={courierF} onChange={(e) => { setCourierF(e.target.value); setPage(1); }}>
                <option value="">All Couriers</option>
                {(data.filters?.couriers || []).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <select value={zoneF} onChange={(e) => { setZoneF(e.target.value); setPage(1); }}>
                <option value="">All Delivery Zones</option>
                {(data.filters?.zones || []).map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <div className="dlvshp-dates">
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

          <section className="card dlvshp-table-card">
            <div className="prod-table-wrap dlvshp-scroll">
              <table className="table prod-table dlvshp-table">
                <thead>
                  <tr>
                    <th className="dlvshp-check">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th>#</th>
                    <th>Shipment ID</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Courier</th>
                    <th>Status</th>
                    <th>Delivery Date</th>
                    <th>Destination</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="dlvshp-check">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleOne(r.id)}
                          aria-label={`Select ${r.shipmentId}`}
                        />
                      </td>
                      <td className="muted">{r.n}</td>
                      <td><code className="dlvshp-id">{r.shipmentId}</code></td>
                      <td><code className="dlvshp-id muted">{r.orderId}</code></td>
                      <td>
                        <div className="prod-cell dlvshp-customer">
                          <img src={r.customerAvatar} alt="" />
                          <div>
                            <strong>{r.customerName}</strong>
                            <div className="muted">{r.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="dlvshp-courier">
                          <strong>{r.courierName}</strong>
                          <div className="muted">Tracking: {r.trackingId}</div>
                        </div>
                      </td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div>{r.date}</div>
                        <div className="muted dlvshp-sub">{r.time}</div>
                      </td>
                      <td>
                        <div className="dlvshp-dest">{r.destination}</div>
                      </td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => setToast(`Viewing ${r.shipmentId}`)}>
                            <Icon name="eye" size={14} />
                          </button>
                          <button type="button" title="More" onClick={() => setToast(`Actions for ${r.shipmentId}`)}>
                            <Icon name="more" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="10" className="muted">No shipments match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} shipments</span>
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

        <aside className="dlvshp-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Shipments by Status</h2>
            <Donut parts={data.statusDonut} total={stats.total} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="pin" size={14} /> Top Delivery Zones</h2>
            <ul className="dlvshp-bars">
              {(data.topZones || []).map((z) => (
                <li key={z.name}>
                  <div className="dlvshp-bar-meta">
                    <span>{z.name}</span>
                    <b>{fmtNum(z.shipments)} · {Number(z.pct).toFixed(1)}%</b>
                  </div>
                  <div className="dlvshp-bar-track">
                    <i style={{ width: `${z.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="trend" size={14} /> Performance (This Month)</h2>
            <ul className="dlvshp-perf">
              {(data.performance || []).map((p) => (
                <li key={p.key}>
                  <div className="dlvshp-perf-main">
                    <div>
                      <span className="muted">{p.label}</span>
                      <strong>{p.value}</strong>
                    </div>
                    <Sparkline data={p.spark} color={p.sparkColor} />
                  </div>
                  <span className={`cat-stat-hint ${deltaCls(p.delta, p.goodDown)}`}>
                    {deltaArrow(p.delta)} {p.deltaLabel}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card dlvshp-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
