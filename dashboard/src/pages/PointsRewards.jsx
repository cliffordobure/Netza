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

function catCls(category) {
  const c = String(category || "").toLowerCase();
  if (c === "discount") return "ptsrwd-cat-discount";
  if (c === "delivery") return "ptsrwd-cat-delivery";
  if (c === "merchandise") return "ptsrwd-cat-merch";
  if (c === "service") return "ptsrwd-cat-service";
  return "ptsrwd-cat-other";
}

function typeCls(type) {
  const t = String(type || "").toLowerCase();
  if (t === "benefit") return "ptsrwd-type-benefit";
  if (t === "physical") return "ptsrwd-type-physical";
  return "ptsrwd-type-voucher";
}

function statusCls(status) {
  if (status === "upcoming") return "ptsrwd-st-upcoming";
  if (status === "inactive") return "ptsrwd-st-inactive";
  return "ptsrwd-st-active";
}

function icoCls(color) {
  return `ptsrwd-ico ptsrwd-ico-${color || "purple"}`;
}

function Donut({ parts, centerTotal, totalLabel = "Total" }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap ptsrwd-donut">
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
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(centerTotal ?? slices)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">{totalLabel}</text>
      </svg>
      <ul className="donut-legend ptsrwd-legend">
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

export default function PointsRewards() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [categoryF, setCategoryF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [tierF, setTierF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      category: next.category ?? categoryF,
      status: next.status ?? statusF,
      tier: next.tier ?? tierF,
      type: next.type ?? typeF,
      sort: next.sort ?? sort,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.category) p.set("category", vals.category);
    if (vals.status) p.set("status", vals.status);
    if (vals.tier) p.set("tier", vals.tier);
    if (vals.type) p.set("type", vals.type);
    if (vals.sort) p.set("sort", vals.sort);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/points-rewards?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load rewards."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, categoryF, statusF, tierF, typeF, sort]);

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
    setCategoryF("");
    setStatusF("");
    setTierF("");
    setTypeF("");
    setSort("newest");
    setPage(1);
    load({ q: "", category: "", status: "", tier: "", type: "", sort: "newest", page: 1 });
  }

  if (!data) {
    return (
      <div className="ptsrwd-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/points">Points & Rewards</Link>
          <span>›</span>
          <strong>Rewards</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading rewards…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.rewards || [];
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
    <div className="ptsrwd-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/points">Points & Rewards</Link>
        <span>›</span>
        <strong>Rewards</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="gift" size={16} /></span>
            Rewards Management
          </h1>
          <p>Create and manage rewards that members can redeem using their points.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=settings")}>
            <Icon name="gear" size={14} /> Rewards Settings
          </button>
          <div className="ptsrwd-dd-wrap">
            <button
              className="btn btn-purple btn-small ptsrwd-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Add New Reward
              <Icon name="chevron" size={14} />
            </button>
            {addOpen && (
              <div className="ptsrwd-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Voucher reward form coming soon"); }}>Discount Voucher</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Benefit reward form coming soon"); }}>Benefit / Service</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Physical reward form coming soon"); }}>Physical Merchandise</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six ptsrwd-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Rewards</div>
            <div className="prod-stat-n purple">{fmtNum(stats.totalRewards)}</div>
            <div className="cat-stat-hint ptsrwd-hint"><i className="dot green" /> {stats.totalHint}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="gift" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Rewards</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint ptsrwd-hint"><i className="dot green" /> {stats.activeHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Upcoming Rewards</div>
            <div className="prod-stat-n blue">{fmtNum(stats.upcoming)}</div>
            <div className="cat-stat-hint ptsrwd-hint"><i className="dot blue" /> {stats.upcomingHint}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Inactive Rewards</div>
            <div className="prod-stat-n orange">{fmtNum(stats.inactive)}</div>
            <div className="cat-stat-hint ptsrwd-hint"><i className="dot orange" /> {stats.inactiveHint}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="pause" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Redeemed</div>
            <div className="prod-stat-n red">{fmtNum(stats.totalRedeemed)}</div>
            <div className="cat-stat-hint ptsrwd-hint"><i className="dot green" /> {stats.redeemedHint}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="ticket" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Spent</div>
            <div className="prod-stat-n gold">{fmtNum(stats.pointsSpent)}</div>
            <div className="cat-stat-hint ptsrwd-hint"><i className="dot green" /> {stats.spentHint}</div>
          </div>
          <div className="prod-stat-icon gold"><Icon name="star" size={16} /></div>
        </article>
      </section>

      <div className="ptsrwd-layout">
        <div className="ptsrwd-main">
          <section className="card prod-filters">
            <form className="prod-filter-row ptsrwd-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rewards..." />
              </div>
              <select value={categoryF} onChange={(e) => { setCategoryF(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {(data.filters?.categories || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={tierF} onChange={(e) => { setTierF(e.target.value); setPage(1); }}>
                <option value="">All Tiers</option>
                {(data.filters?.tiers || []).map((t) => (
                  <option key={t} value={t}>{t === "All Tiers" ? "Available to All Tiers" : t}</option>
                ))}
              </select>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                {(data.filters?.types || []).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                <option value="newest">Sort by: Newest First</option>
                <option value="oldest">Sort by: Oldest First</option>
                <option value="cost-asc">Sort by: Points Cost ↑</option>
                <option value="cost-desc">Sort by: Points Cost ↓</option>
                <option value="redeemed">Sort by: Most Redeemed</option>
              </select>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          </section>

          <section className="card ptsrwd-table-card">
            <div className="prod-table-wrap ptsrwd-scroll">
              <table className="table prod-table ptsrwd-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reward Name</th>
                    <th>Category</th>
                    <th>Points Cost</th>
                    <th>Reward Type</th>
                    <th>Available For</th>
                    <th>Redemption Limit</th>
                    <th>Redeemed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td>
                        <div className="prod-cell ptsrwd-name">
                          <span className={icoCls(r.color)}><Icon name={r.icon} size={14} /></span>
                          <div>
                            <strong>{r.name}</strong>
                            <div className="muted">{r.category}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`ptsrwd-cat ${catCls(r.category)}`}>{r.category}</span></td>
                      <td><strong>{fmtNum(r.pointsCost)} pts</strong></td>
                      <td><span className={`ptsrwd-rtype ${typeCls(r.rewardType)}`}>{r.rewardType}</span></td>
                      <td>{r.availableFor}</td>
                      <td>
                        <span className="ptsrwd-limit">
                          {r.limit}
                          <Icon name="info" size={12} />
                        </span>
                      </td>
                      <td>{fmtNum(r.redeemed)}</td>
                      <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="Edit" onClick={() => setToast(`Edit ${r.name}`)}>
                            <Icon name="pencil" size={14} />
                          </button>
                          <button type="button" title="More" onClick={() => setToast(`Actions for ${r.name}`)}>
                            <Icon name="more" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan="10" className="muted">No rewards match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} rewards</span>
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

        <aside className="ptsrwd-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Rewards by Category</h2>
            <Donut parts={data.categoryDonut} centerTotal={stats.totalRewards} totalLabel="Total" />
          </section>

          <section className="card pf-card">
            <div className="ptsrwd-side-head">
              <h2><Icon name="trophy" size={14} /> Top Redeemed Rewards</h2>
              <button className="link-reset" type="button" onClick={() => setSort("redeemed")}>View All</button>
            </div>
            <ul className="ptsrwd-top-list">
              {(data.topRedeemed || []).map((r, i) => (
                <li key={r.name}>
                  <span className="ptsrwd-rank">{i + 1}</span>
                  <span className={icoCls(r.color)}><Icon name={r.icon} size={14} /></span>
                  <div>
                    <strong>{r.name}</strong>
                    <span className="muted">{fmtNum(r.redeemed)} redeemed</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <div className="ptsrwd-side-head">
              <h2><Icon name="layers" size={14} /> Reward Status</h2>
              <button className="link-reset" type="button" onClick={() => setStatusF("")}>View All</button>
            </div>
            <ul className="ptsrwd-status-list">
              {(data.statusBreakdown || []).map((s) => (
                <li key={s.key}>
                  <div className="ptsrwd-status-meta">
                    <span><i style={{ background: s.color }} /> {s.name}</span>
                    <b>{fmtNum(s.value)} · {Number(s.pct).toFixed(1)}%</b>
                  </div>
                  <div className="ptsrwd-status-track">
                    <i style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card ptsrwd-foot">
          <p>
            <Icon name="bulb" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
