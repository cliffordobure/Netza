import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
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

export default function MarketingSms() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", audience: "All Opt-in", message: "" });

  function qs(next = {}) {
    const p = new URLSearchParams();
    const vals = { q: next.q ?? q, status: next.status ?? statusF, page: next.page ?? page, limit: next.limit ?? limit };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/marketing-sms?${qs(overrides)}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load SMS marketing."));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, limit, statusF]);
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
    if (!form.name.trim() || !form.message.trim()) return setToast("Name and message are required");
    setFormOpen(false);
    setToast(`SMS “${form.name}” saved as draft`);
    setForm({ name: "", audience: "All Opt-in", message: "" });
  }

  if (!data) {
    return (
      <div className="mktpg-page">
        <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/marketing">Marketing</Link><span>›</span><strong>SMS Marketing</strong></nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading SMS marketing…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.messages || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  return (
    <div className="mktpg-page">
      <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/marketing">Marketing</Link><span>›</span><strong>SMS Marketing</strong></nav>
      <div className="prod-head">
        <div>
          <h1><span className="prod-title-icon solid"><Icon name="phone" size={16} /></span> SMS Marketing</h1>
          <p>Send promotional and transactional SMS to customers.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing")}>Back to Overview</button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setFormOpen(true)}><Icon name="plus" size={14} /> New SMS</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five mktpg-kpis">
        <article className="prod-stat cat-stat"><div><div className="muted">SMS Sent</div><div className="prod-stat-n purple">{fmtNum(stats.sent)}</div><div className="cat-stat-hint up">↑ {stats.sentDelta}%</div></div><div className="prod-stat-icon purple"><Icon name="phone" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Delivery Rate</div><div className="prod-stat-n green">{fmtNum(stats.delivery, 1)}%</div><div className="cat-stat-hint up">↑ {stats.deliveryDelta}%</div></div><div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Click Rate</div><div className="prod-stat-n blue">{fmtNum(stats.ctr, 1)}%</div><div className="cat-stat-hint up">↑ {stats.ctrDelta}%</div></div><div className="prod-stat-icon blue"><Icon name="trend" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Credits Left</div><div className="prod-stat-n orange">{fmtNum(stats.credits)}</div><div className="cat-stat-hint down">↓ {Math.abs(stats.creditsDelta)}%</div></div><div className="prod-stat-icon orange"><Icon name="wallet" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Active Flows</div><div className="prod-stat-n indigo">{fmtNum(stats.active)}</div></div><div className="prod-stat-icon indigo"><Icon name="bolt" size={16} /></div></article>
      </section>

      <section className="card prod-filters">
        <form className="prod-filter-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load({ q, page: 1 }); }}>
          <div className="prod-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SMS..." /></div>
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
            <tr><th>#</th><th>Message</th><th>Status</th><th>Audience</th><th>Chars</th><th>Sent</th><th>Delivery</th><th>CTR</th><th>Scheduled</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.n}</td>
                <td><strong>{r.name}</strong></td>
                <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                <td>{r.audience}</td>
                <td>{r.chars}</td>
                <td>{fmtNum(r.sent)}</td>
                <td>{r.delivery ? `${fmtNum(r.delivery, 1)}%` : "—"}</td>
                <td>{r.ctr ? `${fmtNum(r.ctr, 1)}%` : "—"}</td>
                <td>{r.scheduled}</td>
                <td>
                  <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                    <button type="button" title="View" onClick={(e) => open(r, e)}><Icon name="eye" size={14} /></button>
                    <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                      <button type="button" onClick={(e) => open(r, e)}>View details</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`Duplicated “${r.name}”`); }}>Duplicate</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(r.status === "active" ? `Paused “${r.name}”` : `Sent “${r.name}”`); }}>{r.status === "active" ? "Pause" : "Send now"}</button>
                    </DeliveryRowMenu>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="10" className="muted">No SMS found.</td></tr>}
          </tbody>
        </table>
        <footer className="prod-pager">
          <span>Showing {fromN} to {toN} of {fmtNum(total)} messages</span>
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
              <div><h2>New SMS</h2><p className="muted">Compose an SMS campaign (max 160 chars recommended).</p></div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <label>Name<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></label>
              <label>Audience<input value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} /></label>
              <label className="full">Message<textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} maxLength={320} required /><span className="muted">{form.message.length}/320</span></label>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit">Save draft</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <DeliveryDetailModal title={viewing.name} subtitle={viewing.audience} statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>} onClose={() => setViewing(null)} actions={<button className="btn btn-purple btn-small" type="button" onClick={() => { setViewing(null); setToast(`Queued “${viewing.name}”`); }}>Send now</button>}>
          <DetailMeta rows={[
            { label: "Characters", value: viewing.chars },
            { label: "Sent", value: fmtNum(viewing.sent) },
            { label: "Delivery", value: viewing.delivery ? `${fmtNum(viewing.delivery, 1)}%` : "—" },
            { label: "CTR", value: viewing.ctr ? `${fmtNum(viewing.ctr, 1)}%` : "—" },
            { label: "Scheduled", value: viewing.scheduled },
          ]} />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
