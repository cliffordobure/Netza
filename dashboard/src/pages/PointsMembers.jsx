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

function tierCls(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "platinum") return "ptsmem-tier-plat";
  if (t === "gold") return "ptsmem-tier-gold";
  if (t === "silver") return "ptsmem-tier-silver";
  if (t === "bronze") return "ptsmem-tier-bronze";
  return "ptsmem-tier-new";
}

function statusCls(status) {
  if (status === "inactive") return "ptsmem-st-inactive";
  if (status === "suspended") return "ptsmem-st-suspended";
  return "ptsmem-st-active";
}

function Donut({ parts, totalLabel = "Total", centerTotal }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || 1;
  const displayTotal = centerTotal != null ? centerTotal : slices;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap ptsmem-donut">
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
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(displayTotal)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">{totalLabel}</text>
      </svg>
      <ul className="donut-legend ptsmem-legend">
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

export default function PointsMembers() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [tierF, setTierF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      tier: next.tier ?? tierF,
      status: next.status ?? statusF,
      channel: next.channel ?? channelF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.tier) p.set("tier", vals.tier);
    if (vals.status) p.set("status", vals.status);
    if (vals.channel) p.set("channel", vals.channel);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/points-members?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load members."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, tierF, statusF, channelF]);

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
    setTierF("");
    setStatusF("");
    setChannelF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", tier: "", status: "", channel: "", page: 1 });
  }

  if (!data) {
    return (
      <div className="ptsmem-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/points">Points & Rewards</Link>
          <span>›</span>
          <strong>Members</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading members…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.members || [];
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
    <div className="ptsmem-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/points">Points & Rewards</Link>
        <span>›</span>
        <strong>Members</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="users" size={16} /></span>
            Members
          </h1>
          <p>View and manage loyalty program members and their tier status.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=settings")}>
            <Icon name="gear" size={14} /> Members Settings
          </button>
          <div className="ptsmem-dd-wrap">
            <button
              className="btn btn-purple btn-small ptsmem-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Add Member
              <Icon name="chevron" size={14} />
            </button>
            {addOpen && (
              <div className="ptsmem-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Add single member form coming soon"); }}>Add Single Member</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Import members started"); }}>Import CSV</button>
                <button type="button" onClick={() => { setAddOpen(false); navigate("/points?tab=rules"); }}>Invite via Referral</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five ptsmem-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Members</div>
            <div className="prod-stat-n purple">{fmtNum(stats.totalMembers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.totalMembersDelta)}`}>{deltaText(stats.totalMembersDelta)}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">New Members (This Month)</div>
            <div className="prod-stat-n green">{fmtNum(stats.newThisMonth)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.newThisMonthDelta)}`}>{deltaText(stats.newThisMonthDelta)}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="usersPlus" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Members</div>
            <div className="prod-stat-n orange">{fmtNum(stats.activeMembers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.activeMembersDelta)}`}>{deltaText(stats.activeMembersDelta)}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="crown" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Members with Points</div>
            <div className="prod-stat-n blue">{fmtNum(stats.withPoints)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.withPointsDelta)}`}>{deltaText(stats.withPointsDelta)}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="star" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Rewards Claimed (This Month)</div>
            <div className="prod-stat-n red">{fmtNum(stats.rewardsClaimedMonth)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.rewardsClaimedMonthDelta)}`}>{deltaText(stats.rewardsClaimedMonthDelta)}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="gift" size={16} /></div>
        </article>
      </section>

      <div className="ptsmem-layout">
        <div className="ptsmem-main">
          <section className="card prod-filters">
            <form className="prod-filter-row ptsmem-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members..." />
              </div>
              <select value={tierF} onChange={(e) => { setTierF(e.target.value); setPage(1); }}>
                <option value="">All Tiers</option>
                {(data.filters?.tiers || []).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
                <option value="">All Registration Channels</option>
                {(data.filters?.channels || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="ptsmem-dates">
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

          <section className="card ptsmem-table-card">
            <div className="prod-table-wrap ptsmem-scroll">
              <table className="table prod-table ptsmem-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Tier</th>
                    <th>Points Balance</th>
                    <th>Total Points Earned</th>
                    <th>Rewards Claimed</th>
                    <th>Joined Date</th>
                    <th>Last Active</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td>
                        <div className="prod-cell ptsmem-member">
                          <img src={r.avatar} alt="" />
                          <div>
                            <strong>{r.name}</strong>
                            <div className="muted">{r.memId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`ptsmem-tier ${tierCls(r.tier)}`}>
                          <Icon name={r.tier === "New" ? "plus" : "star"} size={10} />
                          {r.tier}
                        </span>
                      </td>
                      <td><strong>{fmtNum(r.balance)} pts</strong></td>
                      <td>{fmtNum(r.earned)} pts</td>
                      <td>{fmtNum(r.rewardsClaimed)}</td>
                      <td>{r.joined}</td>
                      <td>
                        <div>{r.lastActiveDate}</div>
                        <div className="muted ptsmem-sub">{r.lastActiveTime}</div>
                      </td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => setToast(`Viewing ${r.name}`)}>
                            <Icon name="eye" size={14} />
                          </button>
                          <button type="button" title="More" onClick={() => setToast(`Actions for ${r.name}`)}>
                            <Icon name="more" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="10" className="muted">No members match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} members</span>
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

        <aside className="ptsmem-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Members by Tier</h2>
            <Donut parts={data.tierDonut} totalLabel="Total" centerTotal={stats.totalMembers} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="trophy" size={14} /> Top Members (By Points)</h2>
            <ul className="ptsmem-top-list">
              {(data.topMembers || []).map((m, i) => (
                <li key={m.name}>
                  <span className="ptsmem-rank">{i + 1}</span>
                  <img src={m.avatar} alt="" />
                  <div>
                    <strong>{m.name}</strong>
                    <span className="muted">{fmtNum(m.points)} pts</span>
                  </div>
                  <span className={`ptsmem-tier ${tierCls(m.tier)}`}>{m.tier}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="usersPlus" size={14} /> New Members (This Month)</h2>
            <ul className="ptsmem-new-list">
              {(data.newMembers || []).map((m) => (
                <li key={m.name}>
                  <img src={m.avatar} alt="" />
                  <div>
                    <strong>{m.name}</strong>
                    <span className="muted">Joined {m.joined}</span>
                  </div>
                  <b>{fmtNum(m.points)} pts</b>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card ptsmem-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
