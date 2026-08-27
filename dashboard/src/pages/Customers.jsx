import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, kes } from "../api";
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

function fmtPhone(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return phone || "—";
}

function fmtDateTime(value) {
  if (!value) return "—";
  return `${fmtDate(value)}, ${fmtTime(value)}`;
}

function initials(c) {
  return `${(c.firstName || "C")[0]}${(c.lastName || "U")[0]}`.toUpperCase();
}

function fullName(c) {
  return `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Customer";
}

function groupCls(level) {
  const l = String(level || "BRONZE").toUpperCase();
  if (l === "GOLD" || l === "PLATINUM") return "grp-gold";
  if (l === "SILVER") return "grp-silver";
  return "grp-bronze";
}

function groupLabel(level) {
  const l = String(level || "BRONZE").toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function payLabel(method) {
  const m = String(method || "").toUpperCase();
  if (m === "MPESA") return "M-Pesa";
  if (m === "POINTS") return "NETZA Points";
  if (m === "PESAPAL" || m === "CARD") return "Card (Pesapal)";
  return method || "—";
}

const STATS = [
  { key: "total", label: "Total Customers", hint: "All time", icon: "users", tone: "purple" },
  { key: "new30", label: "New Customers (30 Days)", hint: "newPct", icon: "trend", tone: "green" },
  { key: "active", label: "Active Customers", hint: "activePct", icon: "checkCircle", tone: "blue" },
  { key: "withOrders", label: "Customers with Orders", hint: "withOrdersPct", icon: "bag", tone: "orange" },
  { key: "loyal", label: "Loyal Customers", hint: "Lifetime value high", icon: "crown", tone: "gold" },
];

const CRUMB = {
  all: "All Customers",
  groups: "Customer Groups",
  segments: "Segments",
  blacklist: "Blacklist",
  activity: "Customer Activity",
  addresses: "Addresses",
};

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
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "all";
  const headerQ = params.get("q") || "";
  const importRef = useRef(null);

  const [data, setData] = useState({ customers: [], stats: {}, groups: {}, addresses: [], activity: [], total: 0 });
  const [q, setQ] = useState(headerQ);
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [segment, setSegment] = useState("loyal");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [open, setOpen] = useState(null);
  const [create, setCreate] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pointsModal, setPointsModal] = useState(false);
  const [pointsAmt, setPointsAmt] = useState("100");
  const [msgModal, setMsgModal] = useState(false);
  const [msgBody, setMsgBody] = useState("");
  const [orderModal, setOrderModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [orderProduct, setOrderProduct] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const query = next.q ?? q;
    const gr = next.group ?? group;
    const st = next.status ?? status;
    const df = next.from ?? from;
    const dt = next.to ?? to;
    const tb = next.tab ?? tab;
    const seg = next.segment ?? segment;
    if (query) p.set("q", query);
    if (gr) p.set("group", gr);
    if (st) p.set("status", st);
    if (df) p.set("from", df);
    if (dt) p.set("to", dt);
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
        setSelected([]);
        setError("");
        const list = d.customers || [];
        setOpen((cur) => {
          const pick = (cur && list.find((c) => c.id === cur.id)) || list[0] || null;
          if (pick) {
            api(`/admin/customers/${pick.id}`)
              .then((det) => setOpen(det.customer))
              .catch(() => setOpen(pick));
          }
          return pick;
        });
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

  const customers = data.customers || [];
  const stats = data.stats || {};
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const allChecked = customers.length > 0 && customers.every((c) => selected.includes(c.id));
  const crumb = CRUMB[tab] || "All Customers";

  const pageButtons = useMemo(() => {
    const maxBtns = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - maxBtns + 1));
    const list = [];
    for (let i = 0; i < maxBtns; i += 1) list.push(start + i);
    return list;
  }, [page, pages]);

  function hintFor(s) {
    if (s.key === "new30") {
      const n = stats.newPct || 0;
      return `${n >= 0 ? "↑ +" : "↓ "}${Math.abs(n)}%`;
    }
    if (s.key === "active") return `${stats.activePct || 0}% of total`;
    if (s.key === "withOrders") return `${stats.withOrdersPct || 0}% of total`;
    return s.hint;
  }

  function apply(e) {
    e?.preventDefault();
    setPage(1);
    load({ page: 1 });
  }

  function reset() {
    setQ("");
    setGroup("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
    load({ q: "", group: "", status: "", from: "", to: "", page: 1 });
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
      ["ID", "Name", "Email", "Phone", "Group", "Orders", "Spent", "Points", "Status", "Joined"],
      ...(d.customers || []).map((c) => [
        c.customerNumber,
        fullName(c),
        c.email || "",
        c.phone,
        c.membershipLevel,
        c.orderCount,
        c.spentKes,
        c.pointsBalance,
        c.blacklisted ? "Blacklisted" : c.isActive === false ? "Inactive" : "Active",
        c.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netza-customers.csv";
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

  async function addOrder(e) {
    e.preventDefault();
    if (!open || !orderProduct) return;
    setBusy(true);
    try {
      await api("/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          userId: open.id,
          items: [{ productId: orderProduct, quantity: 1 }],
          paymentMethod: "MPESA",
          paymentStatus: "PENDING",
          status: "PENDING_PAYMENT",
        }),
      });
      setOrderModal(false);
      setToast("Order created");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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

  async function select(c) {
    try {
      const d = await api(`/admin/customers/${c.id}`);
      setOpen(d.customer);
    } catch {
      setOpen(c);
    }
  }

  function openAddOrder() {
    setOrderModal(true);
    api("/admin/products?limit=50").then((d) => setProducts(d.products || [])).catch(() => {});
  }

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="cust">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/customers">Customers</Link>
        <span>›</span>
        <strong>{crumb}</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="users" size={18} /></span>
            Customers
          </h1>
          <p>Manage your customers and view their activity.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => importRef.current?.click()}>
            <Icon name="upload" size={14} /> Import
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
              setEditing(null);
              setForm(emptyForm);
              setCreate(true);
            }}
          >
            <Icon name="plus" size={14} /> Add Customer
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="cust-stats">
        {STATS.map((s) => (
          <article key={s.key} className="prod-stat cat-stat">
            <div>
              <div className="muted">{s.label}</div>
              <div className={`prod-stat-n ${s.tone}`}>{fmtNum(stats[s.key])}</div>
              <div className={`cat-stat-hint ${s.key === "new30" && (stats.newPct || 0) >= 0 ? "up" : ""}`}>{hintFor(s)}</div>
            </div>
            <div className={`prod-stat-icon ${s.tone}`}>
              <Icon name={s.icon} size={16} />
            </div>
          </article>
        ))}
      </section>

      <div className={`ord-layout ${open && tab !== "activity" && tab !== "addresses" ? "has-drawer" : ""}`}>
        <section className="card cat-table-card">
          {tab !== "activity" && tab !== "addresses" && (
            <form className="attr-filters" onSubmit={apply}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email, phone, ID..."
                />
              </div>
              <select value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); load({ group: e.target.value, page: 1 }); }}>
                <option value="">All Groups</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="BRONZE">Bronze</option>
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); load({ status: e.target.value, page: 1 }); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="ord-dates" title="Select Date Range">
                <Icon name="calendar" size={14} />
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
                <span className="muted">–</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
              </div>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          )}

          {tab === "groups" && (
            <div className="cust-group-bar">
              {["GOLD", "SILVER", "BRONZE"].map((g) => (
                <button key={g} type="button" className={group === g ? "on" : ""} onClick={() => { setGroup(g); load({ group: g, page: 1 }); }}>
                  {groupLabel(g)} · {fmtNum(data.groups?.[g] || 0)}
                </button>
              ))}
            </div>
          )}

          {tab === "segments" && (
            <div className="cust-group-bar">
              {[
                { id: "loyal", label: "Loyal (Gold)" },
                { id: "new", label: "New (30 days)" },
                { id: "inactive", label: "Inactive" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={segment === s.id ? "on" : ""}
                  onClick={() => { setSegment(s.id); load({ segment: s.id, page: 1 }); }}
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
              <table className="table cat-table cust-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => setSelected(e.target.checked ? customers.map((c) => c.id) : [])}
                      />
                    </th>
                    <th>Customer</th>
                    <th>Email / Phone</th>
                    <th>Group</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Points Balance</th>
                    <th>Status</th>
                    <th>Joined Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const active = c.isActive !== false && !c.blacklisted;
                    return (
                      <tr key={c.id} className={open?.id === c.id ? "is-open" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(c.id)}
                            onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((id) => id !== c.id)))}
                          />
                        </td>
                        <td>
                          <button className="cust-cell" type="button" onClick={() => select(c)}>
                            {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="cust-av">{initials(c)}</span>}
                            <span>
                              <strong>{fullName(c)}</strong>
                              <div className="muted">#{c.customerNumber || "CUST"}</div>
                            </span>
                          </button>
                        </td>
                        <td>
                          <div>{c.email || "—"}</div>
                          <div className="muted">{fmtPhone(c.phone)}</div>
                        </td>
                        <td><span className={`st-pill ${groupCls(c.membershipLevel)}`}>{groupLabel(c.membershipLevel)}</span></td>
                        <td>{fmtNum(c.orderCount)}</td>
                        <td>{kes(c.spentKes)}</td>
                        <td className="cust-pts"><Icon name="coin" size={14} /> {fmtNum(c.pointsBalance)}</td>
                        <td>
                          <span className={`st-pill ${active ? "ord-st-delivered" : "ord-st-cancelled"}`}>
                            {c.blacklisted ? "Blacklisted" : active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div>{fmtDate(c.createdAt)}</div>
                          <div className="muted">{fmtTime(c.createdAt)}</div>
                        </td>
                        <td>
                          <div className="prod-row-acts">
                            <button type="button" title="View" onClick={() => select(c)}><Icon name="eye" size={14} /></button>
                            <button type="button" title="Edit" onClick={() => startEdit(c)}><Icon name="pencil" size={14} /></button>
                            <button
                              type="button"
                              title="Delete"
                              className="danger"
                              onClick={() => {
                                if (confirm(`Deactivate ${fullName(c)}?`)) patch(c.id, { isActive: false });
                              }}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {customers.length === 0 && (
                    <tr><td colSpan="10" className="muted">No customers match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {tab !== "activity" && tab !== "addresses" && (
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
                {pages > 5 && <span className="muted">… {pages}</span>}
                <button type="button" disabled={page >= pages} onClick={() => { setPage(page + 1); load({ page: page + 1 }); }}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
              <select value={limit} onChange={(e) => { const n = Number(e.target.value); setLimit(n); setPage(1); load({ limit: n, page: 1 }); }}>
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </footer>
          )}
        </section>

        {open && tab !== "activity" && tab !== "addresses" && (
          <aside className="ord-drawer cust-drawer">
            <div className="cust-drawer-top">
              {open.avatarUrl ? <img src={open.avatarUrl} alt="" /> : <span className="cust-av lg">{initials(open)}</span>}
              <div>
                <h2>{fullName(open)}</h2>
                <div className="muted">#{open.customerNumber}</div>
                <div className="cust-badges">
                  <span className={`st-pill ${open.isActive !== false && !open.blacklisted ? "ord-st-delivered" : "ord-st-cancelled"}`}>
                    {open.blacklisted ? "Blacklisted" : open.isActive === false ? "Inactive" : "Active"}
                  </span>
                  <span className={`st-pill ${groupCls(open.membershipLevel)}`}>{groupLabel(open.membershipLevel)} Member</span>
                </div>
              </div>
              <button className="icon-btn" type="button" aria-label="Close" onClick={() => setOpen(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="ord-meta">
              <div><Icon name="mail" size={14} /> {open.email || "—"}</div>
              <div><Icon name="phone" size={14} /> {fmtPhone(open.phone)}</div>
              <div><Icon name="pin" size={14} /> {open.addresses?.[0] ? `${open.addresses[0].county || open.addresses[0].city || "Nairobi"}, Kenya` : "Kenya"}</div>
              <div><Icon name="calendar" size={14} /> Joined {fmtDate(open.createdAt)}</div>
            </div>
            <div className="cust-mini">
              <article><div className="muted">Total Orders</div><b>{fmtNum(open.orderCount)}</b></article>
              <article><div className="muted">Total Spent</div><b>{kes(open.spentKes)}</b></article>
              <article><div className="muted">Points Balance</div><b>{kes(open.pointsBalance)}</b></article>
              <article><div className="muted">Average Order</div><b>{kes(open.avgOrderKes)}</b></article>
            </div>
            <div className="cust-qacts">
              <Link className="btn btn-ghost btn-small" to={`/orders?q=${encodeURIComponent(open.email || open.phone || "")}`}>View Orders</Link>
              <button className="btn btn-ghost btn-small" type="button" onClick={openAddOrder}>Add Order</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setPointsModal(true)}>Add Points</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setMsgModal(true)}>Send Message</button>
            </div>
            <h3>Additional Information</h3>
            <dl className="ord-sum">
              <div><dt>Group</dt><dd>{groupLabel(open.membershipLevel)}</dd></div>
              <div><dt>Status</dt><dd>{open.blacklisted ? "Blacklisted" : open.isActive === false ? "Inactive" : "Active"}</dd></div>
              <div><dt>Gender</dt><dd>{open.gender || "—"}</dd></div>
              <div><dt>DOB</dt><dd>{fmtDate(open.dateOfBirth)}</dd></div>
              <div><dt>Last Login</dt><dd>{fmtDateTime(open.lastLoginAt)}</dd></div>
              <div><dt>Preferred Payment</dt><dd>{payLabel(open.preferredPayment)}</dd></div>
              <div><dt>Referral Code</dt><dd>{open.referralCode}</dd></div>
            </dl>
            <h3>Notes</h3>
            <textarea
              rows={3}
              value={open.adminNotes || ""}
              onChange={(e) => setOpen({ ...open, adminNotes: e.target.value })}
              onBlur={() => patch(open.id, { adminNotes: open.adminNotes || "" })}
            />
            <Link className="btn btn-purple" to={`/customers/${open.id}`}>View Full Profile</Link>
          </aside>
        )}
      </div>

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
                  <option value="BRONZE">Bronze</option>
                  <option value="SILVER">Silver</option>
                  <option value="GOLD">Gold</option>
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

      {orderModal && (
        <div className="prod-modal" onClick={() => setOrderModal(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={addOrder}>
            <h2>Add Order</h2>
            <label>Product</label>
            <select value={orderProduct} onChange={(e) => setOrderProduct(e.target.value)} required>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {kes(p.priceKes)}</option>
              ))}
            </select>
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setOrderModal(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Create Order"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
