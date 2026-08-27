import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DeliveryRowMenu, DetailMeta } from "../DeliveryRowMenu";

const VIEW_TABS = [
  { id: "recent", label: "Recent Campaigns" },
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "drafts", label: "Drafts" },
  { id: "all", label: "All Campaigns" },
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

function statusCls(status) {
  if (status === "completed") return "mktov-st-done";
  if (status === "active") return "mktov-st-active";
  if (status === "scheduled") return "mktov-st-sched";
  return "mktov-st-draft";
}

function typeCls(type) {
  if (type === "sms") return "mktov-type-sms";
  if (type === "push") return "mktov-type-push";
  return "mktov-type-email";
}

function Gauge({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = 54;
  const c = Math.PI * r;
  const filled = (v / 100) * c;
  return (
    <div className="mktov-gauge">
      <svg viewBox="0 0 140 90" className="mktov-gauge-svg">
        <path
          d="M16 78 A54 54 0 0 1 124 78"
          fill="none"
          stroke="#EEF2F7"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M16 78 A54 54 0 0 1 124 78"
          fill="none"
          stroke="#6c5dd3"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
        />
        <text x="70" y="62" textAnchor="middle" className="mktov-gauge-val">{v.toFixed(1)}%</text>
        <text x="70" y="78" textAnchor="middle" className="mktov-gauge-label">Engagement Rate</text>
      </svg>
    </div>
  );
}

export default function MarketingOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [view, setView] = useState("recent");
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      type: next.type ?? typeF,
      channel: next.channel ?? channelF,
      tab: next.tab ?? view,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.type) p.set("type", vals.type);
    if (vals.channel) p.set("channel", vals.channel);
    if (vals.tab) p.set("tab", vals.tab);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/marketing-overview?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load marketing overview."));
  }

  useEffect(() => {
    load({ page, limit, tab: view });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, typeF, channelF, view]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setCreateOpen(false);
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
    setChannelF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", type: "", channel: "", page: 1 });
  }

  function openCampaign(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(r);
  }

  function duplicateCampaign(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setToast(`Duplicated “${r.name}” as draft`);
  }

  function pauseOrCancel(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    if (r.status === "active") setToast(`Paused “${r.name}”`);
    else if (r.status === "scheduled") setToast(`Cancelled schedule for “${r.name}”`);
    else setToast(`Archived “${r.name}”`);
  }

  function copyCampaignLink(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    const url = `${window.location.origin}/marketing?campaign=${encodeURIComponent(r.id)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setToast(`Share link copied for “${r.name}”`);
  }

  function startCampaignType(type) {
    setCreateOpen(false);
    const map = { email: "email", sms: "sms", push: "push" };
    navigate(`/marketing?tab=${map[type] || "campaigns"}&new=1`);
  }

  if (!data) {
    return (
      <div className="mktov-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/marketing">Marketing</Link>
          <span>›</span>
          <strong>Overview</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading marketing overview…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const perf = data.performance || {};
  const rows = data.campaigns || [];
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
    <div className="mktov-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/marketing">Marketing</Link>
        <span>›</span>
        <strong>Overview</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="megaphone" size={16} /></span>
            Marketing Overview
          </h1>
          <p>Track campaigns, engagement and promotional performance across channels.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing?tab=campaigns")}>
            <Icon name="megaphone" size={14} /> All Campaigns
          </button>
          <div className="mktov-dd-wrap">
            <button
              className="btn btn-purple btn-small mktov-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCreateOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Create Campaign
              <Icon name="chevron" size={14} />
            </button>
            {createOpen && (
              <div className="mktov-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => startCampaignType("email")}>Email Campaign</button>
                <button type="button" onClick={() => startCampaignType("sms")}>SMS Campaign</button>
                <button type="button" onClick={() => startCampaignType("push")}>Push Campaign</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six mktov-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Email Sent</div>
            <div className="prod-stat-n purple">{fmtNum(stats.emailSent)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.emailDelta)}`}>{deltaText(stats.emailDelta)}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="mail" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">SMS Sent</div>
            <div className="prod-stat-n green">{fmtNum(stats.smsSent)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.smsDelta)}`}>{deltaText(stats.smsDelta)}</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="phone" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Push Sent</div>
            <div className="prod-stat-n blue">{fmtNum(stats.pushSent)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.pushDelta)}`}>{deltaText(stats.pushDelta)}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="bell" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Coupons Used</div>
            <div className="prod-stat-n orange">{fmtNum(stats.couponsUsed)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.couponsDelta)}`}>{deltaText(stats.couponsDelta)}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="tag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Revenue from Campaigns</div>
            <div className="prod-stat-n indigo">{kes(stats.revenue)}</div>
            <div className={`cat-stat-hint ${deltaCls(stats.revenueDelta)}`}>{deltaText(stats.revenueDelta)}</div>
          </div>
          <div className="prod-stat-icon indigo"><Icon name="coin" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Engagement Rate</div>
            <div className="prod-stat-n pink">{fmtNum(stats.engagement, 1)}%</div>
            <div className={`cat-stat-hint ${deltaCls(stats.engagementDelta)}`}>{deltaText(stats.engagementDelta)}</div>
          </div>
          <div className="prod-stat-icon pink"><Icon name="chart" size={16} /></div>
        </article>
      </section>

      <div className="mktov-layout">
        <div className="mktov-main">
          <div className="mktov-tabs">
            {VIEW_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={view === t.id ? "on" : ""}
                onClick={() => { setView(t.id); setPage(1); }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <section className="card prod-filters">
            <form className="prod-filter-row mktov-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns, audiences..." />
              </div>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                {(data.filters?.types || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
                <option value="">All Channels</option>
                {(data.filters?.channels || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="mktov-dates">
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

          <section className="card prod-table-wrap mktov-table-card">
            <table className="table prod-table mktov-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Campaign Name</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Audience</th>
                  <th>Sent / Scheduled</th>
                  <th>Performance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <button className="link-reset mktov-camp-btn" type="button" onClick={(e) => openCampaign(r, e)}>
                        <div className="prod-cell mktov-camp">
                          <img src={r.thumb} alt="" />
                          <div>
                            <strong>{r.name}</strong>
                          </div>
                        </div>
                      </button>
                    </td>
                    <td><span className={`mktov-type ${typeCls(r.type)}`}>{r.typeLabel}</span></td>
                    <td>
                      <span className="mktov-channel">
                        <Icon name={r.channelIcon || "mail"} size={13} />
                        {r.channel}
                      </span>
                    </td>
                    <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                    <td className="mktov-aud">{r.audience}</td>
                    <td className="mktov-sent">{r.sent}</td>
                    <td className="mktov-perf-cell">{r.performance}</td>
                    <td>
                      <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                        <button type="button" title="View" onClick={(e) => openCampaign(r, e)}>
                          <Icon name="eye" size={14} />
                        </button>
                        <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                          <button type="button" onClick={(e) => openCampaign(r, e)}>View details</button>
                          <button type="button" onClick={(e) => duplicateCampaign(r, e)}>Duplicate</button>
                          <button type="button" onClick={(e) => pauseOrCancel(r, e)}>
                            {r.status === "active" ? "Pause campaign" : r.status === "scheduled" ? "Cancel schedule" : "Archive"}
                          </button>
                          <button type="button" onClick={(e) => copyCampaignLink(r, e)}>Copy share link</button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu(null);
                              navigate(`/marketing?tab=${r.type}`);
                            }}
                          >
                            Open {r.typeLabel} channel
                          </button>
                        </DeliveryRowMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="9" className="muted">No campaigns match these filters.</td></tr>
                )}
              </tbody>
            </table>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} campaigns</span>
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

        <aside className="mktov-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Campaign Performance</h2>
            <Gauge value={perf.engagement} />
            <dl className="mktov-rates">
              <div>
                <dt>Open Rate</dt>
                <dd>
                  <strong>{perf.openRate}%</strong>
                  <span className="up">↑ {perf.openDelta}%</span>
                </dd>
              </div>
              <div>
                <dt>Click Through Rate</dt>
                <dd>
                  <strong>{perf.ctr}%</strong>
                  <span className="up">↑ {perf.ctrDelta}%</span>
                </dd>
              </div>
              <div>
                <dt>Conversion Rate</dt>
                <dd>
                  <strong>{perf.conversion}%</strong>
                  <span className="up">↑ {perf.conversionDelta}%</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="card pf-card">
            <h2><Icon name="trophy" size={14} /> Top Performing Campaigns</h2>
            <ul className="mktov-top-list">
              {(data.topCampaigns || []).map((c, i) => (
                <li key={c.name}>
                  <span className="mktov-rank">{i + 1}</span>
                  <span className={`mktov-top-ico ${c.tone}`}><Icon name="megaphone" size={12} /></span>
                  <div>
                    <strong>{c.name}</strong>
                  </div>
                  <b>{c.rate}%</b>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="tag" size={14} /> Popular Coupon Codes</h2>
            <table className="mktov-coupon-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Usage</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data.coupons || []).map((c) => (
                  <tr key={c.code}>
                    <td><code>{c.code}</code></td>
                    <td>{fmtNum(c.usage)}</td>
                    <td>{kes(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>
      </div>

      {data.footerMessage && (
        <footer className="card pf-card mktov-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerMessage}
          </p>
        </footer>
      )}

      {viewing && (
        <DeliveryDetailModal
          title={viewing.name}
          subtitle={`${viewing.typeLabel} · ${viewing.channel}`}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                onClick={(e) => {
                  duplicateCampaign(viewing, e);
                  setViewing(null);
                }}
              >
                Duplicate
              </button>
              <button
                className="btn btn-purple btn-small"
                type="button"
                onClick={() => {
                  setViewing(null);
                  navigate(`/marketing?tab=${viewing.type}`);
                }}
              >
                Open channel
              </button>
            </>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Audience", value: viewing.audience },
              { label: "Sent / Scheduled", value: viewing.sent },
              { label: "Performance", value: <strong>{viewing.performance}</strong> },
              {
                label: "Open rate",
                value: viewing.status === "scheduled" || viewing.status === "draft"
                  ? "—"
                  : `${fmtNum(viewing.openRate, 1)}%`,
              },
              {
                label: "CTR",
                value: viewing.status === "scheduled" || viewing.status === "draft"
                  ? "—"
                  : `${fmtNum(viewing.ctr, 1)}%`,
              },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
