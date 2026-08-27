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
  return status === "inactive" ? "dlvzon-st-inactive" : "dlvzon-st-active";
}

function etaCls(tone) {
  if (tone === "same") return "dlvzon-eta-same";
  if (tone === "next") return "dlvzon-eta-next";
  return "dlvzon-eta";
}

function ZoneMap({ legend }) {
  return (
    <div className="dlvzon-map">
      <svg viewBox="0 0 220 260" className="dlvzon-map-svg" aria-hidden="true">
        <path
          className="dlvzon-map-land"
          d="M118 18c18 6 34 18 42 36 10 22 18 38 14 58-3 16 6 28 4 44-2 18-12 30-10 46 2 14-6 28-18 36-14 10-30 8-46 12-18 4-34-4-48-14-12-8-22-22-24-38-2-14 4-28 2-42-2-16-12-28-8-44 4-18 16-30 30-40C74 28 98 12 118 18z"
        />
        <path fill="#16a34a" opacity="0.85" d="M96 118c10-6 22-4 30 4 6 8 4 18-2 24-8 8-20 8-28 2-8-6-8-18 0-30z" />
        <path fill="#6c5dd3" opacity="0.85" d="M78 86c12-8 24-2 28 10 4 10-2 20-12 24-12 4-24-4-24-16 0-8 4-14 8-18z" />
        <path fill="#ea580c" opacity="0.85" d="M118 168c14-4 24 6 26 18 2 12-8 22-20 22-14 0-24-10-22-22 2-8 8-14 16-18z" />
        <path fill="#2563eb" opacity="0.85" d="M70 150c10-4 18 2 20 12 2 10-4 18-14 18-10 0-16-10-14-20 2-6 4-8 8-10z" />
        <path fill="#94a3b8" opacity="0.9" d="M132 72c8-2 14 4 14 12s-6 12-14 12c-8 0-12-6-12-12s6-10 12-12z" />
        <circle cx="108" cy="128" r="3.5" fill="#fff" stroke="#0B1F3A" strokeWidth="1.2" />
        <circle cx="90" cy="98" r="3" fill="#fff" stroke="#0B1F3A" strokeWidth="1.2" />
        <circle cx="130" cy="182" r="3" fill="#fff" stroke="#0B1F3A" strokeWidth="1.2" />
        <circle cx="78" cy="158" r="2.5" fill="#fff" stroke="#0B1F3A" strokeWidth="1.2" />
      </svg>
      <ul className="dlvzon-map-legend">
        {(legend || []).map((l) => (
          <li key={l.key}>
            <i style={{ background: l.color }} />
            <span>{l.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DeliveryZones() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [cityF, setCityF] = useState("");
  const [typeF, setTypeF] = useState("");
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
      city: next.city ?? cityF,
      deliveryType: next.deliveryType ?? typeF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.city) p.set("city", vals.city);
    if (vals.deliveryType) p.set("deliveryType", vals.deliveryType);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/delivery-zones?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load delivery zones."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, cityF, typeF]);

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
    setCityF("");
    setTypeF("");
    setPage(1);
    load({ q: "", status: "", city: "", deliveryType: "", page: 1 });
  }

  if (!data) {
    return (
      <div className="dlvzon-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/delivery">Delivery</Link>
          <span>›</span>
          <strong>Delivery Zones</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading delivery zones…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.zones || [];
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
    <div className="dlvzon-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/delivery">Delivery</Link>
        <span>›</span>
        <strong>Delivery Zones</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="pin" size={16} /></span>
            Delivery Zones
          </h1>
          <p>Manage delivery areas, coverage, fees and estimated delivery times.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/delivery?tab=settings")}>
            <Icon name="gear" size={14} /> Delivery Settings
          </button>
          <div className="dlvzon-dd-wrap">
            <button
              className="btn btn-purple btn-small dlvzon-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Add Zone
              <Icon name="chevron" size={14} />
            </button>
            {addOpen && (
              <div className="dlvzon-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setAddOpen(false); setToast("New zone form coming soon"); }}>Single Zone</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Bulk zone import started"); }}>Bulk Import</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Drawing tools opening soon"); }}>Draw on Map</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six dlvzon-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Zones</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint">{stats.totalHint}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="pin" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Zones</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint up">{Number(stats.activePct).toFixed(1)}% {stats.activeHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Orders This Month</div>
            <div className="prod-stat-n orange">{fmtNum(stats.ordersMonth)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.ordersDelta)}`}>
              {deltaArrow(stats.ordersDelta)} {Math.abs(stats.ordersDelta).toFixed(1)}% {stats.ordersHint}
            </div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="truck" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Delivery Time</div>
            <div className="prod-stat-n blue">{stats.avgTime}</div>
            <div className="cat-stat-hint">{stats.avgTimeHint}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Delivery Fee</div>
            <div className="prod-stat-n red">{fmtNum(stats.avgFee)} KSh</div>
            <div className="cat-stat-hint">{stats.avgFeeHint}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="coin" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">On-Time Delivery</div>
            <div className="prod-stat-n purple">{Number(stats.onTime).toFixed(1)}%</div>
            <div className={`cat-stat-hint ${deltaCls(stats.onTimeDelta)}`}>
              {deltaArrow(stats.onTimeDelta)} {Math.abs(stats.onTimeDelta).toFixed(1)}% {stats.onTimeHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="bars" size={16} /></div>
        </article>
      </section>

      <div className="dlvzon-layout">
        <div className="dlvzon-main">
          <section className="card prod-filters">
            <form className="prod-filter-row dlvzon-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search zones..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {(data.filters?.statuses || []).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select value={cityF} onChange={(e) => { setCityF(e.target.value); setPage(1); }}>
                <option value="">All Cities</option>
                {(data.filters?.cities || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Delivery Types</option>
                {(data.filters?.deliveryTypes || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          </section>

          <section className="card dlvzon-table-card">
            <div className="prod-table-wrap dlvzon-scroll">
              <table className="table prod-table dlvzon-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Zone Name</th>
                    <th>City / Area</th>
                    <th>Coverage</th>
                    <th>Delivery Fee (KES)</th>
                    <th>Est. Delivery Time</th>
                    <th>Status</th>
                    <th>Orders (This Month)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td><strong>{r.name}</strong></td>
                      <td>
                        <div className="dlvzon-city">
                          <strong>{r.city}</strong>
                          <div className="muted">{r.area}</div>
                        </div>
                      </td>
                      <td><span className="dlvzon-coverage">{r.coverage}</span></td>
                      <td><strong>{fmtNum(r.fee)}</strong></td>
                      <td><span className={etaCls(r.etaTone)}>{r.eta}</span></td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td><strong>{fmtNum(r.orders)}</strong></td>
                      <td>
                        <div className="prod-row-acts">
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
                    <tr><td colSpan="9" className="muted">No zones match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} zones</span>
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

        <aside className="dlvzon-side">
          <section className="card pf-card">
            <div className="dlvzon-side-head">
              <h2><Icon name="globe" size={14} /> Zone Coverage Map</h2>
              <button className="link-reset" type="button" onClick={() => setToast("Full map view coming soon")}>
                View Full Map
              </button>
            </div>
            <ZoneMap legend={data.mapLegend} />
          </section>

          <section className="card pf-card">
            <div className="dlvzon-side-head">
              <h2><Icon name="bars" size={14} /> Top Zones by Orders</h2>
              <button className="link-reset" type="button" onClick={() => setToast("Zone report coming soon")}>
                View Report
              </button>
            </div>
            <ul className="dlvzon-bars">
              {(data.topZones || []).map((z, i) => (
                <li key={z.name}>
                  <div className="dlvzon-bar-meta">
                    <span><em>{i + 1}.</em> {z.name}</span>
                    <b>{fmtNum(z.orders)}</b>
                  </div>
                  <div className="dlvzon-bar-track">
                    <i style={{ width: `${z.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bulb" size={14} /> Zone Insights</h2>
            <ul className="dlvzon-insights">
              {(data.insights || []).map((ins) => (
                <li key={ins.key} className={`tone-${ins.tone}`}>
                  <span className="dlvzon-ins-ico"><Icon name={ins.icon} size={14} /></span>
                  <span>{ins.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card dlvzon-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
