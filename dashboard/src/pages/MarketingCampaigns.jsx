import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DeliveryRowMenu, DetailMeta } from "../DeliveryRowMenu";

function fmtNum(n, digits = 0) {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n || 0);
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

export default function MarketingCampaigns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  function qs(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      type: next.type ?? typeF,
      status: next.status ?? statusF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.type) p.set("type", vals.type);
    if (vals.status) p.set("status", vals.status);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/marketing-campaigns?${qs(overrides)}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load campaigns."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, typeF, statusF]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() { setMenu(null); setCreateOpen(false); }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function open(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(r);
  }

  if (!data) {
    return (
      <div className="mktpg-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link><span>›</span>
          <Link to="/marketing">Marketing</Link><span>›</span>
          <strong>Campaigns</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading campaigns…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.campaigns || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  return (
    <div className="mktpg-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link><span>›</span>
        <Link to="/marketing">Marketing</Link><span>›</span>
        <strong>Campaigns</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="megaphone" size={16} /></span>
            Campaigns
          </h1>
          <p>Create, schedule and track email, SMS and push campaigns.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing")}>
            Back to Overview
          </button>
          <div className="mktov-dd-wrap">
            <button
              className="btn btn-purple btn-small mktov-create-dd"
              type="button"
              onClick={(e) => { e.stopPropagation(); setCreateOpen((v) => !v); }}
            >
              <Icon name="plus" size={14} /> Create Campaign
              <Icon name="chevron" size={14} />
            </button>
            {createOpen && (
              <div className="mktov-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setCreateOpen(false); navigate("/marketing?tab=email&new=1"); }}>Email Campaign</button>
                <button type="button" onClick={() => { setCreateOpen(false); navigate("/marketing?tab=sms&new=1"); }}>SMS Campaign</button>
                <button type="button" onClick={() => { setCreateOpen(false); navigate("/marketing?tab=push&new=1"); }}>Push Campaign</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six mktpg-kpis">
        {[
          ["Total", stats.total, "purple", "megaphone"],
          ["Active", stats.active, "green", "checkCircle"],
          ["Scheduled", stats.scheduled, "orange", "calendar"],
          ["Completed", stats.completed, "blue", "checkCircle"],
          ["Drafts", stats.drafts, "pink", "layers"],
          ["Revenue", kes(stats.revenue), "indigo", "coin"],
        ].map(([label, value, tone, icon]) => (
          <article key={label} className="prod-stat cat-stat">
            <div>
              <div className="muted">{label}</div>
              <div className={`prod-stat-n ${tone}`}>{value}</div>
            </div>
            <div className={`prod-stat-icon ${tone}`}><Icon name={icon} size={16} /></div>
          </article>
        ))}
      </section>

      <section className="card prod-filters">
        <form className="prod-filter-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load({ q, page: 1 }); }}>
          <div className="prod-search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns..." />
          </div>
          <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {(data.filters?.types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {(data.filters?.statuses || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-small" type="submit"><Icon name="filter" size={14} /> Filter</button>
          <button className="link-reset" type="button" onClick={() => { setQ(""); setTypeF(""); setStatusF(""); setPage(1); load({ q: "", type: "", status: "", page: 1 }); }}>Reset</button>
        </form>
      </section>

      <section className="card prod-table-wrap mktpg-table-card">
        <table className="table prod-table mktov-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Campaign</th>
              <th>Type</th>
              <th>Status</th>
              <th>Audience</th>
              <th>Sent / Scheduled</th>
              <th>Performance</th>
              <th>Revenue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.n}</td>
                <td>
                  <button className="link-reset mktov-camp-btn" type="button" onClick={(e) => open(r, e)}>
                    <div className="prod-cell mktov-camp">
                      <img src={r.thumb} alt="" />
                      <div>
                        <strong>{r.name}</strong>
                        <div className="muted mktpg-sub">{r.subject}</div>
                      </div>
                    </div>
                  </button>
                </td>
                <td><span className={`mktov-type ${typeCls(r.type)}`}>{r.typeLabel}</span></td>
                <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                <td>{r.audience}</td>
                <td>{r.sent}</td>
                <td>{r.performance}</td>
                <td><strong>{kes(r.revenue)}</strong></td>
                <td>
                  <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                    <button type="button" title="View" onClick={(e) => open(r, e)}><Icon name="eye" size={14} /></button>
                    <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                      <button type="button" onClick={(e) => open(r, e)}>View details</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`Duplicated “${r.name}”`); }}>Duplicate</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); navigate(`/marketing?tab=${r.type}`); }}>Open channel</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(r.status === "active" ? `Paused “${r.name}”` : `Archived “${r.name}”`); }}>
                        {r.status === "active" ? "Pause" : "Archive"}
                      </button>
                    </DeliveryRowMenu>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="9" className="muted">No campaigns found.</td></tr>}
          </tbody>
        </table>
        <footer className="prod-pager">
          <span>Showing {fromN} to {toN} of {fmtNum(total)} campaigns</span>
          <div className="pager-btns">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon name="chevronLeft" size={14} /></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><Icon name="chevronRight" size={14} /></button>
          </div>
          <label className="prod-rows">
            Rows per page
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </footer>
      </section>

      {viewing && (
        <DeliveryDetailModal
          title={viewing.name}
          subtitle={viewing.subject}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <button className="btn btn-purple btn-small" type="button" onClick={() => { setViewing(null); navigate(`/marketing?tab=${viewing.type}`); }}>
              Open channel
            </button>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Type", value: viewing.typeLabel },
              { label: "Audience", value: viewing.audience },
              { label: "Sent / Scheduled", value: viewing.sent },
              { label: "Performance", value: viewing.performance },
              { label: "Conversions", value: fmtNum(viewing.conversions) },
              { label: "Revenue", value: <strong>{kes(viewing.revenue)}</strong> },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
