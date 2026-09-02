import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import KENYA_BORDER from "../data/kenya-border.json";
import { DeliveryDetailModal, DeliveryRowMenu, DetailMeta } from "../DeliveryRowMenu";

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

/** Equirectangular project for Kenya bounds → SVG coords */
function keXY(lon, lat, w = 280, h = 340, pad = 14) {
  const minLon = 33.75;
  const maxLon = 42.1;
  const minLat = -4.95;
  const maxLat = 5.65;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  return [
    pad + ((lon - minLon) / (maxLon - minLon)) * iw,
    pad + ((maxLat - lat) / (maxLat - minLat)) * ih,
  ];
}

function kePath(points) {
  return points
    .map(([lon, lat], i) => {
      const [x, y] = keXY(lon, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

/* Lake Turkana (approx. shoreline) */
const LAKE_TURKANA = [
  [35.95, 4.55], [36.12, 4.48], [36.32, 4.2], [36.48, 3.85],
  [36.55, 3.35], [36.5, 2.9], [36.35, 2.5], [36.15, 2.32],
  [35.95, 2.4], [35.82, 2.75], [35.78, 3.2], [35.82, 3.65],
  [35.88, 4.1], [35.95, 4.55],
];

/* Eastern Lake Victoria bite (Kenya side) */
const LAKE_VICTORIA = [
  [33.9, -0.05], [34.15, -0.35], [34.35, -0.7], [34.55, -1.0],
  [34.75, -1.15], [34.45, -0.95], [34.15, -0.55], [33.92, -0.15],
];

const REGION_MARKERS = [
  { key: "nairobi", lon: 36.82, lat: -1.29, color: "#16a34a", label: "Nairobi" },
  { key: "rift", lon: 36.08, lat: -0.3, color: "#6c5dd3", label: "Nakuru" },
  { key: "coast", lon: 39.67, lat: -4.04, color: "#ea580c", label: "Mombasa" },
  { key: "other", lon: 34.77, lat: -0.09, color: "#2563eb", label: "Kisumu" },
];

const CITY_COORDS = {
  Nairobi: [36.82, -1.29],
  Mombasa: [39.67, -4.04],
  Kisumu: [34.77, -0.09],
  Nakuru: [36.08, -0.3],
  Eldoret: [35.27, 0.52],
  Thika: [37.07, -1.04],
};

function ZoneMap({ legend, zones }) {
  const zonePins = (zones || []).map((z, i) => {
    const base = CITY_COORDS[z.city] || CITY_COORDS.Nairobi;
    const jitter = z.city === "Nairobi" ? (i - 1) * 0.12 : 0;
    const [x, y] = keXY(base[0] + jitter * 0.35, base[1] + jitter * 0.08);
    const color = z.status === "inactive"
      ? "#94a3b8"
      : (legend || []).find((l) => l.key === z.region)?.color || "#16a34a";
    return { id: z.id, x, y, color, name: z.name, status: z.status };
  });

  const landPath = kePath(KENYA_BORDER);
  const [oceanX] = keXY(41.2, -1.5);

  return (
    <div className="dlvzon-map">
      <svg viewBox="0 0 280 340" className="dlvzon-map-svg" role="img" aria-label="Map of Kenya with delivery zone coverage">
        <defs>
          <linearGradient id="dlvzon-ocean" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8f3ff" />
            <stop offset="100%" stopColor="#cfe4f8" />
          </linearGradient>
          <linearGradient id="dlvzon-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8efe6" />
            <stop offset="100%" stopColor="#d4e0d2" />
          </linearGradient>
          <filter id="dlvzon-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#0B1F3A" floodOpacity="0.16" />
          </filter>
        </defs>

        <rect width="280" height="340" fill="url(#dlvzon-ocean)" rx="12" />

        {/* Indian Ocean hint east of the coast */}
        <rect x={oceanX} y="70" width={280 - oceanX} height="240" fill="#9ec9ef" opacity="0.35" />

        <path
          className="dlvzon-map-land"
          fill="url(#dlvzon-land)"
          filter="url(#dlvzon-soft)"
          d={landPath}
        />

        <path className="dlvzon-map-lake" d={kePath(LAKE_TURKANA)} />
        <path className="dlvzon-map-lake" d={kePath(LAKE_VICTORIA)} />

        {/* Equator guide */}
        {(() => {
          const [, y] = keXY(36, 0);
          return (
            <g className="dlvzon-map-equator">
              <line x1="18" y1={y} x2="262" y2={y} strokeDasharray="3 4" />
              <text x="20" y={y - 4}>Equator</text>
            </g>
          );
        })()}

        {REGION_MARKERS.map((m) => {
          const [x, y] = keXY(m.lon, m.lat);
          return (
            <g key={m.key}>
              <circle cx={x} cy={y} r="8" fill={m.color} opacity="0.18" />
              <circle cx={x} cy={y} r="3.5" fill={m.color} stroke="#fff" strokeWidth="1.3" />
              <text className="dlvzon-map-city" x={x + 7} y={y + 3}>{m.label}</text>
            </g>
          );
        })}

        {zonePins.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r="5.5" fill={p.color} opacity="0.28" />
            <circle cx={p.x} cy={p.y} r="2.8" fill="#fff" stroke={p.color} strokeWidth="1.8" />
            <title>{p.name} ({p.status})</title>
          </g>
        ))}

        <text x="140" y="328" textAnchor="middle" className="dlvzon-map-caption">Republic of Kenya</text>
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
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

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
    setCityF("");
    setTypeF("");
    setPage(1);
    load({ q: "", status: "", city: "", deliveryType: "", page: 1 });
  }

  function applyZone(updated) {
    setData((d) => ({
      ...d,
      zones: (d.zones || []).some((r) => r.id === updated.id)
        ? (d.zones || []).map((r) => (r.id === updated.id ? updated : r))
        : [...(d.zones || []), updated],
    }));
    setViewing((v) => (v && v.id === updated.id ? updated : v));
    setEditing((v) => (v && v.id === updated.id ? updated : v));
    setMenu(null);
  }

  async function persistZone(row, next = {}) {
    const payload = { ...row, ...next, fee: Number(next.fee ?? row.fee) || 0 };
    const isNew = !row.id || String(row.id).startsWith("new-");
    const res = await api(isNew ? "/admin/delivery-zones" : `/admin/delivery-zones/${row.id}`, {
      method: isNew ? "POST" : "PUT",
      body: JSON.stringify(payload),
    });
    applyZone(res.zone);
    return res.zone;
  }

  async function toggleZoneStatus(row) {
    const status = row.status === "active" ? "inactive" : "active";
    try {
      await persistZone(row, { status });
      setToast(`${row.name} ${status === "active" ? "activated" : "deactivated"}`);
      load();
    } catch (e) {
      setError(e.message || "Could not update zone.");
    }
  }

  async function saveZone(e) {
    e.preventDefault();
    if (!editing) return;
    try {
      const zone = await persistZone(editing, {
        name: editing.name,
        city: editing.city,
        area: editing.area,
        coverage: editing.coverage,
        fee: Number(editing.fee) || 0,
        eta: editing.eta,
      });
      setEditing(null);
      setToast(`${zone.name} saved`);
      load();
    } catch (err) {
      setError(err.message || "Could not save zone.");
    }
  }

  async function duplicateZone(row) {
    try {
      const res = await api("/admin/delivery-zones", {
        method: "POST",
        body: JSON.stringify({
          ...row,
          id: undefined,
          name: `${row.name} (Copy)`,
          status: "inactive",
          orders: 0,
        }),
      });
      setMenu(null);
      setToast(`Duplicated ${row.name}`);
      load();
      applyZone(res.zone);
    } catch (e) {
      setError(e.message || "Could not duplicate zone.");
    }
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
                <button type="button" onClick={() => {
                  setAddOpen(false);
                  setEditing({
                    id: `new-${Date.now()}`,
                    name: "",
                    city: "Nairobi",
                    area: "",
                    coverage: "",
                    fee: 150,
                    eta: "1-2 days",
                    deliveryType: "standard",
                    status: "active",
                    region: "nairobi",
                  });
                }}>Single Zone</button>
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
                          <button type="button" title="Edit" onClick={() => { setEditing({ ...r }); setMenu(null); }}>
                            <Icon name="pencil" size={14} />
                          </button>
                          <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length}>
                            <button type="button" onClick={() => { setViewing(r); setMenu(null); }}>View details</button>
                            <button type="button" onClick={() => { setEditing({ ...r }); setMenu(null); }}>Edit zone</button>
                            <button type="button" onClick={() => toggleZoneStatus(r)}>
                              {r.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <button type="button" onClick={() => duplicateZone(r)}>Duplicate</button>
                          </DeliveryRowMenu>
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
            <ZoneMap legend={data.mapLegend} zones={rows} />
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

      {viewing && (
        <DeliveryDetailModal
          title={viewing.name}
          subtitle={`${viewing.city} · ${viewing.area}`}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <>
              <button className="btn btn-purple btn-small" type="button" onClick={() => { setEditing({ ...viewing }); setViewing(null); }}>
                Edit
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => toggleZoneStatus(viewing)}>
                {viewing.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Coverage", value: viewing.coverage },
              { label: "Delivery fee", value: `${fmtNum(viewing.fee)} KSh` },
              { label: "ETA", value: viewing.eta },
              { label: "Orders this month", value: fmtNum(viewing.orders) },
            ]}
          />
        </DeliveryDetailModal>
      )}

      {editing && (
        <div className="prod-modal" onClick={() => setEditing(null)}>
          <form className="card prod-modal-card dlv-detail-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveZone}>
            <div className="ord-drawer-head">
              <h2>{String(editing.id || "").startsWith("new-") ? "Add Zone" : "Edit Zone"}</h2>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setEditing(null)}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <label className="pfe-field">
              <span>Name</span>
              <input value={editing.name} onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label className="pfe-field">
              <span>City</span>
              <input value={editing.city} onChange={(e) => setEditing((f) => ({ ...f, city: e.target.value }))} />
            </label>
            <label className="pfe-field">
              <span>Area</span>
              <input value={editing.area || ""} onChange={(e) => setEditing((f) => ({ ...f, area: e.target.value }))} />
            </label>
            <label className="pfe-field">
              <span>Coverage</span>
              <input value={editing.coverage} onChange={(e) => setEditing((f) => ({ ...f, coverage: e.target.value }))} />
            </label>
            <label className="pfe-field">
              <span>Fee (KES)</span>
              <input type="number" value={editing.fee} onChange={(e) => setEditing((f) => ({ ...f, fee: e.target.value }))} />
            </label>
            <label className="pfe-field">
              <span>ETA</span>
              <input value={editing.eta} onChange={(e) => setEditing((f) => ({ ...f, eta: e.target.value }))} />
            </label>
            <div className="prod-actions rule-drawer-acts dlv-detail-acts">
              <button className="btn btn-purple btn-small" type="submit">Save changes</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
