import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const VIEW_TABS = [
  { id: "activities", label: "Recent Activities" },
  { id: "members", label: "Members" },
  { id: "transactions", label: "Transactions" },
  { id: "rewards", label: "Rewards" },
  { id: "tiers", label: "Tiers" },
];

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

function activityCls(activity) {
  if (activity === "redeemed") return "ptsov-act-redeem";
  return "ptsov-act-earn";
}

function statusCls(status) {
  if (status === "expired") return "ptsov-st-expired";
  if (status === "pending") return "ptsov-st-pending";
  return "ptsov-st-done";
}

function tierCls(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "platinum") return "ptsov-tier-plat";
  if (t === "gold") return "ptsov-tier-gold";
  if (t === "silver") return "ptsov-tier-silver";
  if (t === "bronze") return "ptsov-tier-bronze";
  return "ptsov-tier-new";
}

function Donut({ parts, totalLabel = "Members", centerTotal }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || 1;
  const displayTotal = centerTotal != null ? centerTotal : slices;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap ptsov-donut">
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
      <ul className="donut-legend ptsov-legend">
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

export default function PointsOverview({ defaultView = "activities" }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [view, setView] = useState(defaultView === "members" ? "members" : "activities");
  const [q, setQ] = useState("");
  const [tierF, setTierF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [activityF, setActivityF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      tier: next.tier ?? tierF,
      status: next.status ?? statusF,
      activity: next.activity ?? activityF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.tier) p.set("tier", vals.tier);
    if (vals.status) p.set("status", vals.status);
    if (vals.activity) p.set("activity", vals.activity);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/points-overview?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load points overview."));
  }

  useEffect(() => {
    setView(defaultView === "members" ? "members" : defaultView === "transactions" ? "transactions" : "activities");
  }, [defaultView]);

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, tierF, statusF, activityF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setCreateOpen(false);
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
    setActivityF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", tier: "", status: "", activity: "", page: 1 });
  }

  if (!data) {
    return (
      <div className="ptsov-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/points">Points & Rewards</Link>
          <span>›</span>
          <strong>Overview</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading points overview…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.activities || [];
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
    <div className="ptsov-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/points">Points & Rewards</Link>
        <span>›</span>
        <strong>Overview</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="gift" size={16} /></span>
            Points & Rewards Overview
          </h1>
          <p>Manage customer loyalty points, tiers and rewards programs.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=settings")}>
            <Icon name="gear" size={14} /> Points Settings
          </button>
          <div className="ptsov-dd-wrap">
            <button
              className="btn btn-purple btn-small ptsov-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCreateOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Create Reward
              <Icon name="chevron" size={14} />
            </button>
            {createOpen && (
              <div className="ptsov-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCreateOpen(false); navigate("/points?tab=redeem"); }}>Voucher / Coupon</button>
                <button type="button" onClick={() => { setCreateOpen(false); navigate("/points?tab=redeem"); }}>Free Delivery</button>
                <button type="button" onClick={() => { setCreateOpen(false); setToast("Custom reward form coming soon"); }}>Custom Reward</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six ptsov-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Points Issued</div>
            <div className="prod-stat-n purple">{fmtNum(stats.issued)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.issuedDelta)}`}>{deltaText(stats.issuedDelta)}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="star" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Points Redeemed</div>
            <div className="prod-stat-n green">{fmtNum(stats.redeemed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.redeemedDelta)}`}>{deltaText(stats.redeemedDelta)}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Members</div>
            <div className="prod-stat-n orange">{fmtNum(stats.activeMembers)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.activeMembersDelta)}`}>{deltaText(stats.activeMembersDelta)}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Rewards Claimed</div>
            <div className="prod-stat-n blue">{fmtNum(stats.rewardsClaimed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.rewardsClaimedDelta)}`}>{deltaText(stats.rewardsClaimedDelta)}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="trophy" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Expiring Soon</div>
            <div className="prod-stat-n red">{fmtNum(stats.expiringSoon)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.expiringSoonDelta)}`}>{deltaText(stats.expiringSoonDelta)}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Liability (KES)</div>
            <div className="prod-stat-n purple">{kes(stats.liabilityKes)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.liabilityDelta)}`}>{deltaText(stats.liabilityDelta)}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="coin" size={16} /></div>
        </article>
      </section>

      <div className="ptsov-layout">
        <div className="ptsov-main">
          <div className="ptsov-tabs">
            {VIEW_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={view === t.id ? "on" : ""}
                onClick={() => {
                  if (t.id === "members") {
                    navigate("/points?tab=members");
                    return;
                  }
                  if (t.id === "transactions") {
                    navigate("/points?tab=transactions");
                    return;
                  }
                  if (t.id === "rewards") {
                    navigate("/points?tab=redeem");
                    return;
                  }
                  if (t.id === "tiers") {
                    navigate("/points?tab=tiers");
                    return;
                  }
                  setView(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(view === "activities" || view === "transactions") && (
            <>
              <section className="card prod-filters">
                <form className="prod-filter-row ptsov-filters" onSubmit={search}>
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
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                  <select value={activityF} onChange={(e) => { setActivityF(e.target.value); setPage(1); }}>
                    <option value="">All Activities</option>
                    {(data.filters?.activities || []).map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <div className="ptsov-dates">
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

              <section className="card ptsov-table-card">
                <div className="prod-table-wrap ptsov-scroll">
                  <table className="table prod-table ptsov-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Member</th>
                        <th>Activity</th>
                        <th>Description</th>
                        <th>Points</th>
                        <th>Balance</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td className="muted">{r.n}</td>
                          <td>
                            <div className="prod-cell ptsov-member">
                              <img src={r.memberAvatar} alt="" />
                              <div>
                                <strong>{r.memberName}</strong>
                                <div className="muted">{r.memberMemId}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className={`ptsov-act ${activityCls(r.activity)}`}>{r.activityLabel}</span></td>
                          <td>
                            <div className="ptsov-desc">
                              <strong>{r.description}</strong>
                              <div className="muted">{r.detail}</div>
                            </div>
                          </td>
                          <td className={r.points >= 0 ? "ptsov-pts-pos" : "ptsov-pts-neg"}>
                            <strong>{r.points >= 0 ? `+${fmtNum(r.points)}` : fmtNum(r.points)}</strong>
                          </td>
                          <td>{fmtNum(r.balance)}</td>
                          <td>
                            <div>{r.date}</div>
                            <div className="muted ptsov-sub">{r.time}</div>
                          </td>
                          <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                          <td>
                            <div className="prod-row-acts">
                              <button type="button" title="More" onClick={() => setToast(`Actions for ${r.memberName}`)}>
                                <Icon name="more" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr><td colSpan="9" className="muted">No activities match these filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <footer className="prod-pager">
                  <span>Showing {fromN} to {toN} of {fmtNum(total)} activities</span>
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
            </>
          )}
        </div>

        <aside className="ptsov-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Points Tier Distribution</h2>
            <Donut parts={data.tierDonut} totalLabel="Members" centerTotal={stats.activeMembers} />
          </section>

          <section className="card pf-card">
            <h2><Icon name="trophy" size={14} /> Top Members</h2>
            <ul className="ptsov-top-list">
              {(data.topMembers || []).map((m, i) => (
                <li key={m.name}>
                  <span className="ptsov-rank">{i + 1}</span>
                  <img src={m.avatar} alt="" />
                  <div>
                    <strong>{m.name}</strong>
                    <span className="muted">{fmtNum(m.points)} pts</span>
                  </div>
                  <span className={`ptsov-tier ${tierCls(m.tier)}`}>{m.tier}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="clock" size={14} /> Expiring Points</h2>
            <ul className="ptsov-expire-list">
              {(data.expiring || []).map((e) => (
                <li key={`${e.memberName}-${e.expiresOn}`}>
                  <span className="ptsov-warn"><Icon name="bell" size={12} /></span>
                  <div>
                    <strong>{e.memberName}</strong>
                    <span className="muted">Expires {e.expiresOn}</span>
                  </div>
                  <b className="ptsov-pts-neg">{fmtNum(e.points)} pts</b>
                </li>
              ))}
            </ul>
            <button
              className="btn ptsov-remind"
              type="button"
              onClick={() => setToast("Expiry reminders queued for members")}
            >
              <Icon name="bell" size={14} /> Send Reminder to Members
            </button>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card ptsov-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
