import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales Reports" },
  { id: "participants", label: "Participant Reports" },
  { id: "products", label: "Product Reports" },
  { id: "discounts", label: "Discount Reports" },
  { id: "operational", label: "Operational Reports" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function pct(n) {
  if (n == null) return "0%";
  const v = Number(n);
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
}

function Delta({ value, label = "01 Apr - 30 Apr" }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const down = Number(value) < 0;
  return (
    <div className={`cat-stat-hint ${down ? "down" : "up"}`}>
      {down ? "↓" : "↑"} {Math.abs(Number(value)).toFixed(1)}% vs {label}
    </div>
  );
}

function catClass(name) {
  const id = String(name || "").toLowerCase();
  if (id.includes("cctv")) return "fd-cat-cctv";
  if (id.includes("voucher")) return "fd-cat-vouchers";
  if (id.includes("wifi") || id.includes("wi-fi")) return "fd-cat-wifi";
  if (id.includes("accessor")) return "fd-cat-accessories";
  if (id.includes("gadget")) return "fd-cat-gadgets";
  if (id.includes("access")) return "fd-cat-access";
  if (id.includes("cabl")) return "fd-cat-cabling";
  if (id.includes("power") || id.includes("other")) return "fd-cat-power";
  return "fd-cat-networking";
}

function HoverLine({ series, valueKey, color, tipLabel, money, tipIndex }) {
  const w = 280;
  const h = 150;
  const padX = 18;
  const padY = 24;
  const [hover, setHover] = useState(tipIndex);
  const values = (series || []).map((p) => p[valueKey] || 0);
  const max = Math.max(...values, 1);
  const coords = (series || []).map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(series.length - 1, 1);
    const y = h - padY - ((p[valueKey] || 0) / max) * (h - padY * 2);
    return { ...p, x, y };
  });
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = first && last ? `${line} L${last.x},${h - padY} L${first.x},${h - padY} Z` : "";
  const active = coords[hover] ?? coords[tipIndex] ?? coords[0];
  return (
    <div className="ca-chart-wrap">
      {active && (
        <div className="chart-tip-html ca-tip">
          {active.dateLabel}
          <span>{tipLabel}: {money ? kes(active[valueKey]) : fmtNum(active[valueKey])}</span>
        </div>
      )}
      <svg className="cd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={tipLabel}>
        <path d={area} fill={color === "#16a34a" ? "rgba(22,163,74,0.14)" : "rgba(109,40,217,0.14)"} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.4" />
        {coords.map((c, i) => (
          <g key={c.d}>
            {c.label ? <text x={c.x} y={h - 6} textAnchor="middle" className="comp-chart-lbl">{c.label}</text> : null}
            <rect x={c.x - 8} y={padY - 8} width="16" height={h - padY * 2 + 16} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        {active && (
          <>
            <line x1={active.x} y1={padY} x2={active.x} y2={h - padY} stroke="#c4b5fd" strokeDasharray="3 3" />
            <circle cx={active.x} cy={active.y} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}

function Donut({ parts, total, sub, center, valueKey = "count" }) {
  const slices = (parts || []).reduce((s, p) => s + (p[valueKey] || p.count || 0), 0) || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap fdc-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {(parts || []).map((p) => {
          const value = p[valueKey] || p.count || 0;
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
        <text x="70" y="64" textAnchor="middle" className="donut-total">{center || fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">{sub}</text>
      </svg>
      <ul className="donut-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{Number(p.pct).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FlashDropReports() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    api("/admin/flash-drop-reports")
      .then((d) => {
        setData(d);
        if (d.from) setFrom(d.from);
        if (d.to) setTo(d.to);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load reports."));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const kpis = data?.kpis || {};
  const series = data?.revenueSeries || [];
  const top = data?.topDrops || [];
  const cats = data?.categoryRevenue || [];
  const discounts = data?.discounts || [];
  const status = data?.status || [];
  const channels = data?.channels || [];
  const exports = data?.exportReports || [];
  const insights = data?.insights || [];
  const maxBar = Math.max(...discounts.map((d) => d.pct), 1);
  const compare = data?.compareLabel || "01 Apr - 30 Apr";

  function exportAll() {
    setToast("All reports exported");
  }

  function exportOne(name, format) {
    setToast(`${name} (${format.toUpperCase()}) exported`);
  }

  const showOverview = tab === "overview";
  const showSales = tab === "sales" || showOverview;
  const showParticipants = tab === "participants" || showOverview;
  const showProducts = tab === "products" || showOverview;
  const showDiscounts = tab === "discounts" || showOverview;
  const showOperational = tab === "operational" || showOverview;
  const showInsights = showOverview || tab === "operational";

  return (
    <div className="fd-page fdr-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Reports &amp; Export</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drop Reports &amp; Export
            <span className="prod-title-icon"><Icon name="file" size={16} /></span>
          </h1>
          <p>Generate detailed reports and export data for analysis.</p>
        </div>
        <div className="prod-actions ca-toolbar">
          <label className="ca-range">
            <Icon name="calendar" size={14} />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn btn-purple btn-small" type="button" onClick={exportAll}>
            <Icon name="download" size={14} /> Export All Reports
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Flash Drops</div>
            <div className="prod-stat-n purple">{fmtNum(kpis.drops)}</div>
            <Delta value={kpis.dropsDelta} label={compare} />
          </div>
          <div className="prod-stat-icon purple"><Icon name="bolt" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Revenue</div>
            <div className="prod-stat-n green">{kes(kpis.revenue)}</div>
            <Delta value={kpis.revenueDelta} label={compare} />
          </div>
          <div className="prod-stat-icon green"><Icon name="coin" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Items Sold</div>
            <div className="prod-stat-n orange">{fmtNum(kpis.sold)}</div>
            <Delta value={kpis.soldDelta} label={compare} />
          </div>
          <div className="prod-stat-icon orange"><Icon name="bag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Participants</div>
            <div className="prod-stat-n blue">{fmtNum(kpis.participants)}</div>
            <Delta value={kpis.participantsDelta} label={compare} />
          </div>
          <div className="prod-stat-icon blue"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Average Discount</div>
            <div className="prod-stat-n purple">{pct(kpis.avgDiscount)}</div>
            <Delta value={kpis.avgDiscountDelta} label={compare} />
          </div>
          <div className="prod-stat-icon purple"><Icon name="percent" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Conversion Rate</div>
            <div className="prod-stat-n green">{pct(kpis.conversion)}</div>
            <Delta value={kpis.conversionDelta} label={compare} />
          </div>
          <div className="prod-stat-icon green"><Icon name="trend" size={16} /></div>
        </article>
      </section>

      <nav className="pf-tabs fdr-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {(showSales || showOperational) && (
        <div className="ca-grid-4 fdr-charts">
          {showSales && (
            <>
              <section className="card pf-card">
                <h2>Revenue Over Time</h2>
                <HoverLine series={series} valueKey="revenue" color="#6D28D9" tipLabel="Revenue" money tipIndex={data?.tipIndex ?? 15} />
              </section>
              <section className="card pf-card">
                <h2>Items Sold Over Time</h2>
                <HoverLine series={series} valueKey="sold" color="#16a34a" tipLabel="Items Sold" tipIndex={data?.tipIndex ?? 15} />
              </section>
            </>
          )}
          {showOperational && (
            <section className="card pf-card">
              <h2>Flash Drops by Status</h2>
              <Donut parts={status} total={24} sub="Total Drops" center="24" />
            </section>
          )}
          {showSales && (
            <section className="card pf-card">
              <h2>Revenue by Category</h2>
              <Donut parts={cats} total={kpis.revenue} sub="Total Revenue" center="KSh 12.49M" valueKey="value" />
            </section>
          )}
        </div>
      )}

      {(showProducts || showOverview) && tab !== "discounts" && tab !== "participants" && (
        <div className="fdr-row2">
          <section className="card pf-card fdr-top">
            <h2>Top Performing Flash Drops</h2>
            <div className="fdr-table-scroll">
              <table className="table fdr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Drop / Product</th>
                    <th>Category</th>
                    <th>Start Date</th>
                    <th>Sold Items</th>
                    <th>Revenue (KSh)</th>
                    <th>Avg. Discount</th>
                    <th>Participants</th>
                    <th>Conversion</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r) => (
                    <tr key={r.sku}>
                      <td className="muted fdr-n">{r.n}</td>
                      <td>
                        <div className="fdr-prod">
                          {r.image ? <img src={r.image} alt="" /> : <span className="fdr-ph" />}
                          <span>
                            <strong>{r.name}</strong>
                            <em>{r.sku}</em>
                          </span>
                        </div>
                      </td>
                      <td><span className={`fd-cat ${catClass(r.category)}`}>{r.category}</span></td>
                      <td className="fdr-date">{r.startLabel}</td>
                      <td className="fdr-num">{fmtNum(r.sold)}</td>
                      <td className="fdr-num">{kes(r.revenue)}</td>
                      <td className="fdr-num">{r.discount}</td>
                      <td className="fdr-num">{fmtNum(r.participants)}</td>
                      <td className="fdr-num">{pct(r.conversion)}</td>
                      <td><span className="st-pill st-pub">Completed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link className="fdc-report" to="/flash-drops?tab=history">View All Flash Drops Reports →</Link>
          </section>

          {showOverview && (
            <aside className="fdr-export-side">
              <section className="card pf-card">
                <h2>Export Reports</h2>
                <ul className="fdr-export-list">
                  {exports.map((r) => (
                    <li key={r.id}>
                      <span>{r.name}</span>
                      <span className="fdr-export-btns">
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => exportOne(r.name, "pdf")}>PDF</button>
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => exportOne(r.name, "excel")}>Excel</button>
                      </span>
                    </li>
                  ))}
                </ul>
                <button className="link-reset fdr-schedule" type="button" onClick={() => setToast("Automated reports scheduled")}>
                  Schedule Automated Reports →
                </button>
              </section>
            </aside>
          )}
        </div>
      )}

      {(showDiscounts || showParticipants || showOverview) && (
        <div className="fdr-row3">
          {showDiscounts && (
            <section className="card pf-card">
              <h2>Discount Distribution</h2>
              <div className="fda-bars">
                {discounts.map((row) => (
                  <div key={row.label} className="ca-age-lbl fda-bar">
                    <span>{row.label}</span>
                    <span className="fda-bar-track">
                      <i style={{ width: `${(row.pct / maxBar) * 100}%` }} />
                    </span>
                    <b>{row.pct.toFixed(1)}%</b>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showParticipants && (
            <section className="card pf-card">
              <h2>Device &amp; Channel Performance</h2>
              <div className="fdr-table-scroll">
                <table className="table fdr-chan">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Participants</th>
                      <th>Items Sold</th>
                      <th>Revenue</th>
                      <th>Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((c) => (
                      <tr key={c.key}>
                        <td><strong>{c.name}</strong></td>
                        <td className="fdr-num">{fmtNum(c.participants)}</td>
                        <td className="fdr-num">{fmtNum(c.sold)}</td>
                        <td className="fdr-num">{kes(c.revenue)}</td>
                        <td className="fdr-num">{pct(c.conversion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {showInsights && (
            <section className="card pf-card">
              <h2>Insights</h2>
              <ul className="fda-insights">
                {insights.map((row) => (
                  <li key={row.text}>
                    <span className={`rule-ico ${row.tone}`}><Icon name={row.icon} size={14} /></span>
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <section className="pts-alert fd-banner fdr-foot">
        <Icon name="info" size={18} />
        <p>Reports are based on the selected date range and timezone (East Africa Time). Data is refreshed every 15 minutes.</p>
      </section>
    </div>
  );
}
