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
  if (status === "active") return "mktov-st-active";
  if (status === "scheduled") return "mktov-st-sched";
  if (status === "paused") return "mktov-st-draft";
  if (status === "expired") return "mktov-st-done";
  return "mktov-st-draft";
}

export default function MarketingBanners() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [placementF, setPlacementF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", placement: "Home Hero", link: "" });

  function qs(next = {}) {
    const p = new URLSearchParams();
    const vals = { q: next.q ?? q, status: next.status ?? statusF, placement: next.placement ?? placementF, page: next.page ?? page, limit: next.limit ?? limit };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.placement) p.set("placement", vals.placement);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/marketing-banners?${qs(overrides)}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load banners."));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, limit, statusF, placementF]);
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
    if (!form.name.trim()) return setToast("Banner name is required");
    setFormOpen(false);
    setToast(`Banner “${form.name}” uploaded as draft`);
    setForm({ name: "", placement: "Home Hero", link: "" });
  }

  if (!data) {
    return (
      <div className="mktpg-page">
        <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/marketing">Marketing</Link><span>›</span><strong>Banners</strong></nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading banners…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.banners || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  return (
    <div className="mktpg-page">
      <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/marketing">Marketing</Link><span>›</span><strong>Banners</strong></nav>
      <div className="prod-head">
        <div>
          <h1><span className="prod-title-icon solid"><Icon name="layers" size={16} /></span> Banners</h1>
          <p>Manage homepage, app and category promotional banners.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing")}>Back to Overview</button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setFormOpen(true)}><Icon name="upload" size={14} /> Upload Banner</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five mktpg-kpis">
        <article className="prod-stat cat-stat"><div><div className="muted">Active Banners</div><div className="prod-stat-n purple">{fmtNum(stats.active)}</div></div><div className="prod-stat-icon purple"><Icon name="layers" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Impressions</div><div className="prod-stat-n green">{fmtNum(stats.impressions)}</div><div className="cat-stat-hint up">↑ {stats.impressionsDelta}%</div></div><div className="prod-stat-icon green"><Icon name="eye" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Clicks</div><div className="prod-stat-n blue">{fmtNum(stats.clicks)}</div><div className="cat-stat-hint up">↑ {stats.clicksDelta}%</div></div><div className="prod-stat-icon blue"><Icon name="trend" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Avg. CTR</div><div className="prod-stat-n orange">{fmtNum(stats.avgCtr, 1)}%</div><div className="cat-stat-hint up">↑ {stats.avgCtrDelta}%</div></div><div className="prod-stat-icon orange"><Icon name="chart" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Scheduled</div><div className="prod-stat-n indigo">{fmtNum(stats.scheduled)}</div></div><div className="prod-stat-icon indigo"><Icon name="calendar" size={16} /></div></article>
      </section>

      <section className="card prod-filters">
        <form className="prod-filter-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load({ q, page: 1 }); }}>
          <div className="prod-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search banners..." /></div>
          <select value={placementF} onChange={(e) => { setPlacementF(e.target.value); setPage(1); }}>
            <option value="">All Placements</option>
            {(data.filters?.placements || []).map((p) => <option key={p} value={p}>{p}</option>)}
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
            <tr><th>#</th><th>Banner</th><th>Placement</th><th>Status</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Validity</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.n}</td>
                <td>
                  <button className="link-reset mktov-camp-btn" type="button" onClick={(e) => open(r, e)}>
                    <div className="prod-cell mktpg-banner">
                      <img src={r.image} alt="" />
                      <strong>{r.name}</strong>
                    </div>
                  </button>
                </td>
                <td>{r.placement}</td>
                <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                <td>{fmtNum(r.impressions)}</td>
                <td>{fmtNum(r.clicks)}</td>
                <td>{r.ctr ? `${fmtNum(r.ctr, 1)}%` : "—"}</td>
                <td className="mktpg-sub">{r.starts} → {r.ends}</td>
                <td>
                  <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                    <button type="button" title="View" onClick={(e) => open(r, e)}><Icon name="eye" size={14} /></button>
                    <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                      <button type="button" onClick={(e) => open(r, e)}>View details</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(r.status === "active" ? `Paused “${r.name}”` : `Activated “${r.name}”`); }}>{r.status === "active" ? "Pause" : "Activate"}</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`Duplicated “${r.name}”`); }}>Duplicate</button>
                    </DeliveryRowMenu>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="9" className="muted">No banners found.</td></tr>}
          </tbody>
        </table>
        <footer className="prod-pager">
          <span>Showing {fromN} to {toN} of {fmtNum(total)} banners</span>
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
              <div><h2>Upload Banner</h2><p className="muted">Add a promotional banner for web or app.</p></div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <label>Name<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></label>
              <label>Placement
                <select value={form.placement} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}>
                  {(data.filters?.placements || []).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="full">Link URL<input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://..." /></label>
              <label className="full">Image<input type="file" accept="image/*" onChange={() => setToast("Image selected")} /></label>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit">Save banner</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <DeliveryDetailModal title={viewing.name} subtitle={viewing.placement} statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>} onClose={() => setViewing(null)} actions={<button className="btn btn-purple btn-small" type="button" onClick={() => { setViewing(null); setToast(viewing.status === "active" ? `Paused “${viewing.name}”` : `Activated “${viewing.name}”`); }}>{viewing.status === "active" ? "Pause" : "Activate"}</button>}>
          <div className="mktpg-banner-preview"><img src={viewing.image} alt="" /></div>
          <DetailMeta rows={[
            { label: "Impressions", value: fmtNum(viewing.impressions) },
            { label: "Clicks", value: fmtNum(viewing.clicks) },
            { label: "CTR", value: viewing.ctr ? `${fmtNum(viewing.ctr, 1)}%` : "—" },
            { label: "Starts", value: viewing.starts },
            { label: "Ends", value: viewing.ends },
          ]} />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
