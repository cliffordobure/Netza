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

function deltaCls(n) {
  const v = Number(n) || 0;
  if (v === 0) return "";
  return v > 0 ? "up" : "down";
}

function deltaArrow(n) {
  return Number(n) >= 0 ? "↑" : "↓";
}

function statusCls(status) {
  if (status === "online") return "dlvcou-st-online";
  if (status === "on_delivery") return "dlvcou-st-delivery";
  if (status === "offline") return "dlvcou-st-offline";
  return "dlvcou-st-online";
}

function Stars({ rating }) {
  const full = Math.floor(Number(rating) || 0);
  const stars = [];
  for (let i = 0; i < 5; i += 1) {
    stars.push(
      <span key={i} className={i < full ? "on" : ""}>★</span>
    );
  }
  return <span className="dlvcou-stars">{stars}</span>;
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap dlvcou-donut">
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
      <ul className="donut-legend dlvcou-legend">
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

export default function DeliveryCouriers() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [zoneF, setZoneF] = useState("");
  const [vehicleF, setVehicleF] = useState("");
  const [verifyF, setVerifyF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      zone: next.zone ?? zoneF,
      vehicle: next.vehicle ?? vehicleF,
      verification: next.verification ?? verifyF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.zone) p.set("zone", vals.zone);
    if (vals.vehicle) p.set("vehicle", vals.vehicle);
    if (vals.verification) p.set("verification", vals.verification);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/delivery-couriers?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load couriers."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, zoneF, vehicleF, verifyF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setAddOpen(false);
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
    setZoneF("");
    setVehicleF("");
    setVerifyF("");
    setPage(1);
    load({ q: "", status: "", zone: "", vehicle: "", verification: "", page: 1 });
  }

  if (!data) {
    return (
      <div className="dlvcou-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/delivery">Delivery</Link>
          <span>›</span>
          <strong>Couriers</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading couriers…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.couriers || [];
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
    <div className="dlvcou-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/delivery">Delivery</Link>
        <span>›</span>
        <strong>Couriers</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="users" size={16} /></span>
            Couriers
          </h1>
          <p>Manage couriers, assign deliveries and track performance.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/delivery?tab=settings")}>
            <Icon name="gear" size={14} /> Courier Settings
          </button>
          <div className="dlvcou-dd-wrap">
            <button
              className="btn btn-purple btn-small dlvcou-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Add Courier
              <Icon name="chevron" size={14} />
            </button>
            {addOpen && (
              <div className="dlvcou-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Single courier form coming soon"); }}>Single Courier</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Bulk courier import started"); }}>Bulk Import</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Invite link copied"); }}>Invite by Link</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six dlvcou-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Couriers</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalDelta)}`}>
              {deltaArrow(stats.totalDelta)} {Math.abs(stats.totalDelta).toFixed(1)}% {stats.totalHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Couriers</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.activePct).toFixed(1)}% {stats.activeHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">On Delivery</div>
            <div className="prod-stat-n orange">{fmtNum(stats.onDelivery)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.onDeliveryPct).toFixed(1)}% {stats.onDeliveryHint}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="truck" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Offline</div>
            <div className="prod-stat-n red">{fmtNum(stats.offline)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.offlinePct).toFixed(1)}% {stats.offlineHint}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Rating</div>
            <div className="prod-stat-n gold">{Number(stats.avgRating).toFixed(1)}/5</div>
            <div className={`cat-stat-hint ${deltaCls(stats.avgRatingDelta)}`}>
              {deltaArrow(stats.avgRatingDelta)} {Math.abs(stats.avgRatingDelta).toFixed(1)} {stats.avgRatingHint}
            </div>
          </div>
          <div className="prod-stat-icon gold"><Icon name="star" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Completed Deliveries</div>
            <div className="prod-stat-n blue">{fmtNum(stats.completed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.completedDelta)}`}>
              {deltaArrow(stats.completedDelta)} {Math.abs(stats.completedDelta).toFixed(1)}% {stats.completedHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="gift" size={16} /></div>
        </article>
      </section>

      <div className="dlvcou-layout">
        <div className="dlvcou-main">
          <section className="card prod-filters">
            <form className="prod-filter-row dlvcou-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search couriers..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {(data.filters?.statuses || []).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select value={zoneF} onChange={(e) => { setZoneF(e.target.value); setPage(1); }}>
                <option value="">All Zones</option>
                {(data.filters?.zones || []).map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <select value={vehicleF} onChange={(e) => { setVehicleF(e.target.value); setPage(1); }}>
                <option value="">All Vehicle Types</option>
                {(data.filters?.vehicles || []).map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
              <select value={verifyF} onChange={(e) => { setVerifyF(e.target.value); setPage(1); }}>
                <option value="">All Verification</option>
                {(data.filters?.verifications || []).map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          </section>

          <section className="card dlvcou-table-card">
            <div className="prod-table-wrap dlvcou-scroll">
              <table className="table prod-table dlvcou-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Courier</th>
                    <th>Contact</th>
                    <th>Vehicle</th>
                    <th>Zone</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Completed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td>
                        <div className="prod-cell dlvcou-person">
                          <img src={r.avatar} alt="" />
                          <div>
                            <strong>{r.name}</strong>
                            <div className="muted">{r.code}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="dlvcou-contact">
                          <strong>{r.phone}</strong>
                          <div className="muted">{r.email}</div>
                        </div>
                      </td>
                      <td>
                        <div className="dlvcou-vehicle">
                          <strong>{r.vehicleLabel}</strong>
                          <div className="muted">{r.plate}</div>
                        </div>
                      </td>
                      <td>{r.zone}</td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div className="dlvcou-rating">
                          <Stars rating={r.rating} />
                          <span>{Number(r.rating).toFixed(1)}</span>
                        </div>
                      </td>
                      <td><strong>{fmtNum(r.completed)}</strong></td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => setToast(`Viewing ${r.name}`)}>
                            <Icon name="eye" size={14} />
                          </button>
                          <button type="button" title="Edit" onClick={() => setToast(`Editing ${r.name}`)}>
                            <Icon name="pencil" size={14} />
                          </button>
                          <button type="button" title="More" onClick={() => setToast(`Actions for ${r.name}`)}>
                            <Icon name="more" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="9" className="muted">No couriers match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} couriers</span>
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

        <aside className="dlvcou-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Couriers by Status</h2>
            <Donut parts={data.statusDonut} total={stats.total} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="trophy" size={14} /> Top Performing Couriers</h2>
            <ul className="dlvcou-top">
              {(data.topPerformers || []).map((c, i) => (
                <li key={c.code}>
                  <span className="dlvcou-rank">{i + 1}</span>
                  <img src={c.avatar} alt="" />
                  <div className="dlvcou-top-meta">
                    <strong>{c.name}</strong>
                    <div className="muted">{fmtNum(c.completed)} deliveries</div>
                  </div>
                  <div className="dlvcou-top-rating">
                    <Stars rating={c.rating} />
                    <span>{Number(c.rating).toFixed(1)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="shield" size={14} /> Verification Summary</h2>
            <ul className="dlvcou-verify">
              {(data.verification || []).map((v) => (
                <li key={v.key} className={`tone-${v.tone}`}>
                  <span className="dlvcou-verify-ico">
                    {v.key === "verified" && <Icon name="checkCircle" size={14} />}
                    {v.key === "pending" && <Icon name="clock" size={14} />}
                    {v.key === "rejected" && <Icon name="xCircle" size={14} />}
                  </span>
                  <div>
                    <strong>{v.label}</strong>
                    <div className="muted">{Number(v.pct).toFixed(1)}%</div>
                  </div>
                  <b>{fmtNum(v.value)}</b>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card dlvcou-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
