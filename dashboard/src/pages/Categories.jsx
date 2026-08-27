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

const emptyForm = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  imageUrl: "",
  isActive: true,
};

const STATS = [
  { key: "total", label: "Total Categories", hint: "All categories", icon: "grid", tone: "purple" },
  { key: "active", label: "Active Categories", hint: "Visible on store", icon: "box", tone: "green" },
  { key: "hidden", label: "Hidden Categories", hint: "Not visible", icon: "eyeOff", tone: "orange" },
  { key: "subcategories", label: "Sub Categories", hint: "Total sub categories", icon: "tree", tone: "blue" },
];

export default function Categories() {
  const [data, setData] = useState({ categories: [], stats: { total: 0, active: 0, hidden: 0, subcategories: 0 } });
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
    api("/admin/categories")
      .then((d) => {
        setData({
          categories: d.categories || [],
          stats: d.stats || { total: 0, active: 0, hidden: 0, subcategories: 0 },
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
    return data.categories.filter((c) => {
      if (status === "active" && !c.isActive) return false;
      if (status === "hidden" && c.isActive) return false;
      if (!needle) return true;
      return c.name.toLowerCase().includes(needle) || c.slug.toLowerCase().includes(needle);
    });
  }, [data.categories, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * limit, safePage * limit);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, filtered.length);
  const stats = data.stats;
  const parents = data.categories.filter((c) => !c.parentId && c.id !== editingId);
  const allChecked = slice.length > 0 && slice.every((c) => selected.includes(c.id));

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSlugLocked(false);
    setError("");
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      parentId: c.parentId || "",
      description: c.description || "",
      imageUrl: c.imageUrl || "",
      isActive: c.isActive !== false,
    });
    setSlugLocked(true);
    setError("");
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Category name and slug are required.");
      return;
    }
    setBusy(true);
    setError("");
    const body = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      parentId: form.parentId || null,
      description: form.description.slice(0, 160),
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api(`/admin/categories/${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/admin/categories", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(c) {
    await api(`/admin/categories/${c.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !c.isActive }) });
    load();
  }

  async function remove(c) {
    if (!confirm(`Delete “${c.name}”?`)) return;
    try {
      await api(`/admin/categories/${c.id}`, { method: "DELETE" });
      if (editingId === c.id) resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function bulk(action) {
    if (!selected.length) return;
    if (action === "delete" && !confirm(`Delete ${selected.length} categories?`)) return;
    try {
      if (action === "delete") {
        await Promise.all(selected.map((id) => api(`/admin/categories/${id}`, { method: "DELETE" })));
      } else {
        const isActive = action === "activate";
        await Promise.all(selected.map((id) => api(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) })));
      }
      setSelected([]);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dropOn(targetId) {
    if (!dragId || dragId === targetId) return;
    const ids = data.categories.map((c) => c.id);
    const fromI = ids.indexOf(dragId);
    const toI = ids.indexOf(targetId);
    if (fromI < 0 || toI < 0) return;
    ids.splice(fromI, 1);
    ids.splice(toI, 0, dragId);
    setDragId(null);
    try {
      await api("/admin/categories/reorder", { method: "PATCH", body: JSON.stringify({ ids }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function addImageFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError("Use JPG, PNG or WEBP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("imageUrl", reader.result);
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
        <strong>Categories</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="folder" size={18} /></span>
            Categories
          </h1>
          <p>Organize and manage your product categories.</p>
        </div>
        <button className="btn btn-purple btn-small" type="button" onClick={resetForm}>
          <Icon name="plus" size={14} /> Add New Category
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
            <h2>All Categories ({fmtNum(filtered.length)})</h2>
            <div className="cat-tools">
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search categories..."
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
                      onChange={(e) => setSelected(e.target.checked ? slice.map((c) => c.id) : [])}
                    />
                  </th>
                  <th>Category Name</th>
                  <th>Slug</th>
                  <th>Products</th>
                  <th>Sub Categories</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((c) => (
                  <tr
                    key={c.id}
                    className={dragId === c.id ? "dragging" : ""}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(c.id)}
                  >
                    <td className="cat-grip"><Icon name="grip" size={14} /></td>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                        }
                      />
                    </td>
                    <td>
                      <div className="cat-name">
                        <span className="cat-folder"><Icon name="folder" size={14} /></span>
                        <strong>{c.name}</strong>
                      </div>
                    </td>
                    <td className="mono">{c.slug}</td>
                    <td>{fmtNum(c.productCount)}</td>
                    <td>{fmtNum(c.childCount)}</td>
                    <td>
                      <span className={`st-pill ${c.isActive ? "st-pub" : "st-draft"}`}>
                        {c.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className="prod-row-acts">
                        <button type="button" title="Edit" onClick={() => startEdit(c)}><Icon name="pencil" size={14} /></button>
                        <button type="button" title={c.isActive ? "Hide" : "Show"} onClick={() => toggleVisible(c)}>
                          <Icon name={c.isActive ? "eyeOff" : "eye"} size={14} />
                        </button>
                        <button type="button" title="Delete" className="danger" onClick={() => remove(c)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {slice.length === 0 && (
                  <tr>
                    <td colSpan="8" className="muted">No categories match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="prod-pager">
            <span>Showing {from} to {to} of {fmtNum(filtered.length)} categories</span>
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
            <h2>Add / Edit Category</h2>
            <label>Category Name <span className="pf-req">*</span></label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: slugLocked ? f.slug : slugify(name) }));
              }}
              placeholder="Enter category name"
            />
            <label>Slug (URL) <span className="pf-req">*</span></label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugLocked(true);
                set("slug", slugify(e.target.value));
              }}
              placeholder="e.g. networking-devices"
            />
            <label>Parent Category</label>
            <select value={form.parentId} onChange={(e) => set("parentId", e.target.value)}>
              <option value="">Select parent category</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label>Description</label>
            <textarea
              rows={3}
              maxLength={160}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description for this category"
            />
            <div className="pf-count">{form.description.length} / 160</div>
            <label>Image / Icon</label>
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
              {form.imageUrl ? <img src={form.imageUrl} alt="" /> : <Icon name="cloud" size={28} />}
              <p>Upload Image</p>
              <small>Recommended: 400×400px, JPG, PNG</small>
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
                {busy ? "Saving…" : "Save Category"}
              </button>
            </div>
          </form>
          <section className="pf-tips">
            <h2><Icon name="bulb" size={16} /> Tips</h2>
            <ul>
              <li>Drag and drop to reorder categories.</li>
              <li>Hide a category if you don&apos;t want it to appear on the store.</li>
              <li>Sub categories will inherit visibility from parent category.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
