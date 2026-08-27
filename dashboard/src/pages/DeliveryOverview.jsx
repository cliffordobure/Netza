import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import DeliveryShipments from "./DeliveryShipments";
import DeliveryCouriers from "./DeliveryCouriers";
import DeliveryZones from "./DeliveryZones";
import DeliveryReturns from "./DeliveryReturns";

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
  if (status === "delivered") return "dlvov-st-delivered";
  if (status === "in_transit") return "dlvov-st-transit";
  if (status === "pending_pickup") return "dlvov-st-pending";
  if (status === "failed") return "dlvov-st-failed";
  if (status === "returned") return "dlvov-st-returned";
  return "dlvov-st-transit";
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap dlvov-donut">
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
      <ul className="donut-legend dlvov-legend">
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

export default function DeliveryOverview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
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
  const [createOpen, setCreateOpen] = useState(false);

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
    api(`/admin/delivery-overview?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load delivery overview."));
  }

  useEffect(() => {
    if (tab !== "overview" && tab) return;
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, courierF, zoneF, tab]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setCreateOpen(false);
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
    setCourierF("");
    setZoneF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", status: "", courier: "", zone: "", page: 1 });
  }

  if (tab === "shipments" || tab === "all") {
    return <DeliveryShipments />;
  }

  if (tab === "couriers" || tab === "agents") {
    return <DeliveryCouriers />;
  }

  if (tab === "zones") {
    return <DeliveryZones />;
  }

  if (tab === "returns") {
    return <DeliveryReturns />;
  }

  if (tab && tab !== "overview") {
    const titles = {
      shipments: "Shipments",
      all: "Shipments",
      couriers: "Couriers",
      agents: "Couriers",
      zones: "Delivery Zones",
      returns: "Returns",
      charges: "Delivery Charges",
      settings: "Delivery Settings",
    };
    return (
      <div className="dlvov-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/delivery">Delivery</Link>
          <span>›</span>
          <strong>{titles[tab] || "Delivery"}</strong>
        </nav>
        <div className="prod-head">
          <div>
            <h1>
              <span className="prod-title-icon solid"><Icon name="truck" size={16} /></span>
              {titles[tab] || "Delivery"}
            </h1>
            <p>This section is ready for detailed {String(titles[tab] || "delivery").toLowerCase()} management.</p>
          </div>
          <button className="btn btn-purple btn-small" type="button" onClick={() => navigate("/delivery")}>
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dlvov-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/delivery">Delivery</Link>
          <span>›</span>
          <strong>Overview</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading delivery overview…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.shipments || [];
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
    <div className="dlvov-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/delivery">Delivery</Link>
        <span>›</span>
        <strong>Overview</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="truck" size={16} /></span>
            Delivery Overview
          </h1>
          <p>Monitor deliveries, shipments and courier performance in real time.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/delivery?tab=settings")}>
            <Icon name="gear" size={14} /> Delivery Settings
          </button>
          <div className="dlvov-dd-wrap">
            <button
              className="btn btn-purple btn-small dlvov-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCreateOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Create Shipment
              <Icon name="chevron" size={14} />
            </button>
            {createOpen && (
              <div className="dlvov-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCreateOpen(false); setToast("Single shipment form coming soon"); }}>Single Shipment</button>
                <button type="button" onClick={() => { setCreateOpen(false); setToast("Bulk shipment import started"); }}>Bulk Import</button>
                <button type="button" onClick={() => { setCreateOpen(false); navigate("/orders"); }}>From Order</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six dlvov-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Shipments</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalDelta)}`}>
              {deltaArrow(stats.totalDelta)} {Math.abs(stats.totalDelta).toFixed(1)}% {stats.totalHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Delivered</div>
            <div className="prod-stat-n green">{fmtNum(stats.delivered)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.deliveredPct).toFixed(1)}% {stats.deliveredHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="truck" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">In Transit</div>
            <div className="prod-stat-n orange">{fmtNum(stats.inTransit)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.inTransitPct).toFixed(1)}% {stats.inTransitHint}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Pending Pickup</div>
            <div className="prod-stat-n blue">{fmtNum(stats.pendingPickup)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.pendingPickupPct).toFixed(1)}% {stats.pendingPickupHint}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="bag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Failed / Returned</div>
            <div className="prod-stat-n red">{fmtNum(stats.failedReturned)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.failedReturnedDelta)}`}>
              {deltaArrow(stats.failedReturnedDelta)} {Math.abs(stats.failedReturnedDelta).toFixed(1)}% {stats.failedReturnedHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Delivery Success Rate</div>
            <div className="prod-stat-n gold">{Number(stats.successRate).toFixed(1)}%</div>
            <div className={`cat-stat-hint ${deltaCls(stats.successRateDelta)}`}>
              {deltaArrow(stats.successRateDelta)} {Math.abs(stats.successRateDelta).toFixed(1)}% {stats.successRateHint}
            </div>
          </div>
          <div className="prod-stat-icon gold"><Icon name="star" size={16} /></div>
        </article>
      </section>

      <div className="dlvov-layout">
        <div className="dlvov-main">
          <section className="card prod-filters">
            <form className="prod-filter-row dlvov-filters" onSubmit={search}>
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
              <div className="dlvov-dates">
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

          <section className="card dlvov-table-card">
            <div className="dlvov-table-head">
              <h2>Recent Shipments</h2>
              <button className="link-reset" type="button" onClick={() => navigate("/delivery?tab=shipments")}>
                View All Shipments →
              </button>
            </div>
            <div className="prod-table-wrap dlvov-scroll">
              <table className="table prod-table dlvov-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Shipment ID</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Courier</th>
                    <th>Status</th>
                    <th>Delivery Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td><code className="dlvov-id">{r.shipmentId}</code></td>
                      <td><code className="dlvov-id muted">{r.orderId}</code></td>
                      <td>
                        <div className="prod-cell dlvov-customer">
                          <img src={r.customerAvatar} alt="" />
                          <div>
                            <strong>{r.customerName}</strong>
                            <div className="muted">{r.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="dlvov-courier">
                          <strong>{r.courierName}</strong>
                          <div className="muted">{r.trackingId}</div>
                        </div>
                      </td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div>{r.date}</div>
                        <div className="muted dlvov-sub">{r.time}</div>
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
                    <tr><td colSpan="8" className="muted">No shipments match these filters.</td></tr>
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

        <aside className="dlvov-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Shipments by Status</h2>
            <Donut parts={data.statusDonut} total={stats.total} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="truck" size={14} /> Top Couriers</h2>
            <ul className="dlvov-bars">
              {(data.topCouriers || []).map((c) => (
                <li key={c.name}>
                  <div className="dlvov-bar-meta">
                    <span>{c.name}</span>
                    <b>{fmtNum(c.shipments)} · {Number(c.pct).toFixed(1)}%</b>
                  </div>
                  <div className="dlvov-bar-track">
                    <i style={{ width: `${c.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="trend" size={14} /> Delivery Performance</h2>
            <ul className="dlvov-perf">
              {(data.performance || []).map((p) => (
                <li key={p.key}>
                  <div>
                    <span className="muted">{p.label}</span>
                    <strong>{p.value}</strong>
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
        <footer className="card pf-card dlvov-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
