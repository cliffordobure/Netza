import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fmtDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function fmtTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function initials(c) {
  return `${(c.firstName || "C")[0]}${(c.lastName || "U")[0]}`.toUpperCase();
}

function fullName(c) {
  return `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Customer";
}

function groupCls(keyOrLevel) {
  const k = String(keyOrLevel || "REGULAR").toUpperCase();
  if (k === "VIP" || k === "GOLD" || k === "PLATINUM") return "grp-vip";
  if (k === "WHOLESALE" || k === "SILVER") return "grp-wholesale";
  if (k === "REGULAR" || k === "BRONZE") return "grp-regular";
  return "grp-regular";
}

function groupLabel(c) {
  if (c?.groupLabel) return c.groupLabel;
  const l = String(c?.membershipLevel || c || "BRONZE").toUpperCase();
  if (l === "GOLD" || l === "PLATINUM" || l === "VIP") return "VIP";
  if (l === "SILVER" || l === "WHOLESALE") return "Wholesale";
  return "Regular";
}

function deltaHint(n, suffix = "vs last month") {
  const v = Number(n) || 0;
  const arrow = v >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(v).toFixed(1)}% ${suffix}`;
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap prod-donut cust-donut">
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
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">Total</text>
      </svg>
      <ul className="donut-legend prod-donut-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{Number(p.pct || 0).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  membershipLevel: "BRONZE",
  gender: "",
  preferredPayment: "MPESA",
  adminNotes: "",
  street: "",
  city: "Nairobi",
};

