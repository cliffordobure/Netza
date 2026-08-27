import { useEffect, useRef, useState } from "react";
import { api, kes } from "../api";
import { Icon } from "../icons";

const INNER = [
  { id: "library", label: "Prize Library" },
  { id: "tiers", label: "Prize Tiers" },
  { id: "types", label: "Reward Types" },
  { id: "categories", label: "Prize Categories" },
  { id: "rules", label: "Prize Rules" },
  { id: "history", label: "Prize History" },
];

const TYPE_OPTS = [
  { id: "voucher", label: "Voucher" },
  { id: "product", label: "Product" },
  { id: "points", label: "Points" },
  { id: "cash", label: "Cash" },
];

const CATS = ["Vouchers", "Networking", "CCTV", "Wearables", "NETZA Points", "Access Control", "Cabling", "Power", "General"];

const EMPTY = {
  name: "",
  type: "voucher",
  category: "Vouchers",
  value: "",
  qty: "",
  description: "",
  status: "active",
  allCompetitions: true,
  trackStock: true,
  unlimited: false,
};

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function qtyLabel(row) {
  if (row.unlimited || row.qty == null) return "Unlimited";
  return fmtNum(row.qty);
}

function availLabel(row) {
  if (row.unlimited || row.available == null) return "Unlimited";
  return fmtNum(row.available);
}

function typeMeta(type) {
  if (type === "product") return { label: "Product", cls: "comp-type-purchase", ico: "bag", tone: "blue" };
  if (type === "points") return { label: "Points", cls: "comp-type-quiz", ico: "star", tone: "purple" };
  if (type === "cash") return { label: "Cash", cls: "comp-type-draw", ico: "receipt", tone: "gold" };
  return { label: "Voucher", cls: "comp-type-referral", ico: "gift", tone: "orange" };
}

function pagerItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages]);
  if (page <= 4) [2, 3, 4, 5].forEach((n) => set.add(n));
  else if (page >= pages - 3) [pages - 4, pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));
  else [page - 1, page, page + 1].forEach((n) => set.add(n));
  return [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
}

