import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const EMPTY = { name: "", description: "", status: "active" };

const QUICK = [
  { id: "add", icon: "plus", label: "Add Category", tone: "purple" },
  { id: "import", icon: "upload", label: "Import Categories", tone: "blue" },
  { id: "assign", icon: "box", label: "Assign Products", tone: "orange" },
  { id: "analytics", icon: "chart", label: "Category Analytics", tone: "green" },
  { id: "reorder", icon: "list", label: "Reorder Categories", tone: "purple" },
  { id: "settings", icon: "gear", label: "Category Settings", tone: "orange" },
];

const ASSIGNABLE = [
  { id: "p1", name: "TP-Link Archer C6", sku: "TL-ARCH-C6", category: "Networking" },
  { id: "p2", name: "Cisco Catalyst 2960", sku: "CS-2960", category: "Networking" },
  { id: "p3", name: "Hikvision DS-2CD2143", sku: "HK-2CD2143", category: "CCTV" },
  { id: "p4", name: "Dahua NVR 8-channel", sku: "DH-NVR8", category: "CCTV" },
  { id: "p5", name: "Ubiquiti UniFi AP", sku: "UB-UAP", category: "Wi-Fi" },
  { id: "p6", name: "ZKTeco F18", sku: "ZK-F18", category: "Access Control" },
  { id: "p7", name: "Cat6 UTP 305m", sku: "CB-C6-305", category: "Cables & Accessories" },
  { id: "p8", name: "APC Smart-UPS 1500", sku: "APC-SU1500", category: "Power Equipment" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function pct(n) {
  if (!n) return "0%";
  const v = Number(n);
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap fdc-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {(parts || []).map((p) => {
          const value = p.value || 0;
          const len = slices ? (value / slices) * c : 0;
          const el = (
            <circle
              key={p.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">Total Products</text>
      </svg>
      <ul className="donut-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{Number(p.pct).toFixed(1)}% ({fmtNum(p.value)})</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function YesNo({ on, yesLabel = "Yes", noLabel = "No" }) {
  return on ? (
    <span className="fdc-yes"><Icon name="check" size={14} /> {yesLabel}</span>
  ) : (
    <span className="fdc-no"><Icon name="x" size={14} /> {noLabel}</span>
  );
}

export default function FlashDropCategories() {
  const importRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [rulesMap, setRulesMap] = useState({});
  const [defaultRules, setDefaultRules] = useState({});
  const [performance, setPerformance] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [ruleCat, setRuleCat] = useState("Networking");
  const [form, setForm] = useState(EMPTY);
  const [ruleForm, setRuleForm] = useState({});
  const [orderIds, setOrderIds] = useState([]);
  const [assigned, setAssigned] = useState(["p1", "p3"]);
  const [settings, setSettings] = useState({ uniqueNames: true, autoArchive: false, defaultMax: 60 });
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function query(next = {}) {
    const qs = new URLSearchParams({
      page: String(next.page ?? page),
      limit: String(next.limit ?? limit),
    });
    const search = next.q ?? q;
    const status = next.status ?? statusF;
    if (search.trim()) qs.set("q", search.trim());
    if (status) qs.set("status", status);
    return qs.toString();
  }

  function apply(d) {
    setRows(d.categories || []);
    setTotal(d.total || 0);
    setStats(d.stats || {});
    setRulesMap(d.rules || {});
    setDefaultRules(d.defaultRules || {});
    setPerformance(d.performance || []);
    setDistribution(d.distribution || []);
  }

  function load(next = {}) {
    api(`/admin/flash-drop-categories?${query(next)}`)
      .then((d) => {
        apply(d);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load categories."));
  }

  useEffect(() => {
    load();
  }, [page, limit, q, statusF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  const safePage = Math.min(page, pages);
  const fromN = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const toN = Math.min(safePage * limit, total);
  const pageButtons = useMemo(() => {
    const maxBtns = Math.min(pages, 3);
    let start = Math.max(1, Math.min(safePage - 1, pages - maxBtns + 1));
    return Array.from({ length: maxBtns }, (_, i) => start + i);
  }, [pages, safePage]);

  const ruleNames = useMemo(() => {
    const names = rows.map((r) => r.name);
    if (!names.includes("Networking")) names.unshift("Networking");
    return [...new Set(names)];
  }, [rows]);

  const currentRules = rulesMap[ruleCat] || defaultRules;

  function openAdd() {
    setForm(EMPTY);
    setModal("form");
    setMenu(null);
  }

  function openEdit(row) {
    setForm({ id: row.id, name: row.name, description: row.description || "", status: row.status });
    setModal("form");
    setMenu(null);
    setViewing(null);
  }

  function openRules() {
    setRuleForm({ ...currentRules });
    setModal("rules");
  }

  function openReorder() {
    api("/admin/flash-drop-categories?limit=50")
      .then((d) => {
        apply(d);
        setOrderIds((d.categories || []).map((r) => r.id));
        setModal("reorder");
      })
      .catch((err) => setError(err.message || "Could not load categories."));
  }

  function moveOrder(id, dir) {
    setOrderIds((cur) => {
      const i = cur.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function runQuick(id) {
    if (id === "add") openAdd();
    else if (id === "import") importRef.current?.click();
    else if (id === "assign") { setModal("assign"); setMenu(null); }
    else if (id === "analytics") setModal("analytics");
    else if (id === "reorder") openReorder();
    else if (id === "settings") setModal("settings");
  }

  function exportCsv() {
    const header = ["#", "Category", "Description", "Products", "Active Drops", "Completed Drops", "Avg Discount", "Status"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        `"${(r.name || "").replaceAll('"', '""')}"`,
        `"${(r.description || "").replaceAll('"', '""')}"`,
        r.products,
        r.activeDrops,
        r.completed,
        r.avgDiscount,
        r.status,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-flash-drop-categories.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Categories exported");
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { name: form.name.trim(), description: form.description, status: form.status };
      const d = form.id
        ? await api(`/admin/flash-drop-categories/${form.id}?${query()}`, { method: "PATCH", body: JSON.stringify(body) })
        : await api(`/admin/flash-drop-categories?${query()}`, { method: "POST", body: JSON.stringify(body) });
      apply(d);
      setToast(form.id ? "Category saved" : "Category added");
      setModal(null);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || "Could not save category.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRuleForm(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api(`/admin/flash-drop-categories/${encodeURIComponent(ruleCat)}/rules?${query()}`, {
        method: "PATCH",
        body: JSON.stringify({ category: ruleCat, ...ruleForm }),
      });
      apply(d);
      setToast("Rules saved");
      setModal(null);
    } catch (err) {
      setError(err.message || "Could not save rules.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReorder() {
    setBusy(true);
    try {
      const d = await api(`/admin/flash-drop-categories/reorder?${query()}`, {
        method: "POST",
        body: JSON.stringify({ ids: orderIds }),
      });
      apply(d);
      setToast("Category order updated");
      setModal(null);
    } catch (err) {
      setError(err.message || "Could not reorder categories.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(row) {
    setMenu(null);
    try {
      const d = await api(`/admin/flash-drop-categories/${row.id}/duplicate?${query()}`, { method: "POST", body: "{}" });
      apply(d);
      setToast("Category duplicated");
    } catch (err) {
      setError(err.message || "Could not duplicate category.");
    }
  }

  async function patchStatus(row, status) {
    setMenu(null);
    try {
      const d = await api(`/admin/flash-drop-categories/${row.id}?${query()}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      apply(d);
      setToast(status === "active" ? "Category activated" : "Category deactivated");
    } catch (err) {
      setError(err.message || "Could not update category.");
    }
  }

  async function remove(row) {
    setMenu(null);
    setModal(null);
    setViewing(null);
    try {
      const d = await api(`/admin/flash-drop-categories/${row.id}?${query()}`, { method: "DELETE" });
      apply(d);
      setToast("Category deleted");
    } catch (err) {
      setError(err.message || "Could not delete category.");
    }
  }

  const orderRows = orderIds
    .map((id) => rows.find((r) => r.id === id))
    .filter(Boolean);
  const assignItems = ASSIGNABLE.filter((p) => p.category === ruleCat);
  const assignPool = assignItems.length ? assignItems : ASSIGNABLE.slice(0, 4);

  return (
    <div className="fd-page fdc-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Drop Categories</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drop Categories
            <span className="prod-title-icon"><Icon name="folder" size={16} /></span>
          </h1>
          <p>Manage categories used to organize and control Flash Drops.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Categories
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={openAdd}>
            <Icon name="plus" size={14} /> Add Category
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Drop Categories</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="folder" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Categories</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint">{stats.activePct}% of total</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Products Assigned</div>
            <div className="prod-stat-n blue">{fmtNum(stats.products)}</div>
            <div className="cat-stat-hint">Across all categories</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Flash Drops</div>
            <div className="prod-stat-n orange">{fmtNum(stats.activeDrops)}</div>
            <div className="cat-stat-hint">Across categories</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="bolt" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Most Popular Category</div>
            <div className="prod-stat-n pink">{stats.popular || "Networking"}</div>
            <div className="cat-stat-hint">{stats.popularPct}% of total drops</div>
          </div>
          <div className="prod-stat-icon pink"><Icon name="tag" size={16} /></div>
        </article>
      </section>

      <div className="pts-layout has-side comp-layout">
        <section className="card cat-table-card">
          <div className="cat-toolbar fdc-table-bar">
            <h3>All Categories</h3>
            <form
              className="cat-tools"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                load({ page: 1 });
              }}
            >
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search categories..."
                />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button className="btn btn-ghost btn-small" type="button" onClick={openReorder}>
                Reorder Categories
              </button>
            </form>
          </div>
          <div className="prod-table-wrap">
            <table className="table prod-table pts-table fdc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Products</th>
                  <th>Active Drops</th>
                  <th>Completed Drops</th>
                  <th>Avg. Discount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={form.id === r.id ? "is-open" : ""}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <button className="rule-name rwd-name" type="button" onClick={() => setViewing(r)}>
                        <span className={`rule-ico ${r.tone || "purple"}`}><Icon name={r.ico || "folder"} size={14} /></span>
                        <span><strong>{r.name}</strong></span>
                      </button>
                    </td>
                    <td className="fdc-desc">{r.description}</td>
                    <td>{fmtNum(r.products)}</td>
                    <td className={r.activeDrops > 0 ? "fd-discount" : ""}>{fmtNum(r.activeDrops)}</td>
                    <td>{fmtNum(r.completed)}</td>
                    <td>{pct(r.avgDiscount)}</td>
                    <td>
                      <span className={`st-pill ${r.status === "active" ? "st-pub" : "ord-st-cancelled"}`}>
                        {r.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="prod-row-acts">
                        <button type="button" title="Edit" onClick={() => openEdit(r)}><Icon name="pencil" size={14} /></button>
                        <button type="button" title="View" onClick={() => { setViewing(r); setMenu(null); }}><Icon name="eye" size={14} /></button>
                        <span className="ord-menu-wrap">
                          <button type="button" title="More" onClick={() => setMenu(menu === r.id ? null : r.id)}>
                            <Icon name="more" size={14} />
                          </button>
                          {menu === r.id && (
                            <div className="ord-menu">
                              <button type="button" onClick={() => duplicate(r)}>Duplicate</button>
                              <button type="button" onClick={() => { setRuleCat(r.name); setModal("assign"); setMenu(null); }}>Assign Products</button>
                              <button type="button" onClick={() => patchStatus(r, r.status === "active" ? "inactive" : "active")}>
                                {r.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button type="button" className="danger" onClick={() => { setViewing(r); setModal("delete"); setMenu(null); }}>Delete</button>
                            </div>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="9" className="muted">No categories match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} categories</span>
            <div className="pager-btns">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                <Icon name="chevronLeft" size={14} />
              </button>
              {pageButtons.map((n) => (
                <button key={n} type="button" className={n === safePage ? "on" : ""} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
            <label className="pager-rows">
              Rows per page
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {[10, 12, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </footer>
        </section>

        <aside className="pts-side rwd-side">
          <section className="card pts-widget">
            <h3>Category Rules & Settings</h3>
            <label>
              Category
              <select value={ruleCat} onChange={(e) => setRuleCat(e.target.value)}>
                {ruleNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <ul className="pts-sum fdc-rules">
              <li><span>Maximum Discount</span><b>{currentRules.maxDiscount ?? 60}%</b></li>
              <li><span>Minimum Stock Required</span><b>{currentRules.minStock ?? 5} units</b></li>
              <li><span>Flash Drop Eligible</span><b><YesNo on={currentRules.eligible !== false} /></b></li>
              <li><span>Allow Backorders</span><b><YesNo on={Boolean(currentRules.backorders)} /></b></li>
              <li><span>Require Points to Participate</span><b><YesNo on={Boolean(currentRules.requirePoints)} /></b></li>
              <li><span>Max Drops per Month</span><b>{currentRules.maxDrops ?? 5}</b></li>
            </ul>
            <button className="btn btn-ghost btn-small fdc-edit-rules" type="button" onClick={openRules}>
              <Icon name="gear" size={14} /> Edit Rules
            </button>
          </section>

          <section className="card pts-widget">
            <h3>Quick Actions</h3>
            <div className="fd-qa-grid">
              {QUICK.map((item) => (
                <button key={item.id} type="button" onClick={() => runQuick(item.id)}>
                  <span className={`rule-ico ${item.tone}`}><Icon name={item.icon} size={14} /></span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="fdc-foot">
        <section className="card pts-widget">
          <h3>Category Performance (Last 90 Days)</h3>
          <div className="prod-table-wrap">
            <table className="table prod-table pts-table fdc-perf">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Drops Created</th>
                  <th>Items Sold</th>
                  <th>Revenue (KES)</th>
                  <th>Average Discount</th>
                  <th>Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((row) => (
                  <tr key={row.name}>
                    <td><strong>{row.name}</strong></td>
                    <td>{fmtNum(row.drops)}</td>
                    <td>{fmtNum(row.sold)}</td>
                    <td>{kes(row.revenue)}</td>
                    <td>{pct(row.avgDiscount)}</td>
                    <td>{pct(row.conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link className="fdc-report" to="/flash-drops?tab=analytics">View Full Analytics Report →</Link>
        </section>
        <section className="card pts-widget">
          <h3>Category Distribution</h3>
          <p className="muted fdc-dist-sub">By number of products</p>
          <Donut parts={distribution} total={stats.products || 256} />
        </section>
      </div>

      <input
        ref={importRef}
        type="file"
        accept=".json,.csv,text/csv,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setToast(`Imported ${file.name}. Categories will appear after review.`);
          e.target.value = "";
        }}
      />

      {viewing && !modal && (
        <div className="prod-modal" onClick={() => setViewing(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>{viewing.name}</h2>
              <button className="icon-btn" type="button" onClick={() => setViewing(null)}>×</button>
            </div>
            <dl className="fd-view">
              <div><dt>Products</dt><dd>{fmtNum(viewing.products)}</dd></div>
              <div><dt>Active Drops</dt><dd>{fmtNum(viewing.activeDrops)}</dd></div>
              <div><dt>Completed Drops</dt><dd>{fmtNum(viewing.completed)}</dd></div>
              <div><dt>Avg. Discount</dt><dd>{pct(viewing.avgDiscount)}</dd></div>
              <div><dt>Status</dt><dd>{viewing.status === "active" ? "Active" : "Inactive"}</dd></div>
            </dl>
            {viewing.description && <p className="muted">{viewing.description}</p>}
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(null)}>Close</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => openEdit(viewing)}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {modal === "form" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveForm}>
            <div className="ord-drawer-head">
              <h2>{form.id ? "Edit Category" : "Add Category"}</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label>
              Category name
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label>
              Description
              <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit" disabled={busy}>{busy ? "Saving…" : "Save Category"}</button>
            </div>
          </form>
        </div>
      )}

      {modal === "rules" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form className="card prod-modal-card rule-drawer" onClick={(e) => e.stopPropagation()} onSubmit={saveRuleForm}>
            <div className="ord-drawer-head">
              <h2>Edit Rules — {ruleCat}</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label>
              Maximum Discount (%)
              <input type="number" min="0" max="90" value={ruleForm.maxDiscount ?? 60} onChange={(e) => setRuleForm((f) => ({ ...f, maxDiscount: Number(e.target.value) }))} />
            </label>
            <label>
              Minimum Stock Required
              <input type="number" min="0" value={ruleForm.minStock ?? 5} onChange={(e) => setRuleForm((f) => ({ ...f, minStock: Number(e.target.value) }))} />
            </label>
            <label>
              Max Drops per Month
              <input type="number" min="0" value={ruleForm.maxDrops ?? 5} onChange={(e) => setRuleForm((f) => ({ ...f, maxDrops: Number(e.target.value) }))} />
            </label>
            <label className="rwd-check">
              <input type="checkbox" checked={ruleForm.eligible !== false} onChange={(e) => setRuleForm((f) => ({ ...f, eligible: e.target.checked }))} />
              Flash Drop Eligible
            </label>
            <label className="rwd-check">
              <input type="checkbox" checked={Boolean(ruleForm.backorders)} onChange={(e) => setRuleForm((f) => ({ ...f, backorders: e.target.checked }))} />
              Allow Backorders
            </label>
            <label className="rwd-check">
              <input type="checkbox" checked={Boolean(ruleForm.requirePoints)} onChange={(e) => setRuleForm((f) => ({ ...f, requirePoints: e.target.checked }))} />
              Require Points to Participate
            </label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit" disabled={busy}>{busy ? "Saving…" : "Save Rules"}</button>
            </div>
          </form>
        </div>
      )}

      {modal === "reorder" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Reorder Categories</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <ul className="fdc-order">
              {orderRows.map((r, i) => (
                <li key={r.id}>
                  <span className={`rule-ico ${r.tone || "purple"}`}><Icon name={r.ico || "folder"} size={14} /></span>
                  <strong>{r.name}</strong>
                  <span className="fdc-order-btns">
                    <button type="button" disabled={i === 0} onClick={() => moveOrder(r.id, -1)}>Up</button>
                    <button type="button" disabled={i === orderRows.length - 1} onClick={() => moveOrder(r.id, 1)}>Down</button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={saveReorder}>Save Order</button>
            </div>
          </div>
        </div>
      )}

      {modal === "assign" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Assign Products — {ruleCat}</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <ul className="fdc-assign">
              {assignPool.map((p) => (
                <li key={p.id}>
                  <label className="rwd-check">
                    <input
                      type="checkbox"
                      checked={assigned.includes(p.id)}
                      onChange={(e) => setAssigned((cur) => e.target.checked ? [...cur, p.id] : cur.filter((id) => id !== p.id))}
                    />
                    <span>
                      <strong>{p.name}</strong>
                      <em className="muted"> {p.sku}</em>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => { setToast("Products assigned"); setModal(null); }}>Save Assignment</button>
            </div>
          </div>
        </div>
      )}

      {modal === "analytics" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card is-wide" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Category Analytics</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <p className="muted">Last 90 days performance for the selected drop categories.</p>
            <div className="prod-table-wrap">
              <table className="table prod-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Drops</th>
                    <th>Sold</th>
                    <th>Revenue</th>
                    <th>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{fmtNum(row.drops)}</td>
                      <td>{fmtNum(row.sold)}</td>
                      <td>{kes(row.revenue)}</td>
                      <td>{pct(row.conversion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Close</button>
              <Link className="btn btn-purple btn-small" to="/flash-drops?tab=analytics">Full report</Link>
            </div>
          </div>
        </div>
      )}

      {modal === "settings" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form
            className="card prod-modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              setToast("Category settings saved");
              setModal(null);
            }}
          >
            <div className="ord-drawer-head">
              <h2>Category Settings</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <label>
              Default maximum discount (%)
              <input type="number" min="0" max="90" value={settings.defaultMax} onChange={(e) => setSettings((s) => ({ ...s, defaultMax: Number(e.target.value) }))} />
            </label>
            <label className="rwd-check">
              <input type="checkbox" checked={settings.uniqueNames} onChange={(e) => setSettings((s) => ({ ...s, uniqueNames: e.target.checked }))} />
              Require unique category names
            </label>
            <label className="rwd-check">
              <input type="checkbox" checked={settings.autoArchive} onChange={(e) => setSettings((s) => ({ ...s, autoArchive: e.target.checked }))} />
              Auto-archive categories with no products
            </label>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Save Settings</button>
            </div>
          </form>
        </div>
      )}

      {modal === "delete" && viewing && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Delete {viewing.name}?</h2>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <p>This removes the category from Flash Drops. Products stay in the catalogue.</p>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-ghost btn-small danger-txt" type="button" onClick={() => remove(viewing)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
