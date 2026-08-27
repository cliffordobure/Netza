import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DeliveryRowMenu, DetailMeta } from "../DeliveryRowMenu";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

export default function ProductUnits() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", abbr: "", type: "count" });

  function qs() {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (typeF) p.set("type", typeF);
    if (statusF) p.set("status", statusF);
    return p.toString();
  }

  function load() {
    api(`/admin/product-units?${qs()}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load units."));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [typeF, statusF]);
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

  function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.abbr.trim()) return setToast("Name and abbreviation are required");
    setFormOpen(false);
    setToast(`Unit “${form.name}” saved`);
    setForm({ name: "", abbr: "", type: "count" });
  }

  if (!data) {
    return (
      <div className="units-page">
        <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/products">Products</Link><span>›</span><strong>Units</strong></nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading units…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.units || [];

  return (
    <div className="units-page">
      <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/products">Products</Link><span>›</span><strong>Units</strong></nav>
      <div className="prod-head">
        <div>
          <h1><span className="prod-title-icon solid"><Icon name="box" size={16} /></span> Product Units</h1>
          <p>Define measurement units used across inventory and product forms.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/products")}>Back to Products</button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setFormOpen(true)}><Icon name="plus" size={14} /> Add Unit</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats four units-kpis">
        <article className="prod-stat cat-stat"><div><div className="muted">Total Units</div><div className="prod-stat-n purple">{fmtNum(stats.total)}</div></div><div className="prod-stat-icon purple"><Icon name="box" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Active</div><div className="prod-stat-n green">{fmtNum(stats.active)}</div></div><div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Inactive</div><div className="prod-stat-n orange">{fmtNum(stats.inactive)}</div></div><div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Linked Products</div><div className="prod-stat-n blue">{fmtNum(stats.linkedProducts)}</div></div><div className="prod-stat-icon blue"><Icon name="layers" size={16} /></div></article>
      </section>

      <section className="card prod-filters">
        <form className="prod-filter-row" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <div className="prod-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search units..." /></div>
          <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
            <option value="">All Types</option>
            {(data.filters?.types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="">All Status</option>
            {(data.filters?.statuses || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-small" type="submit"><Icon name="filter" size={14} /> Filter</button>
        </form>
      </section>

      <section className="card prod-table-wrap units-table-card">
        <table className="table prod-table">
          <thead>
            <tr><th>#</th><th>Unit</th><th>Abbr</th><th>Type</th><th>Products</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.n}</td>
                <td><strong>{r.name}</strong></td>
                <td><code className="mktpg-code">{r.abbr}</code></td>
                <td className="caps">{r.type}</td>
                <td>{fmtNum(r.products)}</td>
                <td><span className={`st-pill ${r.status === "active" ? "sup-st-resolved" : "sup-st-closed"}`}>{r.status}</span></td>
                <td>
                  <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                    <button type="button" title="View" onClick={() => setViewing(r)}><Icon name="eye" size={14} /></button>
                    <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                      <button type="button" onClick={() => { setMenu(null); setViewing(r); }}>View</button>
                      <button type="button" onClick={() => { setMenu(null); setToast(r.status === "active" ? `Deactivated ${r.name}` : `Activated ${r.name}`); }}>{r.status === "active" ? "Deactivate" : "Activate"}</button>
                    </DeliveryRowMenu>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="7" className="muted">No units found.</td></tr>}
          </tbody>
        </table>
      </section>

      {formOpen && (
        <div className="prod-modal" onClick={() => setFormOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="ord-drawer-head">
              <div><h2>Add Unit</h2><p className="muted">Create a measurement unit for products.</p></div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <label>Name<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></label>
              <label>Abbreviation<input value={form.abbr} onChange={(e) => setForm((f) => ({ ...f, abbr: e.target.value }))} required /></label>
              <label>Type
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {(data.filters?.types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit">Save unit</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <DeliveryDetailModal title={viewing.name} subtitle={viewing.abbr} statusNode={<span className={`st-pill ${viewing.status === "active" ? "sup-st-resolved" : "sup-st-closed"}`}>{viewing.status}</span>} onClose={() => setViewing(null)} actions={<button className="btn btn-purple btn-small" type="button" onClick={() => { setToast(`Updated ${viewing.name}`); setViewing(null); }}>Close</button>}>
          <DetailMeta rows={[
            { label: "Type", value: viewing.type },
            { label: "Linked products", value: fmtNum(viewing.products) },
          ]} />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
