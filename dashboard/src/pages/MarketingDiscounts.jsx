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
  if (status === "active") return "mktov-st-active";
  if (status === "scheduled") return "mktov-st-sched";
  if (status === "expired") return "mktov-st-done";
  return "mktov-st-draft";
}

function valueLabel(r) {
  if (r.type === "percent") return `${r.value}%`;
  if (r.type === "fixed") return kes(r.value);
  return "Free shipping";
}

export default function MarketingDiscounts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: "10", limit: "" });

  function qs(next = {}) {
    const p = new URLSearchParams();
    const vals = { q: next.q ?? q, status: next.status ?? statusF, type: next.type ?? typeF, page: next.page ?? page, limit: next.limit ?? limit };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.type) p.set("type", vals.type);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/marketing-discounts?${qs(overrides)}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load discounts."));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, limit, statusF, typeF]);
  useEffect(() => { if (searchParams.get("new") === "1") setFormOpen(true); }, [searchParams]);
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

  function open(r, e) { e?.stopPropagation?.(); setMenu(null); setViewing(r); }

  function saveForm(e) {
    e.preventDefault();
    if (!form.code.trim()) return setToast("Coupon code is required");
    setFormOpen(false);
    setToast(`Discount “${form.code.toUpperCase()}” created`);
    setForm({ code: "", type: "percent", value: "10", limit: "" });
    load();
  }

  if (!data) {
    return (
      <div className="mktpg-page">
        <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/marketing">Marketing</Link><span>›</span><strong>Discounts & Coupons</strong></nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading discounts…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.discounts || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  return (
    <div className="mktpg-page">
      <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/marketing">Marketing</Link><span>›</span><strong>Discounts & Coupons</strong></nav>
      <div className="prod-head">
        <div>
          <h1><span className="prod-title-icon solid"><Icon name="tag" size={16} /></span> Discounts & Coupons</h1>
          <p>Create promo codes and track redemption performance.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing")}>Back to Overview</button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setFormOpen(true)}><Icon name="plus" size={14} /> Create Discount</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five mktpg-kpis">
        <article className="prod-stat cat-stat"><div><div className="muted">Active Codes</div><div className="prod-stat-n purple">{fmtNum(stats.active)}</div></div><div className="prod-stat-icon purple"><Icon name="tag" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Total Usage</div><div className="prod-stat-n green">{fmtNum(stats.usage)}</div><div className="cat-stat-hint up">↑ {stats.usageDelta}%</div></div><div className="prod-stat-icon green"><Icon name="users" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Revenue Attributed</div><div className="prod-stat-n blue">{kes(stats.revenue)}</div><div className="cat-stat-hint up">↑ {stats.revenueDelta}%</div></div><div className="prod-stat-icon blue"><Icon name="coin" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Scheduled</div><div className="prod-stat-n orange">{fmtNum(stats.scheduled)}</div></div><div className="prod-stat-icon orange"><Icon name="calendar" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Expired</div><div className="prod-stat-n red">{fmtNum(stats.expired)}</div></div><div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div></article>
      </section>

      <section className="card prod-filters">
        <form className="prod-filter-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load({ q, page: 1 }); }}>
          <div className="prod-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search codes..." /></div>
          <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {(data.filters?.types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {(data.filters?.statuses || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-small" type="submit"><Icon name="filter" size={14} /> Filter</button>
        </form>
      </section>

      <section className="card prod-table-wrap mktpg-table-card">
        <table className="table prod-table">
          <thead>
            <tr><th>#</th><th>Code</th><th>Type</th><th>Value</th><th>Status</th><th>Usage</th><th>Limit</th><th>Revenue</th><th>Validity</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.n}</td>
                <td><code className="mktpg-code">{r.code}</code></td>
                <td>{r.typeLabel}</td>
                <td><strong>{valueLabel(r)}</strong></td>
                <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                <td>{fmtNum(r.usage)}</td>
                <td>{r.limit == null ? "Unlimited" : fmtNum(r.limit)}</td>
                <td>{kes(r.revenue)}</td>
                <td className="mktpg-sub">{r.starts} → {r.ends}</td>
                <td>
                  <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                    <button type="button" title="View" onClick={(e) => open(r, e)}><Icon name="eye" size={14} /></button>
                    <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                      <button type="button" onClick={(e) => open(r, e)}>View details</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); if (navigator.clipboard?.writeText) navigator.clipboard.writeText(r.code).catch(() => {}); setToast(`Copied ${r.code}`); }}>Copy code</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(r.status === "active" ? `Deactivated ${r.code}` : `Activated ${r.code}`); }}>{r.status === "active" ? "Deactivate" : "Activate"}</button>
                    </DeliveryRowMenu>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="10" className="muted">No discounts found.</td></tr>}
          </tbody>
        </table>
        <footer className="prod-pager">
          <span>Showing {fromN} to {toN} of {fmtNum(total)} discounts</span>
          <div className="pager-btns">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon name="chevronLeft" size={14} /></button>
            <button type="button" className="on">{page}</button>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><Icon name="chevronRight" size={14} /></button>
          </div>
        </footer>
      </section>

      {formOpen && (
        <div className="prod-modal" onClick={() => setFormOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveForm}>
            <div className="ord-drawer-head">
              <div><h2>Create Discount</h2><p className="muted">Set up a coupon code for the storefront.</p></div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <label>Code<input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="TAJIRA10" required /></label>
              <label>Type
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed (KES)</option>
                  <option value="shipping">Free Shipping</option>
                </select>
              </label>
              <label>Value<input type="number" min="0" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} disabled={form.type === "shipping"} /></label>
              <label>Usage limit<input type="number" min="0" value={form.limit} onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))} placeholder="Unlimited" /></label>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit">Create discount</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <DeliveryDetailModal title={viewing.code} subtitle={viewing.typeLabel} statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>} onClose={() => setViewing(null)} actions={<button className="btn btn-purple btn-small" type="button" onClick={() => { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(viewing.code).catch(() => {}); setToast(`Copied ${viewing.code}`); setViewing(null); }}>Copy code</button>}>
          <DetailMeta rows={[
            { label: "Value", value: valueLabel(viewing) },
            { label: "Usage", value: `${fmtNum(viewing.usage)}${viewing.limit == null ? "" : ` / ${fmtNum(viewing.limit)}`}` },
            { label: "Revenue", value: <strong>{kes(viewing.revenue)}</strong> },
            { label: "Starts", value: viewing.starts },
            { label: "Ends", value: viewing.ends },
          ]} />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
