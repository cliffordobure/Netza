import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

const TYPE_LABEL = { select: "Select", number: "Number", text: "Text", boolean: "Boolean" };
const DISPLAY_LABEL = { dropdown: "Dropdown", radio: "Radio", checkbox: "Checkbox", swatch: "Swatch" };

const emptyForm = {
  groupId: "",
  name: "",
  type: "",
  valuesText: "",
  displayType: "dropdown",
  isActive: true,
};

const emptyGroup = { name: "", description: "", isGlobal: false };

const STATS = [
  { key: "total", label: "Total Attributes", hint: "All attributes", icon: "tag", tone: "purple" },
  { key: "active", label: "Active Attributes", hint: "Visible on store", icon: "checkCircle", tone: "green" },
  { key: "hidden", label: "Hidden Attributes", hint: "Not visible", icon: "eyeOff", tone: "orange" },
  { key: "groups", label: "Attribute Groups", hint: "Total groups", icon: "layers", tone: "blue" },
];

function parseImport(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    return Array.isArray(data) ? data : [];
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || "";
    });
    return {
      name: row.name || row.attributename,
      group: row.group || row.groupname,
      type: row.type || "select",
      displayType: row.displaytype || row.display || "dropdown",
      values: (row.values || row.options || "").replaceAll("|", ","),
      status: row.status,
    };
  });
}

