import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "all", label: "All Participants" },
  { id: "active", label: "Active Now" },
  { id: "winners", label: "Winners" },
  { id: "spenders", label: "Top Spenders" },
  { id: "new", label: "New Participants" },
];

const QUICK = [
  { id: "entries", icon: "list", label: "View All Entries", tone: "purple" },
  { id: "points", icon: "star", label: "Award Points", tone: "orange" },
  { id: "notify", icon: "megaphone", label: "Send Notification", tone: "blue" },
  { id: "export", icon: "download", label: "Export Participants", tone: "green" },
  { id: "winners", icon: "trophy", label: "View Winners", tone: "purple" },
  { id: "block", icon: "ban", label: "Block Participant", tone: "orange" },
  { id: "merge", icon: "users", label: "Merge Accounts", tone: "blue" },
  { id: "settings", icon: "gear", label: "Participant Settings", tone: "green" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fmtPhone(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return phone || "—";
}

function fmtLast(value) {
  if (!value) return "—";
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
  return `${date}, ${time.replace("AM", "AM").replace("PM", "PM")}`;
}

function groupCls(level) {
  const l = String(level || "BRONZE").toUpperCase();
  if (l === "GOLD") return "grp-gold";
  if (l === "SILVER") return "grp-silver";
  return "grp-bronze";
}

function groupLabel(level) {
  const l = String(level || "BRONZE").toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
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
      {down ? "↓" : "↑"} {Math.abs(Number(value)).toFixed(1)}% vs last 30 days
    </div>
  );
}

function HoverLine({ series, tipIndex }) {
  const w = 520;
  const h = 180;
  const padX = 28;
  const padY = 28;
  const [hover, setHover] = useState(tipIndex);
  const values = (series || []).map((p) => p.participants || 0);
  const max = Math.max(...values, 1);
  const coords = (series || []).map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(series.length - 1, 1);
    const y = h - padY - ((p.participants || 0) / max) * (h - padY * 2);
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
          <span>Participants {fmtNum(active.participants)}</span>
        </div>
      )}
      <svg className="cd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Participants growth">
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

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.count || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap fdc-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {(parts || []).map((p) => {
          const value = p.count || 0;
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

export default function FlashDropParticipants() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({});
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [dropF, setDropF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [modal, setModal] = useState(null);
  const [pointsAmt, setPointsAmt] = useState("200");
  const [note, setNote] = useState("");
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeTo, setMergeTo] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState({ realtime: true, allowBanned: false });

  function query() {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit), tab });
    if (q.trim()) qs.set("q", q.trim());
    if (dropF) qs.set("drop", dropF);
    if (statusF) qs.set("status", statusF);
    if (channelF) qs.set("channel", channelF);
    return qs.toString();
  }

  function load() {
    api(`/admin/flash-drop-participants?${query()}`)
      .then((d) => {
        setRows(d.participants || []);
        setTotal(d.total || 0);
        setMeta(d);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load participants."));
  }

  useEffect(() => { load(); }, [page, limit, tab, q, dropF, statusF, channelF]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = meta.stats || {};
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const pageNums = pagerItems(page, pages);
  const maxDrop = Math.max(...(meta.topDrops || []).map((d) => d.pct), 1);

  function exportCsv() {
    const header = ["#", "Name", "Phone", "Email", "Drops", "Entries", "Spent", "Points", "Status", "Last Active"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([r.n, `"${r.name}"`, r.phone, r.email, r.drops, r.entries, r.spent, r.points, r.status, r.lastAt].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netza-flash-drop-participants.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Participants exported");
    setModal(null);
  }

  function runQuick(id) {
    if (id === "export") exportCsv();
    else if (id === "winners") { setTab("winners"); setPage(1); }
    else if (id === "entries") setModal("entries");
    else if (id === "points") { setViewing(viewing || rows[0]); setModal("points"); }
    else if (id === "notify") { setViewing(viewing || rows[0]); setModal("notify"); }
    else if (id === "block") { setViewing(viewing || rows[0]); setModal("block"); }
    else if (id === "merge") setModal("merge");
    else if (id === "settings") setModal("settings");
  }

  return (
    <div className="fd-page fdp-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Participants</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drop Participants
            <span className="prod-title-icon"><Icon name="users" size={16} /></span>
          </h1>
          <p>View and manage all participants in flash drops.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Report
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Participants</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <Delta value={stats.totalDelta} />
          </div>
          <div className="prod-stat-icon purple"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Participants</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <Delta value={stats.activeDelta} />
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Entries</div>
            <div className="prod-stat-n orange">{fmtNum(stats.entries)}</div>
            <Delta value={stats.entriesDelta} />
          </div>
          <div className="prod-stat-icon orange"><Icon name="cart" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Winners</div>
            <div className="prod-stat-n blue">{fmtNum(stats.winners)}</div>
            <Delta value={stats.winnersDelta} />
          </div>
          <div className="prod-stat-icon blue"><Icon name="trophy" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Awarded</div>
            <div className="prod-stat-n pink">{fmtNum(stats.points)}</div>
            <Delta value={stats.pointsDelta} />
          </div>
          <div className="prod-stat-icon pink"><Icon name="star" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. Discount Claimed</div>
            <div className="prod-stat-n purple">{stats.avgDiscount ? `${Number(stats.avgDiscount).toFixed(1)}%` : "0%"}</div>
            <Delta value={stats.avgDiscountDelta} />
          </div>
          <div className="prod-stat-icon purple"><Icon name="tag" size={16} /></div>
        </article>
      </section>

      <div className="pts-layout has-side comp-layout">
        <section className="card cat-table-card">
          <form
            className="attr-filters"
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
          >
            <div className="prod-search">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search participants..." />
            </div>
            <select value={dropF} onChange={(e) => { setDropF(e.target.value); setPage(1); }}>
              <option value="">All Flash Drops</option>
              {(meta.drops || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
            <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
              <option value="">All Channels</option>
              <option value="app">Mobile App</option>
              <option value="website">Website</option>
              <option value="email">Email</option>
              <option value="social">Social Media</option>
              <option value="other">Other</option>
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
          </form>

          <div className="pf-tabs exp-subtabs">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); setPage(1); }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="prod-table-wrap">
            <table className="table prod-table pts-table fdp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Participant</th>
                  <th>Contact</th>
                  <th>Flash Drops Joined</th>
                  <th>Entries</th>
                  <th>Total Spent (KES)</th>
                  <th>Points Earned</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <button className="pts-cust" type="button" onClick={() => setViewing(r)}>
                        {r.avatar ? <img src={r.avatar} alt="" /> : <span className="cust-av">{r.name.slice(0, 2)}</span>}
                        <span>
                          <strong>{r.name}</strong>
                          <div><span className={`st-pill ${groupCls(r.level)}`}>{groupLabel(r.level)}</span></div>
                        </span>
                      </button>
                    </td>
                    <td className="fdp-contact">
                      <div>{fmtPhone(r.phone)}</div>
                      <div className="muted">{r.email}</div>
                    </td>
                    <td>{fmtNum(r.drops)}</td>
                    <td>{fmtNum(r.entries)}</td>
                    <td>{fmtNum(r.spent)}</td>
                    <td>{fmtNum(r.points)}</td>
                    <td>
                      <span className={`st-pill ${r.status === "active" ? "st-pub" : "ord-st-cancelled"}`}>
                        {r.status === "active" ? "Active" : r.status === "banned" ? "Banned" : "Inactive"}
                      </span>
                    </td>
                    <td className="muted">{fmtLast(r.lastAt)}</td>
                    <td>
                      <div className="prod-row-acts">
                        <button type="button" title="View" onClick={() => { setViewing(r); setMenu(null); }}><Icon name="eye" size={14} /></button>
                        <span className="ord-menu-wrap">
                          <button type="button" title="More" onClick={() => setMenu(menu === r.id ? null : r.id)}><Icon name="more" size={14} /></button>
                          {menu === r.id && (
                            <div className="ord-menu">
                              <button type="button" onClick={() => { setViewing(r); setModal("points"); setMenu(null); }}>Award Points</button>
                              <button type="button" onClick={() => { setViewing(r); setModal("notify"); setMenu(null); }}>Send Notification</button>
                              <button type="button" className="danger" onClick={() => { setViewing(r); setModal("block"); setMenu(null); }}>Block</button>
                            </div>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="10" className="muted">No participants match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} participants</span>
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
            <h3>Participation Overview</h3>
            <Donut parts={meta.channels || []} total={stats.total || 25736} />
          </section>
          <section className="card pts-widget">
            <h3>Top Flash Drops by Participants</h3>
            <ul className="fdp-drops">
              {(meta.topDrops || []).map((d) => (
                <li key={d.id}>
                  <img src={d.image} alt="" />
                  <div>
                    <strong>{d.name}</strong>
                    <span className="fda-bar-track"><i style={{ width: `${(d.pct / maxDrop) * 100}%` }} /></span>
                    <em>{d.pct}% · {fmtNum(d.participants)}</em>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card pts-widget">
            <h3>Participant Status</h3>
            <div className="fdp-st-grid">
              {(meta.statusCards || []).map((s) => (
                <article key={s.key}>
                  <div className="muted">{s.label}</div>
                  <b className={`prod-stat-n ${s.tone}`}>{fmtNum(s.value)}</b>
                  <div className="muted">{s.pct}%</div>
                </article>
              ))}
            </div>
          </section>
          <section className="card pts-widget">
            <h3>Quick Actions</h3>
            <div className="fd-qa-grid">
              {QUICK.map((item) => (
                <button key={item.id} type="button" onClick={() => runQuick(item.id)}>
                  <span className={`rule-ico ${item.tone}`}><Icon name={item.icon} size={14} /></span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="fdp-foot">
        <section className="card pf-card">
          <h2>Participants Growth</h2>
          <HoverLine series={meta.growth || []} tipIndex={meta.tipIndex ?? 15} />
        </section>
        <section className="card pf-card">
          <h2>Top Participants</h2>
          <table className="table prod-table">
            <thead>
              <tr><th>#</th><th>Participant</th><th>Entries</th><th>Spent</th></tr>
            </thead>
            <tbody>
              {(meta.topParticipants || []).map((r) => (
                <tr key={r.name}>
                  <td>{r.n}</td>
                  <td>
                    <span className="pts-cust">
                      <img src={r.avatar} alt="" />
                      <strong>{r.name}</strong>
                    </span>
                  </td>
                  <td>{fmtNum(r.entries)}</td>
                  <td>{kes(r.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="fdc-report" type="button" onClick={() => { setTab("spenders"); setPage(1); }}>
            View Full Leaderboard →
          </button>
        </section>
        <section className="card pf-card">
          <h2>New Participants (Last 7 Days)</h2>
          <ul className="fdp-recent">
            {(meta.recent || []).map((p) => (
              <li key={p.name + p.at}>
                <img src={p.avatar} alt="" />
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted">{p.at}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="pts-alert fd-banner">
        <Icon name="info" size={16} />
        <p>Participants are users who have joined or entered flash drops. Data is updated in real-time.</p>
      </section>

      {viewing && !modal && (
        <div className="prod-modal" onClick={() => setViewing(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>{viewing.name}</h2>
              <button className="icon-btn" type="button" onClick={() => setViewing(null)}>×</button>
            </div>
            <div className="cust-drawer-top">
              <img src={viewing.avatar} alt="" />
              <div>
                <span className={`st-pill ${groupCls(viewing.level)}`}>{groupLabel(viewing.level)}</span>
                <p className="muted">{fmtPhone(viewing.phone)} · {viewing.email}</p>
              </div>
            </div>
            <dl className="fd-view">
              <div><dt>Flash Drops Joined</dt><dd>{fmtNum(viewing.drops)}</dd></div>
              <div><dt>Entries</dt><dd>{fmtNum(viewing.entries)}</dd></div>
              <div><dt>Total Spent</dt><dd>{kes(viewing.spent)}</dd></div>
              <div><dt>Points Earned</dt><dd>{fmtNum(viewing.points)}</dd></div>
              <div><dt>Status</dt><dd>{viewing.status}</dd></div>
              <div><dt>Last Active</dt><dd>{fmtLast(viewing.lastAt)}</dd></div>
            </dl>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(null)}>Close</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setModal("points")}>Award Points</button>
            </div>
          </div>
        </div>
      )}

      {modal === "points" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setToast(`Awarded ${pointsAmt} points${viewing ? ` to ${viewing.name}` : ""}`); setModal(null); }}>
            <div className="ord-drawer-head">
              <h2>Award Points{viewing ? ` — ${viewing.name}` : ""}</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label>Points<input type="number" min="1" value={pointsAmt} onChange={(e) => setPointsAmt(e.target.value)} /></label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Award</button>
            </div>
          </form>
        </div>
      )}

      {modal === "notify" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setToast("Notification sent"); setModal(null); setNote(""); }}>
            <div className="ord-drawer-head">
              <h2>Send Notification</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label>Message<textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} required /></label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Send</button>
            </div>
          </form>
        </div>
      )}

      {modal === "block" && viewing && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Block {viewing.name}?</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <p>They will not be able to join future flash drops.</p>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-ghost btn-small danger-txt" type="button" onClick={() => { setToast("Participant blocked"); setModal(null); setViewing(null); }}>Block</button>
            </div>
          </div>
        </div>
      )}

      {modal === "merge" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setToast("Accounts merged"); setModal(null); }}>
            <div className="ord-drawer-head">
              <h2>Merge Accounts</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label>Source account<input value={mergeFrom} onChange={(e) => setMergeFrom(e.target.value)} placeholder="Name or phone" required /></label>
            <label>Keep account<input value={mergeTo} onChange={(e) => setMergeTo(e.target.value)} placeholder="Name or phone" required /></label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Merge</button>
            </div>
          </form>
        </div>
      )}

      {modal === "entries" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card is-wide" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Recent entries</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <table className="table prod-table">
              <thead><tr><th>Participant</th><th>Drop</th><th>Entries</th><th>Spent</th></tr></thead>
              <tbody>
                {rows.slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.dropName}</td>
                    <td>{r.entries}</td>
                    <td>{kes(r.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="button" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === "settings" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setToast("Participant settings saved"); setModal(null); }}>
            <div className="ord-drawer-head">
              <h2>Participant Settings</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label className="rwd-check">
              <input type="checkbox" checked={settings.realtime} onChange={(e) => setSettings((s) => ({ ...s, realtime: e.target.checked }))} />
              Update participant stats in real-time
            </label>
            <label className="rwd-check">
              <input type="checkbox" checked={settings.allowBanned} onChange={(e) => setSettings((s) => ({ ...s, allowBanned: e.target.checked }))} />
              Show banned participants in All
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
