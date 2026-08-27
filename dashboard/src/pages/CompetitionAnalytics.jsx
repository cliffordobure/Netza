import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

function fmtNum(n) {
  if (typeof n === "string") return n;
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function statusMeta(status) {
  if (status === "active") return { label: "Active", cls: "ca-st-active" };
  if (status === "upcoming") return { label: "Upcoming", cls: "ca-st-upcoming" };
  if (status === "cancelled") return { label: "Cancelled", cls: "ord-st-cancelled" };
  return { label: "Completed", cls: "ca-st-done" };
}

function DualLineChart({ series, tipIndex }) {
  const w = 520;
  const h = 200;
  const padX = 28;
  const padY = 28;
  const [hover, setHover] = useState(tipIndex);
  const max = Math.max(...series.flatMap((p) => [p.participants || 0, p.entries || 0]), 1);
  const coords = series.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(series.length - 1, 1);
    return {
      ...p,
      x,
      yP: h - padY - ((p.participants || 0) / max) * (h - padY * 2),
      yE: h - padY - ((p.entries || 0) / max) * (h - padY * 2),
    };
  });
  const lineP = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.yP}`).join(" ");
  const lineE = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.yE}`).join(" ");
  const active = coords[hover] || coords[tipIndex] || coords[0];
  const labelEvery = 5;

  return (
    <div className="ca-chart-wrap">
      {active && (
        <div className="chart-tip-html ca-tip">
          {active.dateLabel}
          <span>Participants {fmtNum(active.participants)}</span>
          <span>Entries {fmtNum(active.entries)}</span>
        </div>
      )}
      <svg className="cd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Participation over time">
        <path d={lineP} fill="none" stroke="#6D28D9" strokeWidth="2.4" />
        <path d={lineE} fill="none" stroke="#16A34A" strokeWidth="2.4" />
        {coords.map((c, i) => (
          <g key={c.d}>
            {(i % labelEvery === 0 || i === coords.length - 1) && (
              <text x={c.x} y={h - 6} textAnchor="middle" className="comp-chart-lbl">{c.label}</text>
            )}
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
            <circle cx={active.x} cy={active.yP} r="4.5" fill="#6D28D9" stroke="#fff" strokeWidth="2" />
            <circle cx={active.x} cy={active.yE} r="4.5" fill="#16A34A" stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
      <div className="ca-legend">
        <span><i style={{ background: "#6D28D9" }} /> Participants</span>
        <span><i style={{ background: "#16A34A" }} /> Entries</span>
      </div>
    </div>
  );
}

function MonoLineChart({ series }) {
  const w = 420;
  const h = 180;
  const padX = 22;
  const padY = 24;
  const values = series.map((p) => p.points || 0);
  const max = Math.max(...values, 1);
  const coords = series.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(series.length - 1, 1);
    const y = h - padY - ((p.points || 0) / max) * (h - padY * 2);
    return { ...p, x, y };
  });
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = first && last ? `${line} L${last.x},${h - padY} L${first.x},${h - padY} Z` : "";
  const labelEvery = 5;
  return (
    <svg className="cd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Points awarded over time">
      <path d={area} fill="rgba(109,40,217,0.16)" />
      <path d={line} fill="none" stroke="#6D28D9" strokeWidth="2.4" />
      {coords.map((c, i) =>
        i % labelEvery === 0 || i === coords.length - 1 ? (
          <text key={c.d} x={c.x} y={h - 4} textAnchor="middle" className="comp-chart-lbl">{c.label}</text>
        ) : null
      )}
      {last && <circle cx={last.x} cy={last.y} r="4.5" fill="#6D28D9" stroke="#fff" strokeWidth="2" />}
    </svg>
  );
}