export default function Attributes() {
  const [data, setData] = useState({ attributes: [], groups: [], stats: { total: 0, active: 0, hidden: 0, groups: 0 } });
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [showGroup, setShowGroup] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState(null);
  const importRef = useRef(null);

  function load() {
    api("/admin/attributes")
      .then((d) => {
        setData({
          attributes: d.attributes || [],
          groups: d.groups || [],
          stats: d.stats || { total: 0, active: 0, hidden: 0, groups: 0 },
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
    return data.attributes.filter((a) => {
      if (tab === "global" && !a.isGlobal) return false;
      if (groupFilter && a.groupId !== groupFilter) return false;
      if (typeFilter && a.type !== typeFilter) return false;
      if (status === "active" && a.isActive === false) return false;
      if (status === "hidden" && a.isActive !== false) return false;
      if (!needle) return true;
      return (
        a.name.toLowerCase().includes(needle) ||
        (a.groupName || "").toLowerCase().includes(needle) ||
        (a.values || []).join(" ").toLowerCase().includes(needle)
      );
    });
  }, [data.attributes, tab, q, groupFilter, typeFilter, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * limit, safePage * limit);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, filtered.length);
  const stats = data.stats;
  const groupRows = data.groups;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function resetFilters() {
    setQ("");
    setGroupFilter("");
    setTypeFilter("");
    setStatus("");
    setPage(1);
  }

  function startEdit(a) {
    setEditingId(a.id);
    setForm({
      groupId: a.groupId || "",
      name: a.name,
      type: a.type || "select",
      valuesText: (a.values || []).join(", "),
      displayType: a.displayType || "dropdown",
      isActive: a.isActive !== false,
    });
    setError("");
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.type) {
      setError("Attribute name and type are required.");
      return;
    }
    setBusy(true);
    setError("");
    const body = {
      name: form.name.trim(),
      groupId: form.groupId || "",
      type: form.type,
      values: form.valuesText,
      displayType: form.displayType,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api(`/admin/attributes/${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/admin/attributes", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(a) {
    await api(`/admin/attributes/${a.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !a.isActive }) });
    load();
  }

  async function remove(a) {
    if (!confirm(`Delete “${a.name}”?`)) return;
    try {
      await api(`/admin/attributes/${a.id}`, { method: "DELETE" });
      if (editingId === a.id) resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dropOn(targetId) {
    if (!dragId || dragId === targetId) return;
    const ids = data.attributes.map((a) => a.id);
    const fromI = ids.indexOf(dragId);
    const toI = ids.indexOf(targetId);
    if (fromI < 0 || toI < 0) return;
    ids.splice(fromI, 1);
    ids.splice(toI, 0, dragId);
    setDragId(null);
    try {
      await api("/admin/attributes/reorder", { method: "PATCH", body: JSON.stringify({ ids }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dropGroup(targetId) {
    if (!dragId || dragId === targetId) return;
    const ids = data.groups.map((g) => g.id);
    const fromI = ids.indexOf(dragId);
    const toI = ids.indexOf(targetId);
    if (fromI < 0 || toI < 0) return;
    ids.splice(fromI, 1);
    ids.splice(toI, 0, dragId);
    setDragId(null);
    try {
      await api("/admin/attribute-groups/reorder", { method: "PATCH", body: JSON.stringify({ ids }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveGroup(e) {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      setError("Group name is required.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: groupForm.name.trim(),
        description: groupForm.description,
        isGlobal: groupForm.isGlobal,
      };
      if (editingGroupId) {
        await api(`/admin/attribute-groups/${editingGroupId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/admin/attribute-groups", { method: "POST", body: JSON.stringify(body) });
      }
      setShowGroup(false);
      setEditingGroupId(null);
      setGroupForm(emptyGroup);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleGroup(g) {
    await api(`/admin/attribute-groups/${g.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !g.isActive }) });
    load();
  }

  async function removeGroup(g) {
    if (!confirm(`Delete group “${g.name}”?`)) return;
    try {
      await api(`/admin/attribute-groups/${g.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const items = parseImport(text).filter((i) => i.name);
      if (!items.length) {
        setError("No attributes found in that file. Use JSON or CSV with a name column.");
        return;
      }
      await api("/admin/attributes/import", { method: "POST", body: JSON.stringify({ items }) });
      load();
    } catch (err) {
      setError(err.message || "Could not import that file.");
    }
  }

  const pageButtons = [];
  const maxBtns = Math.min(pages, 7);
  let start = Math.max(1, Math.min(safePage - 3, pages - maxBtns + 1));
  for (let i = 0; i < maxBtns; i += 1) pageButtons.push(start + i);

  return (
    <div className="cat">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/products">Products</Link>
        <span>›</span>
        <strong>Attributes</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="gear" size={18} /></span>
            Product Attributes
          </h1>
          <p>Manage product attributes and specifications.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => importRef.current?.click()}>
            <Icon name="download" size={14} /> Import Attributes
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,.csv,text/csv,application/json"
            hidden
            onChange={(e) => {
              importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            className="btn btn-purple btn-small"
            type="button"
            onClick={() => {
              setEditingGroupId(null);
              setGroupForm(emptyGroup);
              setShowGroup(true);
            }}
          >
            <Icon name="plus" size={14} /> Add New Attribute Group
          </button>
        </div>
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
          <div className="attr-tabs">
            {[
              { id: "all", label: "All Attributes" },
              { id: "groups", label: "Attribute Groups" },
              { id: "global", label: "Global Attributes" },
            ].map((t) => (
              <button key={t.id} className={tab === t.id ? "on" : ""} type="button" onClick={() => { setTab(t.id); setPage(1); }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab !== "groups" && (
            <div className="attr-filters">
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search attributes..."
                />
              </div>
              <select value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}>
                <option value="">All Groups</option>
                {data.groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                <option value="select">Select</option>
                <option value="number">Number</option>
                <option value="text">Text</option>
                <option value="boolean">Boolean</option>
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
              <button className="btn btn-ghost btn-small" type="button" title="Filter">
                <Icon name="filter" size={14} />
              </button>
              <button className="link-reset" type="button" onClick={resetFilters}>Reset</button>
            </div>
          )}

          <div className="cat-table-wrap">
            {tab === "groups" ? (
              <table className="table cat-table">
                <thead>
                  <tr>
                    <th />
                    <th>Group Name</th>
                    <th>Attributes</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((g) => (
                    <tr
                      key={g.id}
                      className={dragId === g.id ? "dragging" : ""}
                      draggable
                      onDragStart={() => setDragId(g.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropGroup(g.id)}
                    >
                      <td className="cat-grip"><Icon name="grip" size={14} /></td>
                      <td>
                        <strong>{g.name}</strong>
                        {g.isGlobal ? <div className="muted">Global</div> : null}
                      </td>
                      <td>{fmtNum(g.attributeCount)}</td>
                      <td>
                        <span className={`st-pill ${g.isActive !== false ? "st-pub" : "st-draft"}`}>
                          {g.isActive !== false ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td>
                        <div className="prod-row-acts">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setEditingGroupId(g.id);
                              setGroupForm({ name: g.name, description: g.description || "", isGlobal: Boolean(g.isGlobal) });
                              setShowGroup(true);
                            }}
                          >
                            <Icon name="pencil" size={14} />
                          </button>
                          <button type="button" title={g.isActive ? "Hide" : "Show"} onClick={() => toggleGroup(g)}>
                            <Icon name={g.isActive !== false ? "eyeOff" : "eye"} size={14} />
                          </button>
                          <button type="button" title="Delete" className="danger" onClick={() => removeGroup(g)}>
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="table cat-table">
                <thead>
                  <tr>
                    <th />
                    <th>Attribute Name</th>
                    <th>Group</th>
                    <th>Type</th>
                    <th>Values / Options</th>
                    <th>Used In</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((a) => (
                    <tr
                      key={a.id}
                      className={dragId === a.id ? "dragging" : ""}
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropOn(a.id)}
                    >
                      <td className="cat-grip"><Icon name="grip" size={14} /></td>
                      <td><strong>{a.name}</strong></td>
                      <td>{a.groupName}</td>
                      <td>{TYPE_LABEL[a.type] || a.type}</td>
                      <td className="attr-values">{(a.values || []).join(", ") || "—"}</td>
                      <td>{fmtNum(a.usedIn)} products</td>
                      <td>
                        <span className={`st-pill ${a.isActive !== false ? "st-pub" : "st-draft"}`}>
                          {a.isActive !== false ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="Edit" onClick={() => startEdit(a)}><Icon name="pencil" size={14} /></button>
                          <button type="button" title={a.isActive ? "Hide" : "Show"} onClick={() => toggleVisible(a)}>
                            <Icon name={a.isActive !== false ? "eyeOff" : "eye"} size={14} />
                          </button>
                          <button type="button" title="Delete" className="danger" onClick={() => remove(a)}>
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {slice.length === 0 && (
                    <tr>
                      <td colSpan="8" className="muted">No attributes match these filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {tab !== "groups" && (
            <footer className="prod-pager">
              <span>Showing {from} to {to} of {fmtNum(filtered.length)} attributes</span>
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
          )}
        </section>

        <aside className="cat-panel">
          <form className="card pf-card" onSubmit={save}>
            <h2>Add / Edit Attribute</h2>
            <label>Attribute Group</label>
            <select value={form.groupId} onChange={(e) => set("groupId", e.target.value)}>
              <option value="">Select group</option>
              {data.groups.filter((g) => g.isActive !== false).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <label>Attribute Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Port Speed" />
            <label>Attribute Type</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">Select Type</option>
              <option value="select">Select</option>
              <option value="number">Number</option>
              <option value="text">Text</option>
              <option value="boolean">Boolean</option>
            </select>
            <label>Values / Options</label>
            <textarea
              rows={3}
              value={form.valuesText}
              onChange={(e) => set("valuesText", e.target.value)}
              placeholder="Enter values separated by comma"
            />
            <label>Display Type</label>
            <select value={form.displayType} onChange={(e) => set("displayType", e.target.value)}>
              {Object.entries(DISPLAY_LABEL).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <label>Status</label>
            <select value={form.isActive ? "active" : "hidden"} onChange={(e) => set("isActive", e.target.value === "active")}>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={resetForm}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">
                {busy ? "Saving…" : "Save Attribute"}
              </button>
            </div>
          </form>
          <section className="attr-about">
            <h2>About Attributes</h2>
            <p>Attributes describe product specifications used on listings, filters and comparison tables.</p>
            <ul>
              <li>Port Speed</li>
              <li>Wi-Fi Standard</li>
              <li>Cable Type</li>
            </ul>
          </section>
        </aside>
      </div>

      {showGroup && (
        <div className="prod-modal" onClick={() => setShowGroup(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveGroup}>
            <h2>{editingGroupId ? "Edit Attribute Group" : "Add New Attribute Group"}</h2>
            <label>Group Name</label>
            <input
              value={groupForm.name}
              onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Networking"
            />
            <label>Description</label>
            <textarea
              rows={3}
              value={groupForm.description}
              onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
            />
            <label className="row" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={groupForm.isGlobal}
                onChange={(e) => setGroupForm((f) => ({ ...f, isGlobal: e.target.checked }))}
              />
              Global group
            </label>
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowGroup(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">
                {busy ? "Saving…" : "Save Group"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
