import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

function deltaCls(n, goodDown = false) {
  const v = Number(n) || 0;
  if (v === 0) return "";
  const positive = goodDown ? v < 0 : v > 0;
  return positive ? "up" : "down";
}

function deltaArrow(n) {
  return Number(n) >= 0 ? "↑" : "↓";
}

function typeCls(type) {
  if (type === "summary") return "dlvrpt-type-summary";
  if (type === "performance") return "dlvrpt-type-performance";
  if (type === "zone") return "dlvrpt-type-zone";
  if (type === "courier") return "dlvrpt-type-courier";
  if (type === "returns") return "dlvrpt-type-returns";
  if (type === "exceptions") return "dlvrpt-type-exceptions";
  if (type === "analytics") return "dlvrpt-type-analytics";
  return "dlvrpt-type-summary";
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap dlvrpt-donut">
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
      <ul className="donut-legend dlvrpt-legend">
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

function LineChart({ data }) {
  const labels = data?.labels || [];
  const shipments = data?.shipments || [];
  const successful = data?.successful || [];
  const w = 220;
  const h = 120;
  const pad = 18;
  const all = [...shipments, ...successful];
  const max = Math.max(...all, 1);
  const min = 0;

  function pts(values) {
    return values
      .map((v, i) => {
        const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="dlvrpt-line">
      <svg viewBox={`0 0 ${w} ${h}`} className="dlvrpt-line-svg" aria-hidden="true">
        {[0, 0.5, 1].map((t) => {
          const y = h - pad - t * (h - pad * 2);
          return <line key={t} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />;
        })}
        <polyline fill="none" stroke="#6c5dd3" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={pts(shipments)} />
        <polyline fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={pts(successful)} />
      </svg>
      <div className="dlvrpt-line-legend">
        <span><i style={{ background: "#6c5dd3" }} /> Shipments</span>
        <span><i style={{ background: "#16a34a" }} /> Successful</span>
      </div>
      <div className="dlvrpt-line-labels">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export default function DeliveryReports() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [zoneF, setZoneF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      type: next.type ?? typeF,
      zone: next.zone ?? zoneF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.type) p.set("type", vals.type);
    if (vals.zone) p.set("zone", vals.zone);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/delivery-reports?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load delivery reports."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, typeF, zoneF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setCustomOpen(false);
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
    setTypeF("");
    setZoneF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", type: "", zone: "", page: 1 });
  }

  function downloadReport(row, e) {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    try {
      const lines = [
        "Field,Value",
        `Name,${JSON.stringify(row.name || "")}`,
        `Type,${JSON.stringify(row.typeLabel || row.type || "")}`,
        `Date Range,${JSON.stringify(row.range || "")}`,
        `Shipments,${row.shipments ?? 0}`,
        `Success Rate,${row.successRate ?? 0}%`,
        `Avg Delivery Time,${JSON.stringify(row.avgTime || "")}`,
        `Generated On,${JSON.stringify(`${row.generated || ""} ${row.generatedTime || ""}`.trim())}`,
        `Zone,${JSON.stringify(row.zone || "")}`,
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${String(row.name || "delivery-report").replace(/[^\w\-]+/g, "-").toLowerCase()}.csv`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      setMenu(null);
      setToast(`Downloaded “${row.name}”`);
    } catch (err) {
      setError(err.message || "Download failed.");
    }
  }

  function openReport(row, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(row);
  }

  if (!data) {
    return (
      <div className="dlvrpt-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/reports?tab=delivery">Reports</Link>
          <span>›</span>
          <strong>Delivery Reports</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading delivery reports…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.reports || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  function exportAllReports() {
    const header = ["#", "Report Name", "Type", "Date Range", "Shipments", "Success Rate", "Avg Delivery Time", "Generated On"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        JSON.stringify(r.name || ""),
        JSON.stringify(r.typeLabel || ""),
        JSON.stringify(r.range || ""),
        r.shipments ?? 0,
        `${r.successRate ?? 0}%`,
        JSON.stringify(r.avgTime || ""),
        JSON.stringify(`${r.generated || ""} ${r.generatedTime || ""}`.trim()),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delivery-reports.csv";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setToast("Exported all reports");
  }

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
  }

  return (
    <div className="dlvrpt-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/reports?tab=delivery">Reports</Link>
        <span>›</span>
        <strong>Delivery Reports</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="chart" size={16} /></span>
            Delivery Reports
          </h1>
          <p>Analyze delivery performance, shipments, returns and courier productivity.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportAllReports}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <div className="dlvrpt-dd-wrap">
            <button
              className="btn btn-purple btn-small dlvrpt-create-dd"
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
              <div className="dlvrpt-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Custom report builder coming soon"); }}>Build Custom Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Scheduled report created"); }}>Schedule Report</button>
                <button type="button" onClick={() => { setCustomOpen(false); setToast("Template gallery opening soon"); }}>From Template</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six dlvrpt-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Shipments</div>
            <div className="prod-stat-n purple">{fmtNum(stats.totalShipments)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalShipmentsDelta)}`}>
              {deltaArrow(stats.totalShipmentsDelta)} {Math.abs(stats.totalShipmentsDelta).toFixed(1)}% {stats.totalShipmentsHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="truck" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Successful Deliveries</div>
            <div className="prod-stat-n green">{fmtNum(stats.successful)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.successfulDelta)}`}>
              {deltaArrow(stats.successfulDelta)} {Math.abs(stats.successfulDelta).toFixed(1)}% {stats.successfulHint}
            </div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Delivery Time</div>
            <div className="prod-stat-n orange">{stats.avgTime}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.avgTimeDelta, true)}`}>
              {deltaArrow(stats.avgTimeDelta)} {Math.abs(stats.avgTimeDelta).toFixed(1)} day {stats.avgTimeHint}
            </div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Failed Deliveries</div>
            <div className="prod-stat-n red">{fmtNum(stats.failed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.failedDelta, true)}`}>
              {deltaArrow(stats.failedDelta)} {Math.abs(stats.failedDelta).toFixed(1)}% {stats.failedHint}
            </div>
          </div>
          <div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Return Rate</div>
            <div className="prod-stat-n blue">{Number(stats.returnRate).toFixed(1)}%</div>
            <div className={`cat-stat-hint ${deltaCls(stats.returnRateDelta, true)}`}>
              {deltaArrow(stats.returnRateDelta)} {Math.abs(stats.returnRateDelta).toFixed(1)}% {stats.returnRateHint}
            </div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="refresh" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Refunds (This Month)</div>
            <div className="prod-stat-n purple">{fmtKes(stats.refunds)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.refundsDelta)}`}>
              {deltaArrow(stats.refundsDelta)} {Math.abs(stats.refundsDelta).toFixed(1)}% {stats.refundsHint}
            </div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="coin" size={16} /></div>
        </article>
      </section>

      <div className="dlvrpt-layout">
        <div className="dlvrpt-main">
          <section className="card prod-filters">
            <form className="prod-filter-row dlvrpt-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports..." />
              </div>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Report Types</option>
                {(data.filters?.types || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select value={zoneF} onChange={(e) => { setZoneF(e.target.value); setPage(1); }}>
                <option value="">All Zones</option>
                {(data.filters?.zones || []).map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <div className="dlvrpt-dates">
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

          <section className="card dlvrpt-table-card">
            <div className="prod-table-wrap dlvrpt-scroll">
              <table className="table prod-table dlvrpt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Report Name</th>
                    <th>Type</th>
                    <th>Date Range</th>
                    <th>Shipments</th>
                    <th>Success Rate</th>
                    <th>Avg. Delivery Time</th>
                    <th>Generated On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td><strong>{r.name}</strong></td>
                      <td><span className={`dlvrpt-type ${typeCls(r.type)}`}>{r.typeLabel}</span></td>
                      <td>{r.range}</td>
                      <td><strong>{fmtNum(r.shipments)}</strong></td>
                      <td>{Number(r.successRate).toFixed(1)}%</td>
                      <td>{r.avgTime}</td>
                      <td>
                        <div>{r.generated}</div>
                        <div className="muted dlvrpt-sub">{r.generatedTime}</div>
                      </td>
                      <td>
                        <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                          <button type="button" title="View report" onClick={(e) => openReport(r, e)}>
                            <Icon name="eye" size={14} />
                          </button>
                          <button type="button" title="Download CSV" onClick={(e) => downloadReport(r, e)}>
                            <Icon name="download" size={14} />
                          </button>
                          <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length}>
                            <button type="button" onClick={(e) => openReport(r, e)}>View details</button>
                            <button type="button" onClick={(e) => downloadReport(r, e)}>Download CSV</button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenu(null);
                                if (navigator.clipboard?.writeText) {
                                  navigator.clipboard.writeText(`${window.location.origin}/reports?tab=delivery&report=${r.id}`).catch(() => {});
                                }
                                setToast(`Share link copied for “${r.name}”`);
                              }}
                            >
                              Copy share link
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!confirm(`Delete report “${r.name}”?`)) { setMenu(null); return; }
                                setData((d) => ({
                                  ...d,
                                  reports: (d.reports || []).filter((x) => x.id !== r.id),
                                  total: Math.max(0, (d.total || 1) - 1),
                                }));
                                setMenu(null);
                                setToast(`Deleted “${r.name}”`);
                              }}
                            >
                              Delete
                            </button>
                          </DeliveryRowMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="9" className="muted">No reports match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} reports</span>
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

        <aside className="dlvrpt-side">
          <section className="card pf-card">
            <div className="dlvrpt-side-head">
              <h2><Icon name="trend" size={14} /> Deliveries Over Time</h2>
              <button className="link-reset" type="button" onClick={() => setToast("Full report coming soon")}>
                View Full Report
              </button>
            </div>
            <LineChart data={data.deliveriesOverTime} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Shipments by Status</h2>
            <Donut parts={data.statusDonut} total={stats.totalShipments} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="bulb" size={14} /> Key Insights</h2>
            <ul className="dlvrpt-insights">
              {(data.insights || []).map((ins) => (
                <li key={ins.key} className={`tone-${ins.tone}`}>
                  <span className="dlvrpt-ins-ico"><Icon name={ins.icon} size={14} /></span>
                  <span>{ins.text}</span>
                </li>
              ))}
            </ul>
            {data.cta && (
              <div className="dlvrpt-cta">
                <p>{data.cta.text}</p>
                <button className="btn btn-purple btn-small" type="button" onClick={() => setToast("Custom report builder coming soon")}>
                  {data.cta.button}
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card dlvrpt-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}

      {viewing && (
        <DeliveryDetailModal
          title={viewing.name}
          subtitle={viewing.range}
          statusNode={<span className={`dlvrpt-type ${typeCls(viewing.type)}`}>{viewing.typeLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <>
              <button className="btn btn-purple btn-small" type="button" onClick={(e) => downloadReport(viewing, e)}>
                <Icon name="download" size={14} /> Download CSV
              </button>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                onClick={() => {
                  window.print();
                }}
              >
                Print
              </button>
            </>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Report", value: <strong>{viewing.name}</strong> },
              { label: "Type", value: viewing.typeLabel },
              { label: "Date range", value: viewing.range },
              { label: "Shipments", value: fmtNum(viewing.shipments) },
              { label: "Success rate", value: `${Number(viewing.successRate).toFixed(1)}%` },
              { label: "Avg time", value: viewing.avgTime },
              { label: "Zone", value: viewing.zone || "—" },
              { label: "Generated", value: `${viewing.generated} · ${viewing.generatedTime}` },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