export default function CompetitionPrizes({ competition, onToast, onError, tabBar }) {
  const id = competition?.id;
  const importRef = useRef(null);
  const [inner, setInner] = useState("library");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [modal, setModal] = useState(null);

  function query(next = {}) {
    const qs = new URLSearchParams({
      page: String(next.page ?? page),
      limit: String(next.limit ?? limit),
    });
    const search = next.q ?? q;
    const status = next.status ?? statusF;
    if (search) qs.set("q", search);
    if (status) qs.set("status", status);
    return qs.toString();
  }

  function applyPayload(d) {
    setRows(d.prizes || []);
    setTotal(d.total || 0);
    setMeta(d);
  }

  function load(next = {}) {
    if (!id) return;
    api(`/admin/competitions/${id}/prizes?${query(next)}`)
      .then((d) => {
        applyPayload(d);
        onError?.("");
      })
      .catch((err) => onError?.(err.message || "Could not load prizes."));
  }

  useEffect(() => {
    load();
  }, [id, page, limit, q, statusF]);

  const stats = meta?.stats || {};
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const pageNums = pagerItems(page, pages);

  function setField(key, value) {
    setForm((cur) => {
      const next = { ...cur, [key]: value };
      if (key === "type") {
        if (value === "points") {
          next.unlimited = true;
          next.trackStock = false;
          next.category = "NETZA Points";
        } else if (value === "voucher") {
          next.category = "Vouchers";
          next.unlimited = false;
          next.trackStock = true;
        } else if (value === "product") {
          next.category = next.category === "Vouchers" || next.category === "NETZA Points" ? "Networking" : next.category;
          next.unlimited = false;
          next.trackStock = true;
        }
      }
      if (key === "unlimited") {
        next.trackStock = !value;
        if (value) next.qty = "";
      }
      return next;
    });
  }

  function clearForm() {
    setForm(EMPTY);
  }

  function openRow(row) {
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      value: String(row.value ?? ""),
      qty: row.unlimited ? "" : String(row.qty ?? ""),
      description: row.description || "",
      status: row.status,
      allCompetitions: row.allCompetitions !== false,
      trackStock: row.trackStock !== false && !row.unlimited,
      unlimited: Boolean(row.unlimited),
    });
    setInner("library");
    setMenu(null);
  }

  async function savePrize(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        name: form.name,
        type: form.type,
        category: form.category,
        value: Number(form.value || 0),
        qty: form.unlimited ? null : Number(form.qty || 0),
        unlimited: form.unlimited,
        description: form.description,
        status: form.status,
        allCompetitions: form.allCompetitions,
        trackStock: form.trackStock,
      };
      const d = form.id
        ? await api(`/admin/competitions/${id}/prizes/${form.id}?${query()}`, { method: "PATCH", body: JSON.stringify(body) })
        : await api(`/admin/competitions/${id}/prizes?${query()}`, { method: "POST", body: JSON.stringify(body) });
      applyPayload(d);
      onToast?.(form.id ? "Prize saved" : "Prize added");
      clearForm();
    } catch (err) {
      onError?.(err.message || "Could not save prize.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(row) {
    try {
      const d = await api(`/admin/competitions/${id}/prizes/${row.id}/duplicate?${query()}`, { method: "POST", body: "{}" });
      applyPayload(d);
      onToast?.("Prize duplicated");
    } catch (err) {
      onError?.(err.message || "Could not duplicate prize.");
    }
  }

  async function remove(row) {
    try {
      const d = await api(`/admin/competitions/${id}/prizes/${row.id}?${query()}`, { method: "DELETE" });
      applyPayload(d);
      if (form.id === row.id) clearForm();
      onToast?.("Prize removed");
    } catch (err) {
      onError?.(err.message || "Could not remove prize.");
    }
  }

  async function toggleStatus(row) {
    try {
      const d = await api(`/admin/competitions/${id}/prizes/${row.id}?${query()}`, {
        method: "PATCH",
        body: JSON.stringify({ ...row, status: row.status === "active" ? "inactive" : "active" }),
      });
      applyPayload(d);
      onToast?.(row.status === "active" ? "Prize set inactive" : "Prize set active");
    } catch (err) {
      onError?.(err.message || "Could not update prize.");
    }
  }

  function exportPrizes() {
    api(`/admin/competitions/${id}/prizes?page=1&limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}${statusF ? `&status=${statusF}` : ""}`)
      .then((d) => {
        const list = d.prizes || [];
        const csv = [
          "#,SKU,Prize Name,Type,Category,Value,Quantity,Status,Available",
          ...list.map((r) => `${r.n},${r.sku},"${r.name}",${r.type},${r.category},${r.value},${qtyLabel(r)},${r.status},${availLabel(r)}`),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${competition?.code || "competition"}-prizes.csv`;
        a.click();
        URL.revokeObjectURL(url);
        onToast?.("Prizes exported");
      })
      .catch((err) => onError?.(err.message || "Could not export prizes."));
  }

  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onToast?.("Prize import queued. Review the library after processing.");
    };
    reader.readAsText(file);
  }

  return (
    <div className="cd-prize-page">
      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="gift" size={18} /></span>
            Competition Prizes & Reward Configuration
          </h1>
          <p>Manage prizes, reward types and prize tiers used in competitions.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportPrizes}>
            <Icon name="download" size={14} /> Export Prizes
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => importRef.current?.click()}>
            <Icon name="upload" size={14} /> Import Prizes
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => { clearForm(); setInner("library"); }}>
            <Icon name="plus" size={14} /> Add New Prize
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
        </div>
      </div>

      <section className="pts-stats six">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Prizes</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint">Across all competitions</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="gift" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Prizes</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint">Available for use</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="bolt" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Physical Prizes</div>
            <div className="prod-stat-n orange">{fmtNum(stats.physical)}</div>
            <div className="cat-stat-hint">Products & items</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="bag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Prizes</div>
            <div className="prod-stat-n purple">{fmtNum(stats.points)}</div>
            <div className="cat-stat-hint">NETZA Points</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="star" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Voucher Prizes</div>
            <div className="prod-stat-n orange">{fmtNum(stats.voucher)}</div>
            <div className="cat-stat-hint">Discount vouchers</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="receipt" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Prize Value</div>
            <div className="prod-stat-n blue">{kes(stats.value || 0)}</div>
            <div className="cat-stat-hint">Across all competitions</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="trend" size={16} /></div>
        </article>
      </section>

      {tabBar}

      <div className={`pts-layout ${inner === "library" ? "has-side comp-layout" : ""}`}>
        <section className="card cat-table-card">
          <div className="pf-tabs exp-subtabs">
            {INNER.map((t) => (
              <button key={t.id} type="button" className={inner === t.id ? "on" : ""} onClick={() => setInner(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {inner === "library" && (
            <>
              <form
                className="attr-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  load({ page: 1 });
                }}
              >
                <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="prod-search">
                  <Icon name="search" size={16} />
                  <input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Search prize..."
                  />
                </div>
                <button className="btn btn-ghost btn-small" type="submit">
                  <Icon name="filter" size={14} /> Filter
                </button>
              </form>
              <div className="prod-table-wrap">
                <table className="table prod-table pts-table cd-prize-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Prize Name</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Value (KSh)</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Available</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const tm = typeMeta(r.type);
                      return (
                        <tr key={r.id} className={form.id === r.id ? "is-open" : ""}>
                          <td className="muted">{r.n}</td>
                          <td>
                            <button className="pts-cust rwd-name" type="button" onClick={() => openRow(r)}>
                              <span className={`rule-ico ${tm.tone}`}><Icon name={tm.ico} size={14} /></span>
                              <span>
                                <strong>{r.name}</strong>
                                <div className="muted">#{r.sku}</div>
                              </span>
                            </button>
                          </td>
                          <td><span className={`st-pill ${tm.cls}`}>{tm.label}</span></td>
                          <td>{r.category}</td>
                          <td>{fmtNum(r.value)}</td>
                          <td>{qtyLabel(r)}</td>
                          <td><span className={`st-pill ${r.status === "active" ? "st-pub" : "ord-st-cancelled"}`}>{r.status === "active" ? "Active" : "Inactive"}</span></td>
                          <td>{availLabel(r)}</td>
                          <td>
                            <div className="prod-row-acts">
                              <button type="button" title="Edit" onClick={() => openRow(r)}><Icon name="pencil" size={14} /></button>
                              <button type="button" title="View" onClick={() => { setModal(null); setViewing(r); setMenu(null); }}><Icon name="eye" size={14} /></button>
                              <span className="ord-menu-wrap">
                                <button type="button" title="More" onClick={() => setMenu(menu === r.id ? null : r.id)}>
                                  <Icon name="more" size={14} />
                                </button>
                                {menu === r.id && (
                                  <div className="ord-menu">
                                    <button type="button" onClick={() => { setMenu(null); duplicate(r); }}>Duplicate</button>
                                    <button type="button" onClick={() => { setMenu(null); toggleStatus(r); }}>{r.status === "active" ? "Set inactive" : "Set active"}</button>
                                    <button type="button" className="danger" onClick={() => { setMenu(null); setViewing(r); setModal("delete"); }}>Delete</button>
                                  </div>
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr><td colSpan="9" className="muted">No prizes match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="prod-pager cd-part-pager">
                <span>Showing {fromN} to {toN} of {fmtNum(total)} prizes</span>
                <div className="pager-btns">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <Icon name="chevronLeft" size={14} />
                  </button>
                  {pageNums.map((n, i) => (
                    <span key={n} className="cd-page-cluster">
                      {i > 0 && n - pageNums[i - 1] > 1 && <span className="muted">…</span>}
                      <button type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
                    </span>
                  ))}
                  <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    <Icon name="chevronRight" size={14} />
                  </button>
                </div>
                <label className="pager-rows">
                  Rows per page
                  <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                    {[8, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </footer>
            </>
          )}

          {inner === "tiers" && (
            <div className="prod-table-wrap cd-prize-pane">
              <table className="table prod-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Min Rank / Score</th>
                    <th>Max Winners</th>
                    <th>Prizes</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(meta?.tiers || []).map((t) => (
                    <tr key={t.tier}>
                      <td><strong>{t.tier}</strong></td>
                      <td>{t.minRank}</td>
                      <td>{t.maxWinners}</td>
                      <td>{t.prizes}</td>
                      <td>{kes(t.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {inner === "types" && (
            <ul className="cd-prize-types cd-prize-pane">
              {(meta?.types || []).map((t) => (
                <li key={t.key}>
                  <span className={`rule-ico ${t.key === "voucher" ? "orange" : t.key === "product" ? "blue" : t.key === "points" ? "purple" : "gold"}`}>
                    <Icon name={t.icon} size={14} />
                  </span>
                  <span>{t.label}</span>
                  <b>{fmtNum(t.count)}</b>
                </li>
              ))}
            </ul>
          )}

          {inner === "categories" && (
            <ul className="pts-sum cd-prize-pane">
              {(meta?.categories || []).map((c) => (
                <li key={c.name}><span>{c.name}</span><b>{fmtNum(c.count)}</b></li>
              ))}
            </ul>
          )}

          {inner === "rules" && (
            <ul className="cd-rules cd-prize-pane">
              {(meta?.rules || []).map((r) => (
                <li key={r.title}><strong>{r.title}.</strong> {r.detail}</li>
              ))}
            </ul>
          )}

          {inner === "history" && (
            <ul className="cprof-timeline cd-prize-pane">
              {(meta?.activity || []).map((a, i) => (
                <li key={`${a.title}-${i}`}>
                  <span className="cprof-dot done"><Icon name="gift" size={12} /></span>
                  <div>
                    <strong>{a.title}</strong>
                    <div className="muted">{a.detail}</div>
                  </div>
                  <span className="muted">{a.at}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {inner === "library" && (
          <aside className="pts-side">
            <section className="ord-drawer rule-drawer rwd-drawer">
              <h2>{form.id ? "Edit Prize" : "Add New Prize"}</h2>
              <form onSubmit={savePrize}>
                <label>
                  Prize Name
                  <input required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="KSh 10,000 Voucher" />
                </label>
                <label>
                  Prize Type
                  <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                    {TYPE_OPTS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select value={form.category} onChange={(e) => setField("category", e.target.value)}>
                    {CATS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Value (KSh)
                  <input type="number" min="0" required value={form.value} onChange={(e) => setField("value", e.target.value)} placeholder="10000" />
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="0"
                    disabled={form.unlimited}
                    value={form.unlimited ? "" : form.qty}
                    onChange={(e) => setField("qty", e.target.value)}
                    placeholder={form.unlimited ? "Unlimited" : "50"}
                  />
                </label>
                <label>
                  Description
                  <textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="What the winner receives" />
                </label>
                <label>
                  Status
                  <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="rwd-check">
                  <input type="checkbox" checked={form.allCompetitions} onChange={(e) => setField("allCompetitions", e.target.checked)} />
                  Available for all competitions
                </label>
                <label className="rwd-check">
                  <input type="checkbox" checked={form.trackStock} disabled={form.unlimited} onChange={(e) => setField("trackStock", e.target.checked)} />
                  Track prize stock
                </label>
                <div className="rule-drawer-acts prod-actions">
                  <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Save Prize"}</button>
                  <button className="btn btn-ghost btn-small" type="button" onClick={clearForm}>Clear</button>
                </div>
              </form>
            </section>
          </aside>
        )}
      </div>

      <div className="cd-prize-foot">
        <section className="card pts-widget">
          <div className="cprof-card-head">
            <h3>Prize Tiers Overview</h3>
            <button className="link-reset" type="button" onClick={() => setInner("tiers")}>Manage Prize Tiers</button>
          </div>
          <div className="prod-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Rank</th>
                  <th>Max</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {(meta?.tiers || []).map((t) => (
                  <tr key={t.tier}>
                    <td>{t.tier}</td>
                    <td>{t.minRank}</td>
                    <td>{t.maxWinners}</td>
                    <td>{kes(t.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card pts-widget">
          <div className="cprof-card-head">
            <h3>Reward Types</h3>
            <button className="link-reset" type="button" onClick={() => setInner("types")}>Manage Reward Types</button>
          </div>
          <ul className="cd-prize-types">
            {(meta?.types || []).map((t) => (
              <li key={t.key}>
                <span className={`rule-ico ${t.key === "voucher" ? "orange" : t.key === "product" ? "blue" : t.key === "points" ? "purple" : "gold"}`}>
                  <Icon name={t.icon} size={14} />
                </span>
                <span>{t.label}</span>
                <b>{fmtNum(t.count)}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pts-widget">
          <div className="cprof-card-head">
            <h3>Recent Prize Activity</h3>
            <button className="link-reset" type="button" onClick={() => setInner("history")}>View All Activity</button>
          </div>
          <ul className="cprof-timeline">
            {(meta?.activity || []).slice(0, 4).map((a, i) => (
              <li key={`${a.title}-${i}`}>
                <span className="cprof-dot done"><Icon name="check" size={12} /></span>
                <div>
                  <strong>{a.title}</strong>
                  <div className="muted">{a.detail}</div>
                </div>
                <span className="muted">{a.at}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pts-widget cd-prize-notes">
          <h3>Important Notes</h3>
          <ul className="cd-rules">
            {(meta?.notes || []).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      </div>

      {viewing && modal !== "delete" && (
        <div className="prod-modal" onClick={() => setViewing(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>{viewing.name}</h2>
              <button className="icon-btn" type="button" onClick={() => setViewing(null)}><Icon name="x" size={16} /></button>
            </div>
            <p className="muted">#{viewing.sku}</p>
            <dl className="ord-sum">
              <div><dt>Type</dt><dd>{typeMeta(viewing.type).label}</dd></div>
              <div><dt>Category</dt><dd>{viewing.category}</dd></div>
              <div><dt>Value</dt><dd>{kes(viewing.value)}</dd></div>
              <div><dt>Quantity</dt><dd>{qtyLabel(viewing)}</dd></div>
              <div><dt>Available</dt><dd>{availLabel(viewing)}</dd></div>
              <div><dt>Status</dt><dd>{viewing.status === "active" ? "Active" : "Inactive"}</dd></div>
            </dl>
            <p>{viewing.description}</p>
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { openRow(viewing); setViewing(null); }}>Edit</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && viewing && (
        <div className="prod-modal" onClick={() => { setModal(null); setViewing(null); }}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Delete Prize</h2>
              <button className="icon-btn" type="button" onClick={() => { setModal(null); setViewing(null); }}><Icon name="x" size={16} /></button>
            </div>
            <p>Remove {viewing.name} from the prize library? This does not change prizes already awarded.</p>
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { setModal(null); setViewing(null); }}>Cancel</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => { remove(viewing); setModal(null); setViewing(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
