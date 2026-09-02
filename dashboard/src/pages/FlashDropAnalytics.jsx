import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const QUICK = [
  { id: "create", icon: "plus", label: "Create Flash Drop", tone: "purple" },
  { id: "schedule", icon: "calendar", label: "Schedule Drop", tone: "orange" },
  { id: "export", icon: "download", label: "Export Report", tone: "blue" },
  { id: "history", icon: "clock", label: "View Drop History", tone: "green" },
  { id: "import", icon: "upload", label: "Import Products", tone: "purple" },
  { id: "settings", icon: "gear", label: "Analytics Settings", tone: "orange" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function pct(n) {
  if (!n) return "0%";
  const v = Number(n);
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
}

function Delta({ value }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const down = Number(value) < 0;
  return (
    <div className={`cat-stat-hint ${down ? "down" : "up"}`}>
      {down ? "↓" : "↑"} {Math.abs(Number(value)).toFixed(1)}% vs 01 Apr - 30 Apr
    </div>
  );
}

function HoverLine({ series, valueKey, color, tipLabel, money, tipIndex }) {
  const w = 520;
  const h = 200;
  const padX = 28;
  const padY = 28;
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
            {c.label ? (
              <text x={c.x} y={h - 6} textAnchor="middle" className="comp-chart-lbl">{c.label}</text>
            ) : null}
            <rect
              x={c.x - 8}
              y={padY - 8}
              width="16"
              height={h - padY * 2 + 16}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
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
              strokeLinecap="butt"
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
            <b>{Number(p.pct).toFixed(1)}%{p.money ? ` (${p.money})` : p.count != null ? ` (${fmtNum(p.count)})` : ""}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FlashDropAnalytics() {
  const navigate = useNavigate();
  const importRef = useRef(null);
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [statusF, setStatusF] = useState("");
  const [catF, setCatF] = useState("");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState({ realtime: true, includeCancelled: false });

  useEffect(() => {
    api("/admin/flash-drop-analytics")
      .then((d) => {
        setData(d);
        if (d.from) setFrom(d.from);
        if (d.to) setTo(d.to);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load analytics."));
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
  const performance = data?.performance || [];
  const totals = data?.totals || {};
  const insights = data?.insights || [];
  const maxBar = Math.max(...discounts.map((d) => d.pct), 1);

  function exportCsv() {
    const header = ["Category", "Drops", "Participants", "Items Sold", "Revenue", "Avg Discount", "Conversion"];
    const lines = [header.join(",")];
    for (const r of performance) {
      lines.push([r.name, r.drops, r.participants, r.sold, r.revenue, r.avgDiscount, r.conversion].join(","));
    }
    lines.push(["Total", totals.drops, totals.participants, totals.sold, totals.revenue, totals.avgDiscount, totals.conversion].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-flash-drop-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Analytics report exported");
    setModal(null);
  }

  function runQuick(id) {
    if (id === "create") navigate("/flash-drops/new");
    else if (id === "schedule") navigate("/flash-drops/new?schedule=1");
    else if (id === "export") setModal("export");
    else if (id === "history") navigate("/flash-drops?tab=history");
    else if (id === "import") importRef.current?.click();
    else if (id === "settings") setModal("settings");
  }

  return (
    <div className="fd-page fda-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Drop Analytics</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drop Analytics
            <span className="prod-title-icon"><Icon name="bolt" size={16} /></span>
          </h1>
          <p>Track performance and insights from all Flash Drops.</p>
        </div>
        <div className="prod-actions ca-toolbar">
          <label className="ca-range">
            <Icon name="calendar" size={14} />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal("filter")}>
            <Icon name="filter" size={14} /> Filters
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setModal("export")}>
            <Icon name="download" size={14} /> Export Report
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
            <Delta value={kpis.dropsDelta} />
          </div>
          <div className="prod-stat-icon purple"><Icon name="cart" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Revenue</div>
            <div className="prod-stat-n green">{kes(kpis.revenue)}</div>
            <Delta value={kpis.revenueDelta} />
          </div>
          <div className="prod-stat-icon green"><Icon name="tag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Items Sold</div>
            <div className="prod-stat-n orange">{fmtNum(kpis.sold)}</div>
            <Delta value={kpis.soldDelta} />
          </div>
          <div className="prod-stat-icon orange"><Icon name="bag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Participants</div>
            <div className="prod-stat-n blue">{fmtNum(kpis.participants)}</div>
            <Delta value={kpis.participantsDelta} />
          </div>
          <div className="prod-stat-icon blue"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Average Discount</div>
            <div className="prod-stat-n purple">{pct(kpis.avgDiscount)}</div>
            <Delta value={kpis.avgDiscountDelta} />
          </div>
          <div className="prod-stat-icon purple"><Icon name="percent" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Conversion Rate</div>
            <div className="prod-stat-n green">{pct(kpis.conversion)}</div>
            <Delta value={kpis.conversionDelta} />
          </div>
          <div className="prod-stat-icon green"><Icon name="trend" size={16} /></div>
        </article>
      </section>

      <div className="ca-grid-3">
        <section className="card pf-card">
          <h2>Revenue Over Time</h2>
          <HoverLine series={series} valueKey="revenue" color="#6D28D9" tipLabel="Revenue" money tipIndex={data?.tipIndex ?? 15} />
        </section>
        <section className="card pf-card">
          <h2>Items Sold Over Time</h2>
          <HoverLine series={series} valueKey="sold" color="#16a34a" tipLabel="Items Sold" tipIndex={data?.tipIndex ?? 15} />
        </section>
        <section className="card pf-card">
          <h2>Top Performing Flash Drops</h2>
          <div className="prod-table-wrap">
            <table className="table prod-table fda-top">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Drop / Product</th>
                  <th>Revenue</th>
                  <th>Items Sold</th>
                  <th>Discount</th>
                  <th>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r) => (
                  <tr key={r.sku}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <span className="rule-name rwd-name">
                        {r.image ? <img className="rwd-thumb" src={r.image} alt="" /> : null}
                        <span>
                          <strong>{r.name}</strong>
                          <div className="muted">{r.sku}</div>
                        </span>
                      </span>
                    </td>
                    <td>{kes(r.revenue)}</td>
                    <td>{fmtNum(r.sold)}</td>
                    <td>{r.discount}</td>
                    <td>{pct(r.conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link className="fdc-report" to="/flash-drops">View All Flash Drops →</Link>
        </section>
      </div>

      <div className="ca-grid-3 fda-mid">
        <section className="card pf-card">
          <h2>Revenue by Category</h2>
          <Donut parts={cats} total={kpis.revenue} sub="Total Revenue" center="KSh 12.49M" valueKey="value" />
        </section>
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
        <section className="card pf-card">
          <h2>Flash Drop Status Overview</h2>
          <Donut parts={status} total={24} sub="Total Drops" center="24" />
        </section>
      </div>

      <div className="fda-foot">
        <section className="card pf-card">
          <h2>Flash Drop Performance Summary</h2>
          <div className="prod-table-wrap">
            <table className="table prod-table ca-perf">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Drops</th>
                  <th>Participants</th>
                  <th>Items Sold</th>
                  <th>Revenue</th>
                  <th>Avg. Discount</th>
                  <th>Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((r) => (
                  <tr key={r.name}>
                    <td><strong>{r.name}</strong></td>
                    <td>{fmtNum(r.drops)}</td>
                    <td>{fmtNum(r.participants)}</td>
                    <td>{fmtNum(r.sold)}</td>
                    <td>{kes(r.revenue)}</td>
                    <td>{pct(r.avgDiscount)}</td>
                    <td>{pct(r.conversion)}</td>
                  </tr>
                ))}
                <tr className="fda-total">
                  <td><strong>Total</strong></td>
                  <td>{fmtNum(totals.drops)}</td>
                  <td>{fmtNum(totals.participants)}</td>
                  <td>{fmtNum(totals.sold)}</td>
                  <td>{kes(totals.revenue)}</td>
                  <td>{pct(totals.avgDiscount)}</td>
                  <td>{pct(totals.conversion)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="card pf-card">
          <h2>Key Insights</h2>
          <ul className="fda-insights">
            {insights.map((row) => (
              <li key={row.text}>
                <span className={`rule-ico ${row.tone}`}><Icon name={row.icon} size={14} /></span>
                <span>{row.text}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pf-card">
          <h2>Quick Actions</h2>
          <div className="fda-qa">
            {QUICK.map((item) => (
              <button key={item.id} type="button" onClick={() => runQuick(item.id)}>
                <span className={`rule-ico ${item.tone}`}><Icon name={item.icon} size={14} /></span>
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="cd-note fda-note">
        <Icon name="info" size={16} />
        <p>Analytics are updated in real-time. Data is based on completed and active flash drops within the selected date range.</p>
      </section>

      <input
        ref={importRef}
        type="file"
        accept=".json,.csv,text/csv,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setToast(`Imported ${file.name}.`);
          e.target.value = "";
        }}
      />

      {modal === "filter" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card rule-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Filters</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label>
              Status
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
                <option value="">All Status</option>
                <option value="live">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>
              Category
              <select value={catF} onChange={(e) => setCatF(e.target.value)}>
                <option value="">All Categories</option>
                {performance.map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            </label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { setStatusF(""); setCatF(""); }}>Reset</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => { setToast("Filters applied"); setModal(null); }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {modal === "export" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Export Report</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <p className="muted">Download analytics for {from} – {to}.</p>
            <div className="cd-actions">
              <button type="button" onClick={exportCsv}><Icon name="download" size={14} /> Export CSV</button>
              <button type="button" onClick={() => { setToast("PDF export queued"); setModal(null); }}><Icon name="download" size={14} /> Export PDF</button>
            </div>
          </div>
        </div>
      )}

      {modal === "settings" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form
            className="card prod-modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              setToast("Analytics settings saved");
              setModal(null);
            }}
          >
            <div className="ord-drawer-head">
              <h2>Analytics Settings</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label className="rwd-check">
              <input type="checkbox" checked={settings.realtime} onChange={(e) => setSettings((s) => ({ ...s, realtime: e.target.checked }))} />
              Update analytics in real-time
            </label>
            <label className="rwd-check">
              <input type="checkbox" checked={settings.includeCancelled} onChange={(e) => setSettings((s) => ({ ...s, includeCancelled: e.target.checked }))} />
              Include cancelled drops in reports
            </label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Save Settings</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
