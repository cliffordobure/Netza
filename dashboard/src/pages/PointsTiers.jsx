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

function statusCls(status) {
  if (status === "inactive") return "ptstier-st-inactive";
  return "ptstier-st-active";
}

function Donut({ parts, centerTotal, totalLabel = "Total Members" }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap ptstier-donut">
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
      <ul className="donut-legend ptstier-legend">
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

export default function PointsTiers() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      memberType: next.memberType ?? typeF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.memberType) p.set("memberType", vals.memberType);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/points-tiers?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load tiers."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, typeF]);

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
    setStatusF("");
    setTypeF("");
    setPage(1);
    load({ q: "", status: "", memberType: "", page: 1 });
  }

  if (!data) {
    return (
      <div className="ptstier-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/points">Points & Rewards</Link>
          <span>›</span>
          <strong>Tiers</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading loyalty tiers…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.tiers || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const insights = data.insights || {};

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
  }

  return (
    <div className="ptstier-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/points">Points & Rewards</Link>
        <span>›</span>
        <strong>Tiers</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="crown" size={16} /></span>
            Loyalty Tiers
          </h1>
          <p>Create and manage loyalty tiers and member progression rules.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=settings")}>
            <Icon name="gear" size={14} /> Tier Settings
          </button>
          <div className="ptstier-dd-wrap">
            <button
              className="btn btn-purple btn-small ptstier-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Add New Tier
              <Icon name="chevron" size={14} />
            </button>
            {addOpen && (
              <div className="ptstier-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Custom tier form coming soon"); }}>Custom Tier</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Duplicate from Platinum"); }}>Duplicate Existing</button>
                <button type="button" onClick={() => { setAddOpen(false); setToast("Import tier rules started"); }}>Import Rules</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six ptstier-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Tiers</div>
            <div className="prod-stat-n purple">{fmtNum(stats.totalTiers)}</div>
            <div className="cat-stat-hint ptstier-hint"><i className="dot green" /> {stats.totalTiersHint}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Members</div>
            <div className="prod-stat-n green">{fmtNum(stats.totalMembers)}</div>
            <div className="cat-stat-hint ptstier-hint"><i className="dot green" /> {stats.totalMembersHint}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="trend" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Platinum Members</div>
            <div className="prod-stat-n orange">{fmtNum(stats.platinumMembers)}</div>
            <div className="cat-stat-hint ptstier-hint"><i className="dot green" /> {stats.platinumHint}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="star" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Tier Upgrades (This Month)</div>
            <div className="prod-stat-n blue">{fmtNum(stats.upgrades)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.upgradesDelta)}`}>{deltaText(stats.upgradesDelta)}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="usersPlus" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Downgrades (This Month)</div>
            <div className="prod-stat-n red">{fmtNum(stats.downgrades)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.downgradesDelta)}`}>{deltaText(stats.downgradesDelta)}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="arrowDown" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Benefits Redeemed</div>
            <div className="prod-stat-n indigo">{fmtNum(stats.benefitsRedeemed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.benefitsDelta)}`}>{deltaText(stats.benefitsDelta)}</div>
          </div>
          <div className="prod-stat-icon indigo"><Icon name="gift" size={16} /></div>
        </article>
      </section>

      <div className="ptstier-layout">
        <div className="ptstier-main">
          <section className="card prod-filters">
            <form className="prod-filter-row ptstier-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tiers..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Member Types</option>
                {(data.filters?.memberTypes || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          </section>

          <section className="card ptstier-table-card">
            <div className="prod-table-wrap ptstier-scroll">
              <table className="table prod-table ptstier-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tier Name</th>
                    <th>Badge</th>
                    <th>Points Range</th>
                    <th>Benefits</th>
                    <th>Members</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.n}</td>
                      <td>
                        <div className="ptstier-name">
                          <strong>{r.name}</strong>
                          <span className="muted">{r.subtitle}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`ptstier-badge ptstier-badge-${r.badgeColor}`}>
                          <Icon name={r.badge} size={16} />
                        </span>
                      </td>
                      <td><strong>{r.pointsRange}</strong></td>
                      <td>
                        <ul className="ptstier-benefits">
                          {r.benefits.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <div className="ptstier-members">
                          <strong>{fmtNum(r.members)}</strong>
                          <span className="muted">{Number(r.pct).toFixed(1)}%</span>
                        </div>
                      </td>
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
                    <tr><td colSpan="8" className="muted">No tiers match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} tiers</span>
              <div className="pager-btns">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="chevronLeft" size={14} />
                </button>
                {pageButtons().map((n) => (
                  <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
              <label className="prod-rows">
                Rows per page
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                  {[5, 10, 20].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </footer>
          </section>
        </div>

        <aside className="ptstier-side">
          <section className="card pf-card">
            <div className="ptstier-side-head">
              <h2><Icon name="chart" size={14} /> Members by Tier</h2>
              <button className="link-reset" type="button" onClick={() => setToast("Tier report coming soon")}>View Report</button>
            </div>
            <Donut parts={data.tierDonut} centerTotal={stats.totalMembers} totalLabel="Total Members" />
          </section>

          <section className="card pf-card">
            <h2><Icon name="trend" size={14} /> Tier Progression (This Month)</h2>
            <ul className="ptstier-prog-list">
              {(data.progression || []).map((p) => (
                <li key={p.label}>
                  <span className={`ptstier-prog-dot ${p.tone}`} />
                  <span>{p.label}</span>
                  <b>{fmtNum(p.value)}</b>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bulb" size={14} /> Tier Insights</h2>
            <ul className="ptstier-insights">
              <li>
                <strong>{fmtNum(insights.upgradedThisMonth)} members upgraded this month</strong>
                <span className={`cat-stat-hint ${deltaCls(insights.upgradedDelta)}`}>{deltaText(insights.upgradedDelta)}</span>
              </li>
              <li>
                <span className="muted">Avg. time to reach Gold tier</span>
                <strong>{insights.avgTimeToGold}</strong>
              </li>
              <li>
                <span className="muted">Points required for next tier (avg.)</span>
                <strong>{fmtNum(insights.avgPointsToNext)} pts</strong>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {(data.footerTitle || data.footerMessage) && (
        <footer className="card pf-card ptstier-foot">
          <p>
            <Icon name="info" size={14} />
            <span>
              {data.footerTitle && <strong>{data.footerTitle}: </strong>}
              {data.footerMessage}
            </span>
          </p>
        </footer>
      )}
    </div>
  );
}
