import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fmtDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  isActive: true,
};

const STATS = [
  { key: "total", label: "Total Brands", hint: "All brands", icon: "tag", tone: "purple" },
  { key: "active", label: "Active Brands", hint: "Visible on store", icon: "checkCircle", tone: "green" },
  { key: "hidden", label: "Hidden Brands", hint: "Not visible", icon: "eyeOff", tone: "orange" },
  { key: "products", label: "Products with Brands", hint: "Total products", icon: "box", tone: "blue" },
];

export default function Brands() {
  const [data, setData] = useState({ brands: [], stats: { total: 0, active: 0, hidden: 0, products: 0 } });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [slugLocked, setSlugLocked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState(null);
  const fileRef = useRef(null);

  function load() {
    api("/admin/brands")
      .then((d) => {
        setData({
          brands: d.brands || [],
          stats: d.stats || { total: 0, active: 0, hidden: 0, products: 0 },
        });
        setError("");
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.brands.filter((b) => {
      if (status === "active" && b.isActive === false) return false;
      if (status === "hidden" && b.isActive !== false) return false;
      if (!needle) return true;
      return b.name.toLowerCase().includes(needle) || b.slug.toLowerCase().includes(needle);
    });
  }, [data.brands, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * limit, safePage * limit);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, filtered.length);
  const stats = data.stats;
  const allChecked = slice.length > 0 && slice.every((b) => selected.includes(b.id));

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSlugLocked(false);
    setError("");
  }

  function startEdit(b) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      slug: b.slug,
      description: b.description || "",
      logoUrl: b.logoUrl || "",
      isActive: b.isActive !== false,
    });
    setSlugLocked(true);
    setError("");
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Brand name and slug are required.");
      return;
    }
    setBusy(true);
    setError("");
    const body = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      description: form.description.slice(0, 160),
      logoUrl: form.logoUrl,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api(`/admin/brands/${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/admin/brands", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(b) {
    await api(`/admin/brands/${b.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !b.isActive }) });
    load();
  }

  async function remove(b) {
    if (!confirm(`Delete “${b.name}”?`)) return;
    try {
      await api(`/admin/brands/${b.id}`, { method: "DELETE" });
      if (editingId === b.id) resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function bulk(action) {
    if (!selected.length) return;
    if (action === "delete" && !confirm(`Delete ${selected.length} brands?`)) return;
    try {
      if (action === "delete") {
        await Promise.all(selected.map((id) => api(`/admin/brands/${id}`, { method: "DELETE" })));
      } else {
        const isActive = action === "activate";
        await Promise.all(selected.map((id) => api(`/admin/brands/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) })));
      }
      setSelected([]);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dropOn(targetId) {
    if (!dragId || dragId === targetId) return;
    const ids = data.brands.map((b) => b.id);
    const fromI = ids.indexOf(dragId);
    const toI = ids.indexOf(targetId);
    if (fromI < 0 || toI < 0) return;
    ids.splice(fromI, 1);
    ids.splice(toI, 0, dragId);
    setDragId(null);
    try {
      await api("/admin/brands/reorder", { method: "PATCH", body: JSON.stringify({ ids }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function addImageFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError("Use PNG, JPG or WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be 2MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", reader.result);
    reader.readAsDataURL(file);
  }

  const pageButtons = [];
  const maxBtns = Math.min(pages, 5);
  let start = Math.max(1, Math.min(safePage - 2, pages - maxBtns + 1));
  for (let i = 0; i < maxBtns; i += 1) pageButtons.push(start + i);

  return (
    <div className="cat">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/products">Products</Link>
        <span>›</span>
        <strong>Brands</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon round"><Icon name="tag" size={18} /></span>
            Brands
          </h1>
          <p>Manage and organize all product brands in your store.</p>
        </div>
        <button className="btn btn-purple btn-small" type="button" onClick={resetForm}>
          <Icon name="plus" size={14} /> Add New Brand
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="cat-stats">
        {STATS.map((s) => (
          <article key={s.key} className="prod-stat cat-stat">
            <div>
              <div className="muted">{s.label}</div>
              <div className={`prod-stat-n ${s.tone}`}>{fmtNum(stats[s.key])}</div>
              <div className="cat-stat-hint">{s.hint}</div>
            </div>
            <div className={`prod-stat-icon ${s.tone}`}>
              <Icon name={s.icon} size={16} />
            </div>
          </article>
        ))}
      </section>

      <div className="cat-layout">
        <section className="card cat-table-card">
          <div className="cat-toolbar">
            <h2>All Brands ({fmtNum(filtered.length)})</h2>
            <div className="cat-tools">
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search brands..."
                />
              </div>
              <div className="cat-filter-wrap">
                <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowFilter((v) => !v)}>
                  <Icon name="filter" size={14} /> Filter
                </button>
                {showFilter && (
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); setShowFilter(false); }}
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                )}
              </div>
              <select
                value=""
                onChange={(e) => {
                  const action = e.target.value;
                  e.target.value = "";
                  if (action) bulk(action);
                }}
                disabled={!selected.length}
              >
                <option value="">Bulk Actions</option>
                <option value="activate">Activate</option>
                <option value="hide">Hide</option>
                <option value="delete">Delete</option>
              </select>
            </div>
          </div>

          <div className="cat-table-wrap">
            <table className="table cat-table">
              <thead>
                <tr>
                  <th />
                  <th>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => setSelected(e.target.checked ? slice.map((b) => b.id) : [])}
                    />
                  </th>
                  <th>Brand</th>
                  <th>Slug</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((b) => (
                  <tr
                    key={b.id}
                    className={dragId === b.id ? "dragging" : ""}
                    draggable
                    onDragStart={() => setDragId(b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(b.id)}
                  >
                    <td className="cat-grip"><Icon name="grip" size={14} /></td>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(b.id)}
                        onChange={(e) =>
                          setSelected((ids) => (e.target.checked ? [...ids, b.id] : ids.filter((id) => id !== b.id)))
                        }
                      />
                    </td>
                    <td>
                      <div className="cat-name">
                        {b.logoUrl ? (
                          <img className="brand-logo" src={b.logoUrl} alt="" />
                        ) : (
                          <span className="brand-logo fallback">{initials(b.name)}</span>
                        )}
                        <strong>{b.name}</strong>
                      </div>
                    </td>
                    <td className="mono">{b.slug}</td>
                    <td>{fmtNum(b.productCount)}</td>
                    <td>
                      <span className={`st-pill ${b.isActive !== false ? "st-pub" : "st-draft"}`}>
                        {b.isActive !== false ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td>
                      <div className="prod-row-acts">
                        <button type="button" title="Edit" onClick={() => startEdit(b)}><Icon name="pencil" size={14} /></button>
                        <button type="button" title={b.isActive ? "Hide" : "Show"} onClick={() => toggleVisible(b)}>
                          <Icon name={b.isActive ? "eyeOff" : "eye"} size={14} />
                        </button>
                        <button type="button" title="Delete" className="danger" onClick={() => remove(b)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {slice.length === 0 && (
                  <tr>
                    <td colSpan="8" className="muted">No brands match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="prod-pager">
            <span>Showing {from} to {to} of {fmtNum(filtered.length)} brands</span>
            <div className="pager-btns">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevronLeft" size={14} />
              </button>
              {pageButtons.map((n) => (
                <button key={n} type="button" className={n === safePage ? "on" : ""} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              <button type="button" disabled={safePage >= pages} onClick={() => setPage((p) => p + 1)}>
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </footer>
        </section>

        <aside className="cat-panel">
          <form className="card pf-card" onSubmit={save}>
            <h2>Add / Edit Brand</h2>
            <label>Brand Name <span className="pf-req">*</span></label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: slugLocked ? f.slug : slugify(name) }));
              }}
              placeholder="Enter brand name"
            />
            <label>Slug (URL) <span className="pf-req">*</span></label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugLocked(true);
                set("slug", slugify(e.target.value));
              }}
              placeholder="e.g. brand-name"
            />
            <label>Description</label>
            <textarea
              rows={3}
              maxLength={160}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Enter brand description"
            />
            <div className="pf-count">{form.description.length} / 160</div>
            <label>Brand Logo / Image</label>
            <button
              type="button"
              className="pf-drop cat-drop"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addImageFile(e.dataTransfer.files?.[0]);
              }}
            >
              {form.logoUrl ? <img src={form.logoUrl} alt="" /> : <Icon name="cloud" size={28} />}
              <p>Click to upload</p>
              <small>PNG, JPG, WEBP (Max 2MB)</small>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  addImageFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </button>
            <label>Status</label>
            <select value={form.isActive ? "active" : "hidden"} onChange={(e) => set("isActive", e.target.value === "active")}>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={resetForm}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">
                {busy ? "Saving…" : "Save Brand"}
              </button>
            </div>
          </form>
          <section className="pf-tips">
            <h2><Icon name="bulb" size={16} /> Tips</h2>
            <ul>
              <li>Use high quality logos for better appearance.</li>
              <li>Hide a brand if you don&apos;t want it to appear on the store.</li>
              <li>Brands will be used for product filtering and search.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
