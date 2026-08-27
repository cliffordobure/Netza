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
  return Number(n) >= 0 ? "up" : "down";
}

function deltaText(n) {
  const v = Number(n) || 0;
  const arrow = v >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(v).toFixed(1)}% vs last month`;
}

function typeCls(type) {
  if (type === "redeemed") return "ptstx-type-redeem";
  if (type === "adjusted") return "ptstx-type-adjust";
  if (type === "expired") return "ptstx-type-expire";
  return "ptstx-type-earn";
}

function statusCls(status) {
  if (status === "pending") return "ptstx-st-pending";
  if (status === "failed") return "ptstx-st-failed";
  return "ptstx-st-done";
}

function Donut({ parts, centerLabel, totalLabel = "Total Points" }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap ptstx-donut">
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
        <text x="70" y="64" textAnchor="middle" className="donut-total">{centerLabel}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">{totalLabel}</text>
      </svg>
      <ul className="donut-legend ptstx-legend">
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

export default function PointsTransactions() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [memberF, setMemberF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [sourceF, setSourceF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      member: next.member ?? memberF,
      type: next.type ?? typeF,
      status: next.status ?? statusF,
      source: next.source ?? sourceF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.member) p.set("member", vals.member);
    if (vals.type) p.set("type", vals.type);
    if (vals.status) p.set("status", vals.status);
    if (vals.source) p.set("source", vals.source);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/points-transactions?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load transactions."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, memberF, typeF, statusF, sourceF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setExportOpen(false);
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
    setMemberF("");
    setTypeF("");
    setStatusF("");
    setSourceF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", member: "", type: "", status: "", source: "", page: 1 });
  }

  if (!data) {
    return (
      <div className="ptstx-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/points">Points & Rewards</Link>
          <span>›</span>
          <strong>Transactions</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading transactions…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.transactions || [];
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
    <div className="ptstx-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/points">Points & Rewards</Link>
        <span>›</span>
        <strong>Transactions</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="exchange" size={16} /></span>
            Points Transactions
          </h1>
          <p>View all points earned, redeemed, expired and adjusted.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=settings")}>
            <Icon name="gear" size={14} /> Transactions Settings
          </button>
          <div className="ptstx-dd-wrap">
            <button
              className="btn btn-purple btn-small ptstx-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExportOpen((v) => !v);
              }}
            >
              <Icon name="download" size={14} /> Export
              <Icon name="chevron" size={14} />
            </button>
            {exportOpen && (
              <div className="ptstx-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setExportOpen(false); setToast("CSV export queued"); }}>Export CSV</button>
                <button type="button" onClick={() => { setExportOpen(false); setToast("Excel export queued"); }}>Export Excel</button>
                <button type="button" onClick={() => { setExportOpen(false); setToast("PDF report queued"); }}>Export PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five ptstx-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Earned</div>
            <div className="prod-stat-n green">{fmtNum(stats.earned)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.earnedDelta)}`}>{deltaText(stats.earnedDelta)}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="arrowUp" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Redeemed</div>
            <div className="prod-stat-n red">{fmtNum(stats.redeemed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.redeemedDelta)}`}>{deltaText(stats.redeemedDelta)}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="arrowDown" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Adjusted</div>
            <div className="prod-stat-n orange">{fmtNum(stats.adjusted)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.adjustedDelta)}`}>{deltaText(stats.adjustedDelta)}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="sliders" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Expired</div>
            <div className="prod-stat-n purple">{fmtNum(stats.expired)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.expiredDelta)}`}>{deltaText(stats.expiredDelta)}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="hourglass" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Points Balance</div>
            <div className="prod-stat-n blue">{fmtNum(stats.balance)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.balanceDelta)}`}>{deltaText(stats.balanceDelta)}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="coin" size={16} /></div>
        </article>
      </section>

      <div className="ptstx-layout">
        <div className="ptstx-main">
          <section className="card prod-filters">
            <form className="prod-filter-row ptstx-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions..." />
              </div>
              <select value={memberF} onChange={(e) => { setMemberF(e.target.value); setPage(1); }}>
                <option value="">All Members</option>
                {(data.filters?.members || []).map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                {(data.filters?.types || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select value={sourceF} onChange={(e) => { setSourceF(e.target.value); setPage(1); }}>
                <option value="">All Sources</option>
                {(data.filters?.sources || []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="ptstx-dates">
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

          <section className="card ptstx-table-card">
            <div className="prod-table-wrap ptstx-scroll">
              <table className="table prod-table ptstx-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Transaction ID</th>
                    <th>Member</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Points</th>
                    <th>Balance</th>
                    <th>Source</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td><code className="ptstx-id">{r.trxId}</code></td>
                      <td>
                        <div className="prod-cell ptstx-member">
                          <img src={r.memberAvatar} alt="" />
                          <div>
                            <strong>{r.memberName}</strong>
                            <div className="muted">{r.memberMemId}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`ptstx-type ${typeCls(r.type)}`}>{r.typeLabel}</span></td>
                      <td>
                        <div className="ptstx-desc">
                          <strong>{r.description}</strong>
                          <div className="muted">{r.detail}</div>
                        </div>
                      </td>
                      <td className={r.points >= 0 ? "ptstx-pts-pos" : "ptstx-pts-neg"}>
                        <strong>{r.points >= 0 ? `+${fmtNum(r.points)}` : fmtNum(r.points)}</strong>
                      </td>
                      <td>{fmtNum(r.balance)}</td>
                      <td><span className="ptstx-source">{r.source}</span></td>
                      <td>
                        <div>{r.date}</div>
                        <div className="muted ptstx-sub">{r.time}</div>
                      </td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="More" onClick={() => setToast(`Actions for ${r.trxId}`)}>
                            <Icon name="more" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="11" className="muted">No transactions match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} transactions</span>
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

        <aside className="ptstx-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Transaction Summary</h2>
            <Donut
              parts={data.summaryDonut}
              centerLabel={data.summaryCenterLabel || "2.85M"}
              totalLabel="Total Points"
            />
          </section>

          <section className="card pf-card">
            <h2><Icon name="bars" size={14} /> Transactions by Source</h2>
            <ul className="ptstx-bars">
              {(data.bySource || []).map((s) => (
                <li key={s.key}>
                  <div className="ptstx-bar-meta">
                    <span>{s.name}</span>
                    <b>{fmtNum(s.value)}</b>
                  </div>
                  <div className="ptstx-bar-track">
                    <i style={{ width: `${s.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="sliders" size={14} /> Recent Adjustments</h2>
            <ul className="ptstx-adj-list">
              {(data.recentAdjustments || []).map((a) => (
                <li key={`${a.reason}-${a.date}`}>
                  <span className={`ptstx-adj-ico ${a.points >= 0 ? "pos" : "neg"}`}>
                    <Icon name={a.points >= 0 ? "plus" : "minus"} size={12} />
                  </span>
                  <div>
                    <strong>{a.reason}</strong>
                    <span className="muted">{a.date} · {a.time}</span>
                    <span className="muted ptstx-adj-admin">by {a.admin}</span>
                  </div>
                  <b className={a.points >= 0 ? "ptstx-pts-pos" : "ptstx-pts-neg"}>
                    {a.points >= 0 ? `+${fmtNum(a.points)}` : fmtNum(a.points)} pts
                  </b>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card ptstx-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
