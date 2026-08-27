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
  if (status === "completed" || status === "active") return "mktov-st-active";
  if (status === "scheduled") return "mktov-st-sched";
  return "mktov-st-draft";
}

export default function MarketingEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [categoryF, setCategoryF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Promotional", subject: "" });

  function qs(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      category: next.category ?? categoryF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.category) p.set("category", vals.category);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/marketing-email?${qs(overrides)}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load email marketing."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, categoryF]);

  useEffect(() => {
    if (searchParams.get("new") === "1" || searchParams.get("templates") === "1") {
      setFormOpen(true);
      if (searchParams.get("templates") === "1") setToast("Browse templates below or create a new one");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() { setMenu(null); }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function open(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(r);
  }

  function saveForm(e) {
    e.preventDefault();
    if (!form.name.trim()) return setToast("Template name is required");
    setFormOpen(false);
    setToast(`Email template “${form.name}” saved as draft`);
    setForm({ name: "", category: "Promotional", subject: "" });
  }

  if (!data) {
    return (
      <div className="mktpg-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link><span>›</span>
          <Link to="/marketing">Marketing</Link><span>›</span>
          <strong>Email Marketing</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading email marketing…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.templates || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  return (
    <div className="mktpg-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link><span>›</span>
        <Link to="/marketing">Marketing</Link><span>›</span>
        <strong>Email Marketing</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="mail" size={16} /></span>
            Email Marketing
          </h1>
          <p>Manage email templates, campaigns and delivery performance.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing?tab=campaigns")}>
            All Campaigns
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setFormOpen(true)}>
            <Icon name="plus" size={14} /> New Template
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five mktpg-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Emails Sent</div>
            <div className="prod-stat-n purple">{fmtNum(stats.sent)}</div>
            <div className="cat-stat-hint up">↑ {stats.sentDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="mail" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Open Rate</div>
            <div className="prod-stat-n green">{fmtNum(stats.openRate, 1)}%</div>
            <div className="cat-stat-hint up">↑ {stats.openDelta}%</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="eye" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Click Through Rate</div>
            <div className="prod-stat-n blue">{fmtNum(stats.ctr, 1)}%</div>
            <div className="cat-stat-hint up">↑ {stats.ctrDelta}%</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="trend" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Templates</div>
            <div className="prod-stat-n orange">{fmtNum(stats.templates)}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="layers" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Campaign Revenue</div>
            <div className="prod-stat-n indigo">{kes(stats.revenue)}</div>
            <div className="cat-stat-hint up">↑ {stats.revenueDelta}%</div>
          </div>
          <div className="prod-stat-icon indigo"><Icon name="coin" size={16} /></div>
        </article>
      </section>

      <div className="mktpg-layout">
        <div className="mktpg-main">
          <section className="card prod-filters">
            <form className="prod-filter-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load({ q, page: 1 }); }}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates..." />
              </div>
              <select value={categoryF} onChange={(e) => { setCategoryF(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {(data.filters?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {(data.filters?.statuses || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn btn-ghost btn-small" type="submit"><Icon name="filter" size={14} /> Filter</button>
            </form>
          </section>

          <section className="card prod-table-wrap mktpg-table-card">
            <div className="mktpg-table-head"><h2>Email Templates</h2></div>
            <table className="table prod-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Template</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Uses</th>
                  <th>Open Rate</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.n}</td>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.category}</td>
                    <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                    <td>{fmtNum(r.uses)}</td>
                    <td>{r.openRate ? `${fmtNum(r.openRate, 1)}%` : "—"}</td>
                    <td>{r.updated}</td>
                    <td>
                      <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                        <button type="button" title="View" onClick={(e) => open(r, e)}><Icon name="eye" size={14} /></button>
                        <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                          <button type="button" onClick={(e) => open(r, e)}>View details</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setForm({ name: `${r.name} Copy`, category: r.category, subject: "" }); setFormOpen(true); }}>Duplicate</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`“${r.name}” marked active`); }}>Activate</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`Campaign started from “${r.name}”`); }}>Use in campaign</button>
                        </DeliveryRowMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan="8" className="muted">No templates found.</td></tr>}
              </tbody>
            </table>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} templates</span>
              <div className="pager-btns">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon name="chevronLeft" size={14} /></button>
                <button type="button" className="on">{page}</button>
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><Icon name="chevronRight" size={14} /></button>
              </div>
            </footer>
          </section>
        </div>

        <aside className="mktpg-side">
          <section className="card pf-card">
            <h2><Icon name="megaphone" size={14} /> Recent Email Campaigns</h2>
            <ul className="mktpg-recent">
              {(data.recent || []).map((c) => (
                <li key={c.id}>
                  <div>
                    <strong>{c.name}</strong>
                    <div className="muted">{c.sent}</div>
                  </div>
                  <span className={`st-pill ${statusCls(c.status)}`}>{c.statusLabel}</span>
                </li>
              ))}
            </ul>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing?tab=campaigns&type=email")}>
              View all email campaigns
            </button>
          </section>
        </aside>
      </div>

      {formOpen && (
        <div className="prod-modal" onClick={() => setFormOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveForm}>
            <div className="ord-drawer-head">
              <div>
                <h2>New Email Template</h2>
                <p className="muted">Create a reusable email template for campaigns.</p>
              </div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <label>
                Template name
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Flash Drop Announcement" required />
              </label>
              <label>
                Category
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {(data.filters?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="full">
                Subject line
                <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Email subject" />
              </label>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit">Save draft</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <DeliveryDetailModal
          title={viewing.name}
          subtitle={viewing.category}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <button className="btn btn-purple btn-small" type="button" onClick={() => { setViewing(null); setToast(`Campaign started from “${viewing.name}”`); }}>
              Use in campaign
            </button>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Uses", value: fmtNum(viewing.uses) },
              { label: "Open rate", value: viewing.openRate ? `${fmtNum(viewing.openRate, 1)}%` : "—" },
              { label: "Updated", value: viewing.updated },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
