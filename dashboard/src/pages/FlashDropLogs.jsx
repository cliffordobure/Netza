import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function pagerItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages]);
  if (page <= 4) [2, 3, 4, 5].forEach((n) => set.add(n));
  else if (page >= pages - 3) [pages - 4, pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));
  else [page - 1, page, page + 1].forEach((n) => set.add(n));
  return [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
}

function Delta({ value }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const down = Number(value) < 0;
  return (
    <div className={`cat-stat-hint ${down ? "down" : "up"}`}>
      {down ? "↓" : "↑"} {Math.abs(Number(value)).toFixed(1)}% {down ? "vs previous 7 days" : "vs yesterday"}
    </div>
  );
}

function Delta7({ value }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const down = Number(value) < 0;
  return (
    <div className={`cat-stat-hint ${down ? "down" : "up"}`}>
      {down ? "↓" : "↑"} {Math.abs(Number(value)).toFixed(1)}% vs previous 7 days
    </div>
  );
}

function HoverLine({ series, tipIndex }) {
  const w = 280;
  const h = 150;
  const padX = 18;
  const padY = 24;
  const [hover, setHover] = useState(tipIndex);
  const values = (series || []).map((p) => p.activities || 0);
  const max = Math.max(...values, 1);
  const coords = (series || []).map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(series.length - 1, 1);
    const y = h - padY - ((p.activities || 0) / max) * (h - padY * 2);
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
          <span>{fmtNum(active.activities)} activities</span>
        </div>
      )}
      <svg className="cd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Activity trend">
        <path d={area} fill="rgba(109,40,217,0.16)" />
        <path d={line} fill="none" stroke="#6D28D9" strokeWidth="2.4" />
        {coords.map((c, i) => (
          <g key={c.d}>
            {c.label ? <text x={c.x} y={h - 6} textAnchor="middle" className="comp-chart-lbl">{c.label}</text> : null}
            <rect x={c.x - 8} y={padY - 8} width="16" height={h - padY * 2 + 16} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        {active && (
          <>
            <line x1={active.x} y1={padY} x2={active.x} y2={h - padY} stroke="#c4b5fd" strokeDasharray="3 3" />
            <circle cx={active.x} cy={active.y} r="4.5" fill="#6D28D9" stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}

function roleCls(key) {
  if (key === "super_admin") return "fdl-role-super";
  if (key === "admin") return "fdl-role-admin";
  if (key === "manager") return "fdl-role-mgr";
  return "fdl-role-sys";
}

export default function FlashDropLogs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({});
  const [q, setQ] = useState("");
  const [actionF, setActionF] = useState("");
  const [userF, setUserF] = useState("");
  const [dropF, setDropF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function query() {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.trim()) qs.set("q", q.trim());
    if (actionF) qs.set("action", actionF);
    if (userF) qs.set("user", userF);
    if (dropF) qs.set("drop", dropF);
    if (statusF) qs.set("status", statusF);
    return qs.toString();
  }

  function load() {
    api(`/admin/flash-drop-logs?${query()}`)
      .then((d) => {
        setRows(d.logs || []);
        setTotal(d.total || 0);
        setMeta(d);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load activity logs."));
  }

  useEffect(() => { load(); }, [page, limit, q, actionF, userF, dropF, statusF]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    function closeMenu() { setMenu(null); }
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const stats = meta.stats || {};
  const overview = meta.overview || {};
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const pageNums = pagerItems(page, pages);

  function resetFilters() {
    setQ("");
    setActionF("");
    setUserF("");
    setDropF("");
    setStatusF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
  }

  function exportCsv() {
    const header = ["#", "Date & Time", "User", "Role", "Action", "Flash Drop", "SKU", "Details", "IP Address", "Status"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        `"${r.atLabel}"`,
        `"${r.userName}"`,
        r.userRole,
        r.actionLabel,
        `"${r.dropName}"`,
        r.dropSku,
        `"${r.details}"`,
        r.ip,
        r.statusLabel,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-flash-drop-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Activity logs exported");
  }

  return (
    <div className="fd-page fdl-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Flash Drop Logs</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drop Activity Logs
            <span className="prod-title-icon"><Icon name="clipboard" size={16} /></span>
          </h1>
          <p>Track all actions and changes made in Flash Drops.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Logs
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Activities</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="list" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Today&apos;s Activities</div>
            <div className="prod-stat-n green">{fmtNum(stats.today)}</div>
            <Delta value={stats.todayDelta} />
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Unique Users</div>
            <div className="prod-stat-n orange">{fmtNum(stats.uniqueUsers)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Flash Drops Affected</div>
            <div className="prod-stat-n blue">{fmtNum(stats.dropsAffected)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="bolt" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Last 7 Days</div>
            <div className="prod-stat-n pink">{fmtNum(stats.last7)}</div>
            <Delta7 value={stats.last7Delta} />
          </div>
          <div className="prod-stat-icon pink"><Icon name="calendar" size={16} /></div>
        </article>
      </section>

      <div className="pts-layout has-side comp-layout">
        <section className="card cat-table-card">
          <form
            className="attr-filters fdl-filters"
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
          >
            <div className="prod-search">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search activities..." />
            </div>
            <select value={actionF} onChange={(e) => { setActionF(e.target.value); setPage(1); }}>
              <option value="">All Actions</option>
              {(meta.actionsList || []).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <select value={userF} onChange={(e) => { setUserF(e.target.value); setPage(1); }}>
              <option value="">All Users</option>
              {(meta.usersList || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={dropF} onChange={(e) => { setDropF(e.target.value); setPage(1); }}>
              <option value="">All Flash Drops</option>
              {(meta.dropsList || []).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="auto">Auto</option>
            </select>
            <div className="ord-dates" title="Select Date Range">
              <Icon name="calendar" size={14} />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="muted">–</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-small" type="submit">
              <Icon name="filter" size={14} /> Filter
            </button>
            <button className="link-reset" type="button" onClick={resetFilters}>Reset</button>
          </form>

          <div className="fdl-table-scroll">
            <table className="table fdl-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date &amp; Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Flash Drop / Details</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted fdl-n">{r.n}</td>
                    <td className="fdl-when">{r.atLabel}</td>
                    <td>
                      <div className="fdl-user">
                        <img src={r.avatar} alt="" />
                        <span>
                          <strong>{r.userName}</strong>
                          <span className={`fdl-role ${roleCls(r.roleKey)}`}>{r.userRole}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`fdl-act fdl-act-${r.actionTone}`}>
                        <Icon name={r.actionIcon} size={13} />
                        {r.actionLabel}
                      </span>
                    </td>
                    <td>
                      <div className="fdl-drop-cell">
                        <strong>{r.dropName}</strong>
                        {r.dropSku ? <em>ID: {r.dropSku}</em> : null}
                        {r.details ? <p>{r.details}</p> : null}
                      </div>
                    </td>
                    <td className="fdl-ip">{r.ip || "—"}</td>
                    <td>
                      <span className={`st-pill ${r.status === "auto" ? "fdl-st-auto" : "st-pub"}`}>{r.statusLabel}</span>
                    </td>
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
                            <div className="ord-menu" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => { setViewing(r); setMenu(null); }}>View details</button>
                              <button type="button" onClick={() => { exportCsv(); setMenu(null); }}>Export row</button>
                            </div>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="8" className="muted">No activity logs match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} activities</span>
            <div className="pager-btns">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevronLeft" size={14} /></button>
              {pageNums.map((n, i) => (
                <span key={n} className="cd-page-cluster">
                  {i > 0 && n - pageNums[i - 1] > 1 && <span className="muted">…</span>}
                  <button type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
                </span>
              ))}
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}><Icon name="chevronRight" size={14} /></button>
            </div>
            <label className="pager-rows">
              Rows per page
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </footer>
        </section>

        <aside className="pts-side rwd-side">
          <section className="card pts-widget">
            <div className="fdl-wid-head">
              <h3>Activity Overview</h3>
              <span className="muted">Last 7 Days</span>
            </div>
            <HoverLine series={meta.days || []} tipIndex={meta.tipIndex ?? 6} />
            <ul className="fdl-legend">
              <li><i className="purple" /> Total Activities <b>{fmtNum(overview.total)}</b></li>
              <li><i className="green" /> Successful <b>{fmtNum(overview.successful)}</b></li>
              <li><i className="red" /> Failed <b>{fmtNum(overview.failed)}</b></li>
              <li><i className="grey" /> System <b>{fmtNum(overview.system)}</b></li>
            </ul>
          </section>
          <section className="card pts-widget">
            <div className="fdl-wid-head">
              <h3>Top Active Users</h3>
              <button className="link-reset" type="button">View All</button>
            </div>
            <ul className="fdl-users">
              {(meta.topUsers || []).map((u) => (
                <li key={u.id}>
                  <img src={u.avatar} alt="" />
                  <div>
                    <strong>{u.name}</strong>
                    <span className={`fdl-role ${roleCls(u.roleKey)}`}>{u.role}</span>
                  </div>
                  <b>{fmtNum(u.count)}</b>
                </li>
              ))}
            </ul>
          </section>
          <section className="card pts-widget cd-note fdl-retention">
            <Icon name="info" size={18} />
            <div>
              <p>Logs are automatically deleted after 24 months. You can export important logs for backup.</p>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/flash-drops?tab=settings")}>
                <Icon name="gear" size={14} /> Manage Retention Settings
              </button>
            </div>
          </section>
        </aside>
      </div>

      <section className="pts-alert fd-banner fdl-foot">
        <Icon name="info" size={18} />
        <p>All times are shown in East Africa Time (EAT). Logs are updated in real-time.</p>
      </section>

      {viewing && (
        <div className="prod-modal" onClick={() => setViewing(null)}>
          <div className="card prod-modal-card rule-drawer" onClick={(e) => e.stopPropagation()}>
            <h2>Activity Details</h2>
            <p><strong>{viewing.actionLabel}</strong> · {viewing.atLabel}</p>
            <p className="muted">{viewing.userName} ({viewing.userRole})</p>
            <p>{viewing.dropName}{viewing.dropSku ? ` · ${viewing.dropSku}` : ""}</p>
            <p>{viewing.details}</p>
            <p className="muted">IP: {viewing.ip} · Status: {viewing.statusLabel}</p>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="button" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