function Donut({ parts, total, sub }) {
  const slices = (parts || []).reduce((s, p) => s + (p.count || 0), 0) || total;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap cd-donut">
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
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">{sub}</text>
      </svg>
      <ul className="donut-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name || p.label}</span>
            <b>{Number(p.pct).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Gauge({ pct }) {
  const value = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="ca-gauge">
      <svg viewBox="0 0 200 120" role="img" aria-label={`Completion rate ${value}%`}>
        <path d="M24 108 A76 76 0 0 1 176 108" fill="none" stroke="#ede9fe" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M24 108 A76 76 0 0 1 176 108"
          fill="none"
          stroke="#6D28D9"
          strokeWidth="16"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${value} 100`}
        />
        <text x="100" y="96" textAnchor="middle" className="ca-gauge-n">{value.toFixed(1)}%</text>
      </svg>
    </div>
  );
}

export default function CompetitionAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [statusF, setStatusF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [schedule, setSchedule] = useState({ email: "admin@netza.co.ke", frequency: "weekly" });

  useEffect(() => {
    api("/admin/competitions/analytics")
      .then((d) => {
        setData(d);
        setFrom(d.from || "2026-05-01");
        setTo(d.to || "2026-05-27");
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load analytics."));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const performance = useMemo(() => {
    return (data?.performance || []).filter((row) => {
      if (statusF && row.status !== statusF) return false;
      if (typeF && row.type !== typeF) return false;
      return true;
    });
  }, [data, statusF, typeF]);

  function exportReport() {
    const rows = performance.length ? performance : (data?.performance || []);
    const csv = [
      "Competition,Status,Participants,Entries,Completion Rate,Points Awarded,Prize Value",
      ...rows.map((r) => `"${r.name}",${r.status},${r.participants},${r.entries},${r.completion},${r.points},${r.prizeValue}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "competition-analytics-may-2026.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Analytics report exported");
    setModal(null);
  }

  if (!data && !error) {
    return <p className="muted">Loading analytics…</p>;
  }

  const kpis = data?.kpis || [];
  const series = data?.participation || [];
  const entriesDonut = data?.entriesByCompetition || [];
  const channels = data?.channels || [];
  const gender = data?.demographics?.gender || [];
  const age = data?.demographics?.age || [];
  const completion = data?.completion || {};
  const board = data?.leaderboardCompetitionId;

  return (
    <div className="ca-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/competitions">Competitions</Link>
        <span>›</span>
        <strong>Analytics & Reports</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="chart" size={18} /></span>
            Competition Analytics & Reports
          </h1>
          <p>Comprehensive performance analytics across all competitions.</p>
        </div>
        <div className="prod-actions ca-toolbar">
          <label className="ca-range">
            <Icon name="calendar" size={14} />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal("filter")}>
            <Icon name="filter" size={14} /> Filter
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal("compare")}>
            Compare
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={exportReport}>
            <Icon name="download" size={14} /> Export Report
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six">
        {kpis.map((k) => (
          <article key={k.key} className="prod-stat cat-stat">
            <div>
              <div className="muted">{k.label}</div>
              <div className={`prod-stat-n ${k.tone}`}>{k.money ? kes(k.value) : fmtNum(k.value)}</div>
              <div className="cat-stat-hint up">{k.hint}</div>
            </div>
            <div className={`prod-stat-icon ${k.tone}`}><Icon name={k.icon} size={16} /></div>
          </article>
        ))}
      </section>

      <div className="ca-grid-3">
        <section className="card pf-card">
          <h2>Participation Over Time</h2>
          <DualLineChart series={series} tipIndex={data?.tipIndex ?? 15} />
        </section>
        <section className="card pf-card">
          <h2>Points Awarded Over Time</h2>
          <MonoLineChart series={series} />
        </section>
        <section className="card pf-card">
          <h2>Entries by Competition</h2>
          <Donut parts={entriesDonut} total={45672} sub="Total Entries" />
        </section>
      </div>

      <div className="ca-grid-4">
        <section className="card pf-card">
          <h2>Top Performing Competitions</h2>
          <table className="cd-table">
            <thead>
              <tr>
                <th>Competition</th>
                <th>Participants</th>
                <th>Entries</th>
                <th>Points Awarded</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topCompetitions || []).map((r) => (
                <tr key={r.name}>
                  <td>
                    {r.id ? <Link to={`/competitions/${r.id}`}>{r.name}</Link> : <strong>{r.name}</strong>}
                  </td>
                  <td>{fmtNum(r.participants)}</td>
                  <td>{fmtNum(r.entries)}</td>
                  <td>{fmtNum(r.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card pf-card">
          <h2>Participation by Channel</h2>
          <Donut parts={channels} total={12458} sub="Participants" />
        </section>
        <section className="card pf-card">
          <h2>Participant Demographics</h2>
          <div className="ca-gender">
            {gender.map((g) => (
              <div key={g.key}>
                <div className="ca-age-lbl">
                  <span>{g.label}</span>
                  <b>{g.pct.toFixed(1)}%</b>
                  <em>{fmtNum(g.count)}</em>
                </div>
                <div className="cprof-bar"><i style={{ width: `${g.pct}%`, background: g.color }} /></div>
              </div>
            ))}
          </div>
          <h3 className="ca-subh">Age Groups</h3>
          {age.map((a) => (
            <div key={a.key} className="ca-age">
              <div className="ca-age-lbl">
                <span>{a.label}</span>
                <b>{a.pct.toFixed(1)}%</b>
              </div>
              <div className="cprof-bar"><i style={{ width: `${a.pct}%`, background: a.color }} /></div>
            </div>
          ))}
        </section>
        <div className="ca-stack">
          <section className="card pf-card">
            <h2>Completion Rate</h2>
            <Gauge pct={completion.pct} />
            <ul className="pts-sum">
              <li><span>Completed Entries</span><b>{fmtNum(completion.completed)}</b></li>
              <li><span>In Progress</span><b>{fmtNum(completion.inProgress)}</b></li>
              <li><span>Abandoned</span><b>{fmtNum(completion.abandoned)}</b></li>
            </ul>
          </section>
          <section className="card pf-card">
            <h2>Top Participants</h2>
            <ul className="board ca-board">
              {(data?.topParticipants || []).map((p, i) => (
                <li key={p.name}>
                  <span className="rank">{i + 1}</span>
                  {p.avatar ? <img src={p.avatar} alt="" /> : <span className="cust-av">{p.name.slice(0, 2)}</span>}
                  <div>
                    <div className="board-name">{p.name}</div>
                    <div className="muted">{fmtNum(p.entries)} entries</div>
                  </div>
                  <b>{fmtNum(p.points)} pts</b>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="ca-grid-foot">
        <section className="card pf-card">
          <div className="cprof-card-head">
            <h2>Competition Performance Summary</h2>
            <button className="link-reset" type="button" onClick={() => setModal("filter")}>Filter table</button>
          </div>
          <div className="prod-table-wrap">
            <table className="table prod-table ca-perf">
              <thead>
                <tr>
                  <th>Competition</th>
                  <th>Status</th>
                  <th>Participants</th>
                  <th>Entries</th>
                  <th>Completion Rate</th>
                  <th>Points Awarded</th>
                  <th>Prize Value (KSh)</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((r) => {
                  const st = statusMeta(r.status);
                  return (
                    <tr key={r.name}>
                      <td>{r.id ? <Link to={`/competitions/${r.id}`}>{r.name}</Link> : r.name}</td>
                      <td><span className={`st-pill ${st.cls}`}>{st.label}</span></td>
                      <td>{fmtNum(r.participants)}</td>
                      <td>{fmtNum(r.entries)}</td>
                      <td>{Number(r.completion).toFixed(1)}%</td>
                      <td>{fmtNum(r.points)}</td>
                      <td>{fmtNum(r.prizeValue)}</td>
                    </tr>
                  );
                })}
                {performance.length === 0 && (
                  <tr><td colSpan="7" className="muted">No competitions match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card pf-card">
          <h2>Points & Rewards Impact</h2>
          <ul className="ca-impact">
            {(data?.impact || []).map((row) => (
              <li key={row.label}>
                <span className={`rule-ico ${row.tone}`}><Icon name={row.icon} size={14} /></span>
                <span>
                  <strong>{row.label}</strong>
                  <div className="cat-stat-hint up">{row.hint}</div>
                </span>
                <b>{typeof row.value === "number" ? fmtNum(row.value) : row.value}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pf-card">
          <h2>Recent Activity</h2>
          <ul className="cprof-timeline">
            {(data?.activity || []).map((a, i) => (
              <li key={`${a.title}-${i}`}>
                <span className="cprof-dot done"><Icon name={a.icon} size={12} /></span>
                <div>
                  <strong>{a.title}</strong>
                  <div className="muted">{a.detail}</div>
                </div>
                <span className="muted">{a.at}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pf-card">
          <h2>Quick Actions</h2>
          <div className="cd-actions">
            <button type="button" onClick={() => navigate("/competitions/new")}>
              <Icon name="plus" size={14} /> Create New Competition
            </button>
            <button type="button" onClick={exportReport}>
              <Icon name="download" size={14} /> Export Analytics Report
            </button>
            <button type="button" onClick={() => setModal("schedule")}>
              <Icon name="calendar" size={14} /> Schedule Competition Report
            </button>
            <button
              type="button"
              onClick={() => navigate(board ? `/competitions/${board}?tab=leaderboard` : "/competitions")}
            >
              <Icon name="trophy" size={14} /> View Full Leaderboard
            </button>
            <button type="button" onClick={() => navigate("/competitions")}>
              <Icon name="gear" size={14} /> Competition Settings
            </button>
          </div>
        </section>
      </div>

      {modal === "compare" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card is-wide" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Compare periods</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}><Icon name="x" size={16} /></button>
            </div>
            <p className="muted">April 2026 vs 01 May 2026 – 27 May 2026</p>
            <table className="cd-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Apr 2026</th>
                  <th>May 2026</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {(data?.compare || []).map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.money ? kes(row.apr) : fmtNum(row.apr)}</td>
                    <td>{row.money ? kes(row.may) : fmtNum(row.may)}</td>
                    <td className="cat-stat-hint up">{row.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === "filter" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card rule-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Filter</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}><Icon name="x" size={16} /></button>
            </div>
            <label>
              Status
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label>
              Type
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
                <option value="">All Types</option>
                <option value="quiz">Quiz</option>
                <option value="referral">Referral</option>
                <option value="engagement">Engagement</option>
                <option value="purchase">Purchase</option>
                <option value="lucky_draw">Lucky Draw</option>
              </select>
            </label>
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { setStatusF(""); setTypeF(""); }}>Reset</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setModal(null)}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {modal === "schedule" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card rule-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Schedule Competition Report</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}><Icon name="x" size={16} /></button>
            </div>
            <label>
              Email
              <input value={schedule.email} onChange={(e) => setSchedule({ ...schedule, email: e.target.value })} />
            </label>
            <label>
              Frequency
              <select value={schedule.frequency} onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn btn-purple btn-small"
                type="button"
                onClick={() => { setModal(null); setToast(`Report scheduled ${schedule.frequency} to ${schedule.email}`); }}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