export default function Customers() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "all";
  const headerQ = params.get("q") || "";
  const importRef = useRef(null);

  const [data, setData] = useState({
    customers: [],
    stats: {},
    groups: {},
    groupDonut: [],
    topCustomers: [],
    insights: [],
    zones: [],
    addresses: [],
    activity: [],
    total: 0,
  });
  const [q, setQ] = useState(headerQ);
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [zone, setZone] = useState("");
  const [custType, setCustType] = useState("");
  const [segment, setSegment] = useState("loyal");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [open, setOpen] = useState(null);
  const [create, setCreate] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pointsModal, setPointsModal] = useState(false);
  const [pointsAmt, setPointsAmt] = useState("100");
  const [msgModal, setMsgModal] = useState(false);
  const [msgBody, setMsgBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [moreId, setMoreId] = useState(null);

  const showCatalog = tab !== "activity" && tab !== "addresses";

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const query = next.q ?? q;
    const gr = next.group ?? group;
    const st = next.status ?? status;
    const zn = next.zone ?? zone;
    const ty = next.type ?? custType;
    const tb = next.tab ?? tab;
    const seg = next.segment ?? segment;
    if (query) p.set("q", query);
    if (gr) p.set("group", gr);
    if (st) p.set("status", st);
    if (zn) p.set("zone", zn);
    if (ty) p.set("type", ty);
    if (tb && tb !== "all") p.set("tab", tb);
    if (tb === "segments") p.set("segment", seg);
    p.set("page", String(next.page ?? page));
    p.set("limit", String(next.limit ?? limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/customers?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
        setOpen(null);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (headerQ) setQ(headerQ);
    setPage(1);
    load({ q: headerQ || q, tab, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, headerQ]);

  useEffect(() => {
    if (params.get("new") === "1") {
      setForm(emptyForm);
      setEditing(null);
      setCreate(true);
    }
  }, [params]);

  useEffect(() => {
    function closeMenus() {
      setAddOpen(false);
      setMoreId(null);
    }
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  const customers = data.customers || [];
  const stats = data.stats || {};
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const zones = data.zones || [];

  const pageButtons = useMemo(() => {
    const maxBtns = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - maxBtns + 1));
    const list = [];
    for (let i = 0; i < maxBtns; i += 1) list.push(start + i);
    return list;
  }, [page, pages]);

  function apply(e) {
    e?.preventDefault();
    setPage(1);
    load({ page: 1 });
  }

  function reset() {
    setQ("");
    setGroup("");
    setStatus("");
    setZone("");
    setCustType("");
    setPage(1);
    load({ q: "", group: "", status: "", zone: "", type: "", page: 1 });
  }

  async function saveCustomer(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await api(`/admin/customers/${editing}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await api("/admin/customers", { method: "POST", body: JSON.stringify(form) });
      }
      setCreate(false);
      setEditing(null);
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(id, body) {
    await api(`/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    load();
  }

  async function exportCsv() {
    const d = await api(`/admin/customers?${queryString({ page: 1, limit: 200 })}`);
    const rows = [
      ["ID", "Name", "Email", "Phone", "Group", "Zone", "Orders", "Spent", "Status"],
      ...(d.customers || []).map((c) => [
        c.customerNumber,
        fullName(c),
        c.email || "",
        c.phone,
        groupLabel(c),
        c.zone || "",
        c.orderCount,
        c.spentKes,
        c.blacklisted ? "Blacklisted" : c.isActive === false ? "Inactive" : "Active",
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      let items = [];
      if (text.trim().startsWith("[")) items = JSON.parse(text);
      else {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = (lines[0] || "").split(",").map((h) => h.trim().toLowerCase());
        items = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim().replaceAll('"', ""));
          const row = {};
          headers.forEach((h, i) => {
            row[h] = cols[i];
          });
          return {
            firstName: row.firstname || row.first,
            lastName: row.lastname || row.last,
            name: row.name,
            email: row.email,
            phone: row.phone,
            group: row.group,
          };
        });
      }
      const d = await api("/admin/customers/import", { method: "POST", body: JSON.stringify({ items }) });
      setToast(`Imported ${d.created} customers`);
      load();
    } catch (err) {
      setError(err.message || "Could not import that file.");
    }
  }

  async function addPoints(e) {
    e.preventDefault();
    if (!open) return;
    await api(`/admin/customers/${open.id}/points`, {
      method: "POST",
      body: JSON.stringify({ points: Number(pointsAmt), note: "Admin bonus" }),
    });
    setPointsModal(false);
    setToast("Points added");
    load();
  }

  async function sendMsg(e) {
    e.preventDefault();
    if (!open) return;
    await api(`/admin/customers/${open.id}/message`, { method: "POST", body: JSON.stringify({ body: msgBody }) });
    setMsgModal(false);
    setMsgBody("");
    setToast("Message queued");
  }

  function startEdit(c) {
    setEditing(c.id);
    setForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      membershipLevel: c.membershipLevel || "BRONZE",
      gender: c.gender || "",
      preferredPayment: c.preferredPayment || "MPESA",
      adminNotes: c.adminNotes || "",
      street: "",
      city: "Nairobi",
    });
    setCreate(true);
  }

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="cust cust-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <strong>Customers</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="users" size={16} /></span>
            Customers
          </h1>
          <p>Manage customer information, groups and purchase history.</p>
        </div>
        <div className="prod-actions">
          <button
            className="btn btn-ghost btn-small"
            type="button"
            onClick={() => setToast("Customer settings coming soon")}
          >
            <Icon name="gear" size={14} /> Customer Settings
          </button>
          <div className="dlvzon-dd-wrap">
            <button
              className="btn btn-purple btn-small dlvzon-create-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddOpen((v) => !v);
              }}
            >
              <Icon name="plus" size={14} /> Add Customer
              <Icon name="chevron" size={14} />
            </button>
            {addOpen && (
              <div className="dlvzon-dd" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setEditing(null);
                    setForm(emptyForm);
                    setCreate(true);
                  }}
                >
                  Single Customer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    importRef.current?.click();
                  }}
                >
                  Bulk Import
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    exportCsv();
                  }}
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>
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

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      {showCatalog && (
        <section className="pts-stats six cust-kpis">
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Total Customers</div>
              <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
              <div className={`cat-stat-hint ${(stats.totalPct || 0) >= 0 ? "up" : "down"}`}>
                {deltaHint(stats.totalPct)}
              </div>
            </div>
            <div className="prod-stat-icon purple"><Icon name="users" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Active Customers</div>
              <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
              <div className="cat-stat-hint up">↑ {Number(stats.activePct || 0).toFixed(1)}% of total</div>
            </div>
            <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">New Customers</div>
              <div className="prod-stat-n blue">{fmtNum(stats.new30)}</div>
              <div className={`cat-stat-hint ${(stats.newPct || 0) >= 0 ? "up" : "down"}`}>
                {deltaHint(stats.newPct)}
              </div>
            </div>
            <div className="prod-stat-icon blue"><Icon name="usersPlus" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">VIP Customers</div>
              <div className="prod-stat-n orange">{fmtNum(stats.vip)}</div>
              <div className="cat-stat-hint up">↑ {Number(stats.vipPct || 0).toFixed(1)}% of total</div>
            </div>
            <div className="prod-stat-icon orange"><Icon name="crown" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Repeat Customers</div>
              <div className="prod-stat-n red">{fmtNum(stats.repeat)}</div>
              <div className="cat-stat-hint up">↑ {Number(stats.repeatPct || 0).toFixed(1)}% of total</div>
            </div>
            <div className="prod-stat-icon red"><Icon name="bag" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Total Spent (KES)</div>
              <div className="prod-stat-n indigo">{fmtNum(stats.spentKes)}</div>
              <div className={`cat-stat-hint ${(stats.spentPct || 0) >= 0 ? "up" : "down"}`}>
                {deltaHint(stats.spentPct)}
              </div>
            </div>
            <div className="prod-stat-icon indigo"><Icon name="coin" size={16} /></div>
          </article>
        </section>
      )}

      <div className={showCatalog ? "cust-layout" : ""}>
        <div className={showCatalog ? "cust-main" : ""}>
          <section className="card cat-table-card">
            {showCatalog && (
              <form className="attr-filters cust-filters" onSubmit={apply}>
                <div className="prod-search">
                  <Icon name="search" size={16} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search customers..."
                  />
                </div>
                <select
                  value={group}
                  onChange={(e) => {
                    setGroup(e.target.value);
                    setPage(1);
                    load({ group: e.target.value, page: 1 });
                  }}
                >
                  <option value="">All Customer Groups</option>
                  <option value="REGULAR">Regular</option>
                  <option value="VIP">VIP</option>
                  <option value="WHOLESALE">Wholesale</option>
                </select>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                    load({ status: e.target.value, page: 1 });
                  }}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={zone}
                  onChange={(e) => {
                    setZone(e.target.value);
                    setPage(1);
                    load({ zone: e.target.value, page: 1 });
                  }}
                >
                  <option value="">All Zones</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
                <select
                  value={custType}
                  onChange={(e) => {
                    setCustType(e.target.value);
                    setPage(1);
                    load({ type: e.target.value, page: 1 });
                  }}
                >
                  <option value="">All Customer Types</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="corporate">Corporate</option>
                </select>
                <button className="btn btn-ghost btn-small" type="submit">
                  <Icon name="filter" size={14} /> Filter
                </button>
                <button className="link-reset" type="button" onClick={reset}>Reset</button>
              </form>
            )}

            {tab === "groups" && (
              <div className="cust-group-bar">
                {[
                  { id: "REGULAR", label: "Regular" },
                  { id: "VIP", label: "VIP" },
                  { id: "WHOLESALE", label: "Wholesale" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={group === g.id ? "on" : ""}
                    onClick={() => {
                      setGroup(g.id);
                      setPage(1);
                      load({ group: g.id, page: 1 });
                    }}
                  >
                    {g.label} · {fmtNum(data.groups?.[g.id] || 0)}
                  </button>
                ))}
              </div>
            )}

            {tab === "segments" && (
              <div className="cust-group-bar">
                {[
                  { id: "loyal", label: "Loyal (VIP)" },
                  { id: "new", label: "New (30 days)" },
                  { id: "inactive", label: "Inactive" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={segment === s.id ? "on" : ""}
                    onClick={() => {
                      setSegment(s.id);
                      setPage(1);
                      load({ segment: s.id, page: 1 });
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="cat-table-wrap">
              {tab === "activity" ? (
                <table className="table cat-table">
                  <thead>
                    <tr><th>Activity</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {(data.activity || []).map((a) => (
                      <tr key={a.id}>
                        <td>{a.text}</td>
                        <td>{fmtDate(a.at)} <span className="muted">{fmtTime(a.at)}</span></td>
                      </tr>
                    ))}
                    {(data.activity || []).length === 0 && (
                      <tr><td colSpan="2" className="muted">No recent customer activity.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : tab === "addresses" ? (
                <table className="table cat-table">
                  <thead>
                    <tr><th>Customer</th><th>Label</th><th>Address</th><th>Phone</th></tr>
                  </thead>
                  <tbody>
                    {(data.addresses || []).map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.customer}</strong><div className="muted">#{a.customerNumber}</div></td>
                        <td>{a.label}</td>
                        <td>{a.street}<div className="muted">{a.city}{a.county ? `, ${a.county}` : ""}</div></td>
                        <td>{a.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="table cat-table cust-table cust-table-v2">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Group</th>
                      <th>Zone</th>
                      <th>Total Orders</th>
                      <th>Total Spent (KES)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => {
                      const active = c.isActive !== false && !c.blacklisted;
                      const rowN = fromN + i;
                      return (
                        <tr key={c.id}>
                          <td className="muted">{rowN}</td>
                          <td>
                            <button className="cust-cell" type="button" onClick={() => navigate(`/customers/${c.id}`)}>
                              {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="cust-av">{initials(c)}</span>}
                              <span>
                                <strong>{fullName(c)}</strong>
                                <div className="muted">{c.customerNumber || "CUS-0000"}</div>
                              </span>
                            </button>
                          </td>
                          <td>
                            <div className="cust-contact">
                              <strong>{c.phone || "—"}</strong>
                              <span className="muted">{c.email || "—"}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`st-pill ${groupCls(c.groupKey || c.membershipLevel)}`}>
                              {groupLabel(c)}
                            </span>
                          </td>
                          <td>{c.zone || "Nairobi CBD"}</td>
                          <td><b>{fmtNum(c.orderCount)}</b></td>
                          <td>{fmtNum(c.spentKes)}</td>
                          <td>
                            <span className={`st-pill ${active ? "cust-st-active" : "cust-st-inactive"}`}>
                              {c.blacklisted ? "Blacklisted" : active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className="prod-row-acts">
                              <button type="button" title="View" onClick={() => navigate(`/customers/${c.id}`)}>
                                <Icon name="eye" size={14} />
                              </button>
                              <button type="button" title="Edit" onClick={() => startEdit(c)}>
                                <Icon name="pencil" size={14} />
                              </button>
                              <div className="cust-more-wrap">
                                <button
                                  type="button"
                                  title="More"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMoreId(moreId === c.id ? null : c.id);
                                  }}
                                >
                                  <Icon name="more" size={14} />
                                </button>
                                {moreId === c.id && (
                                  <div className="cust-more-dd" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => { setMoreId(null); setOpen(c); setMsgModal(true); }}>Send Message</button>
                                    <button type="button" onClick={() => { setMoreId(null); setOpen(c); setPointsModal(true); }}>Add Points</button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => {
                                        setMoreId(null);
                                        if (confirm(`Deactivate ${fullName(c)}?`)) patch(c.id, { isActive: false });
                                      }}
                                    >
                                      Deactivate
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {customers.length === 0 && (
                      <tr><td colSpan="9" className="muted">No customers match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {showCatalog && (
              <footer className="prod-pager">
                <span>Showing {fromN} to {toN} of {fmtNum(total)} customers</span>
                <div className="pager-btns">
                  <button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); load({ page: page - 1 }); }}>
                    <Icon name="chevronLeft" size={14} />
                  </button>
                  {pageButtons.map((n) => (
                    <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => { setPage(n); load({ page: n }); }}>
                      {n}
                    </button>
                  ))}
                  {pages > 5 && (
                    <>
                      <span className="muted">…</span>
                      <button type="button" onClick={() => { setPage(pages); load({ page: pages }); }}>{pages}</button>
                    </>
                  )}
                  <button type="button" disabled={page >= pages} onClick={() => { setPage(page + 1); load({ page: page + 1 }); }}>
                    <Icon name="chevronRight" size={14} />
                  </button>
                </div>
                <label className="prod-rows">
                  Rows per page
                  <select
                    value={limit}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setLimit(n);
                      setPage(1);
                      load({ limit: n, page: 1 });
                    }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </footer>
            )}
          </section>
        </div>

        {showCatalog && (
          <aside className="cust-side">
            <section className="card pf-card">
              <h2><Icon name="chart" size={14} /> Customers by Group</h2>
              <Donut parts={data.groupDonut} total={stats.total} />
            </section>
            <section className="card pf-card">
              <h2><Icon name="crown" size={14} /> Top Customers by Spend</h2>
              <ul className="cust-top-list">
                {(data.topCustomers || []).map((c) => (
                  <li key={c.id || c.rank}>
                    <span className="prod-top-rank">{c.rank}</span>
                    {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <div className="cust-av">{(c.name || "C")[0]}</div>}
                    <div>
                      <strong>{c.name}</strong>
                      <span className="muted">KES {fmtNum(c.spentKes)}</span>
                    </div>
                  </li>
                ))}
                {(data.topCustomers || []).length === 0 && (
                  <li className="muted">No spend data yet.</li>
                )}
              </ul>
            </section>
            <section className="card pf-card">
              <h2><Icon name="bolt" size={14} /> Customer Insights</h2>
              <ul className="cust-insights">
                {(data.insights || []).map((ins, i) => (
                  <li key={i} className={`tone-${ins.tone}`}>
                    <span className="cust-ins-ico"><Icon name={ins.icon} size={14} /></span>
                    <span>{ins.text}</span>
                  </li>
                ))}
              </ul>
              <button
                className="btn btn-ghost btn-small cust-analytics-btn"
                type="button"
                onClick={() => setToast("Customer analytics coming soon")}
              >
                <Icon name="chart" size={14} /> View Customer Analytics
              </button>
            </section>
          </aside>
        )}
      </div>

      {showCatalog && (
        <footer className="card pf-card prod-foot-banner cust-foot">
          <p>
            <Icon name="info" size={14} />
            <strong>Tip:</strong> Use customer groups to personalize offers and improve customer retention.
          </p>
        </footer>
      )}

      {create && (
        <div className="prod-modal" onClick={() => setCreate(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveCustomer}>
            <h2>{editing ? "Edit Customer" : "Add Customer"}</h2>
            <div className="pf-2">
              <div>
                <label>First name</label>
                <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div>
                <label>Last name</label>
                <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
            </div>
            <label>Email</label>
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@email.com" />
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required placeholder="07…" />
            <div className="pf-2">
              <div>
                <label>Group</label>
                <select value={form.membershipLevel} onChange={(e) => setForm((f) => ({ ...f, membershipLevel: e.target.value }))}>
                  <option value="BRONZE">Regular</option>
                  <option value="SILVER">Wholesale</option>
                  <option value="GOLD">VIP</option>
                </select>
              </div>
              <div>
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <label>Street</label>
            <input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Ngong Road" />
            <label>Notes</label>
            <textarea rows={2} value={form.adminNotes} onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))} />
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setCreate(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Save Customer"}</button>
            </div>
          </form>
        </div>
      )}

      {pointsModal && (
        <div className="prod-modal" onClick={() => setPointsModal(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={addPoints}>
            <h2>Add Points</h2>
            <label>Points</label>
            <input type="number" value={pointsAmt} onChange={(e) => setPointsAmt(e.target.value)} />
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setPointsModal(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Add Points</button>
            </div>
          </form>
        </div>
      )}

      {msgModal && (
        <div className="prod-modal" onClick={() => setMsgModal(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={sendMsg}>
            <h2>Send Message</h2>
            <label>Message</label>
            <textarea rows={4} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} required placeholder="Write a note to this customer…" />
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setMsgModal(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Send</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
