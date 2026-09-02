import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";
import FlashDropCategories from "./FlashDropCategories";
import FlashDropAnalytics from "./FlashDropAnalytics";
import FlashDropParticipants from "./FlashDropParticipants";
import FlashDropHistory from "./FlashDropHistory";
import FlashDropSettings from "./FlashDropSettings";
import FlashDropLogs from "./FlashDropLogs";
import FlashDropReports from "./FlashDropReports";
import FlashDropSystemSettings from "./FlashDropSystemSettings";

const LIST_TABS = [
  { id: "all", label: "All Drops" },
  { id: "live", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const TYPES = [
  { id: "percentage", label: "Percentage" },
  { id: "fixed", label: "Fixed Price" },
  { id: "voucher", label: "Voucher Drop" },
];

const CATEGORIES = ["Networking", "CCTV", "Vouchers", "Gadgets", "Access Control", "Cabling", "Power"];

const EMPTY = {
  id: null,
  name: "",
  category: "Networking",
  type: "percentage",
  discount: 40,
  stock: 20,
  startsAt: "",
  endsAt: "",
  description: "",
  status: "upcoming",
};

const QUICK = [
  { id: "create", icon: "plus", label: "Create Flash Drop", tone: "purple" },
  { id: "schedule", icon: "calendar", label: "Schedule Drop", tone: "orange" },
  { id: "import", icon: "upload", label: "Import Products", tone: "blue" },
  { id: "analytics", icon: "chart", label: "Drop Analytics", tone: "green" },
  { id: "history", icon: "clock", label: "Drop History", tone: "purple" },
  { id: "export", icon: "download", label: "Export Report", tone: "blue" },
  { id: "categories", icon: "tag", label: "Manage Categories", tone: "orange" },
  { id: "settings", icon: "gear", label: "Drop Settings", tone: "green" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function fmtLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(d);
  return `${date}, ${time.replace("am", "AM").replace("pm", "PM")}`;
}

function catClass(name) {
  const id = String(name || "").toLowerCase();
  if (id.includes("cctv")) return "fd-cat-cctv";
  if (id.includes("voucher")) return "fd-cat-vouchers";
  if (id.includes("gadget")) return "fd-cat-gadgets";
  if (id.includes("access")) return "fd-cat-access";
  if (id.includes("cabl")) return "fd-cat-cabling";
  if (id.includes("power")) return "fd-cat-power";
  return "fd-cat-networking";
}

function typeMeta(type) {
  if (type === "fixed") return { label: "Fixed Price", cls: "comp-type-purchase" };
  if (type === "voucher") return { label: "Voucher Drop", cls: "comp-type-referral" };
  return { label: "Percentage", cls: "comp-type-quiz" };
}

function statusMeta(status) {
  if (status === "live") return { label: "Live", cls: "st-pub" };
  if (status === "upcoming") return { label: "Upcoming", cls: "st-draft" };
  if (status === "cancelled") return { label: "Cancelled", cls: "ord-st-cancelled" };
  return { label: "Completed", cls: "fd-st-done" };
}

function endsIn(iso, now) {
  if (!iso) return "";
  const diff = Math.max(0, new Date(iso).getTime() - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function Sparkline({ data, color }) {
  const values = data?.length ? data : [20, 28, 22, 36, 30, 42, 38, 48];
  const w = 76;
  const h = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w;
    const y = h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="fd-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

function crumbLabel(urlTab, isNew, action, listTab) {
  if (isNew) return "Create Flash Drop";
  if (action === "schedule") return "Schedule Drop";
  if (urlTab === "categories") return "Drop Categories";
  if (urlTab === "analytics") return "Drop Analytics";
  if (urlTab === "participants") return "Participants";
  if (urlTab === "history") return "Drop History";
  if (urlTab === "settings") return "Drop Settings";
  if (urlTab === "logs") return "Flash Drop Logs";
  if (urlTab === "reports") return "Reports & Export";
  if (urlTab === "system") return "System Settings";
  return LIST_TABS.find((t) => t.id === listTab)?.label === "All Drops"
    ? "All Flash Drops"
    : LIST_TABS.find((t) => t.id === listTab)?.label || "All Flash Drops";
}

export default function FlashDrops() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const importRef = useRef(null);
  const urlTab = params.get("tab") || "all";
  const isNew = params.get("new") === "1";
  const action = params.get("action") || "";

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [overview, setOverview] = useState([]);
  const [activeDrops, setActiveDrops] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [listTab, setListTab] = useState("all");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [catF, setCatF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [bannerOn, setBannerOn] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [modal, setModal] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [schedule, setSchedule] = useState({ name: "", category: "Networking", startsAt: "", endsAt: "", discount: 25 });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (params.get("new") === "1") navigate("/flash-drops/new", { replace: true });
    if (params.get("action") === "schedule") navigate("/flash-drops/new?schedule=1", { replace: true });
  }, [params, navigate]);

  function setQuery(next) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === "" || v === false) p.delete(k);
      else p.set(k, String(v));
    });
    setParams(p, { replace: true });
  }

  function load() {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (q.trim()) qs.set("q", q.trim());
    const status = listTab === "all" ? statusF : listTab;
    if (status) qs.set("status", status);
    if (catF) qs.set("category", catF);
    if (typeF) qs.set("type", typeF);
    api(`/admin/flash-drops?${qs}`)
      .then((d) => {
        setRows(d.drops || d.flashDrops || []);
        setTotal(d.total || 0);
        setStats(d.stats || {});
        setOverview(d.overview || []);
        setActiveDrops(d.activeDrops || []);
        setAnalytics(d.analytics || []);
        setCategories(d.categories || []);
      })
      .catch((err) => setError(err.message || "Could not load flash drops."));
  }

  useEffect(() => {
    if (urlTab === "categories" || urlTab === "analytics" || urlTab === "participants" || urlTab === "history" || urlTab === "settings" || urlTab === "logs" || urlTab === "reports" || urlTab === "system") return;
    load();
  }, [page, limit, q, listTab, statusF, catF, typeF, urlTab]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const fromN = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const toN = Math.min(safePage * limit, total);
  const pageButtons = useMemo(() => {
    const maxBtns = Math.min(pages, 3);
    let start = Math.max(1, Math.min(safePage - 1, pages - maxBtns + 1));
    return Array.from({ length: maxBtns }, (_, i) => start + i);
  }, [pages, safePage]);

  const crumb = crumbLabel(urlTab, isNew, action, listTab);
  const listView = urlTab === "all" && !["categories", "analytics", "participants", "history", "settings", "logs", "reports", "system"].includes(urlTab);

  function openCreate() {
    navigate("/flash-drops/new");
  }

  function openEdit(row) {
    setMenu(null);
    navigate(`/flash-drops/${row.id}/edit`);
  }

  function closeForm() {
    setForm(EMPTY);
    setShowForm(false);
    setQuery({ new: "", action: action === "schedule" ? action : "" });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        category: form.category,
        type: form.type,
        discount: Number(form.discount || 0),
        stock: Number(form.stock || 0),
        description: form.description,
        status: form.status,
        startLabel: form.startsAt ? fmtLabel(form.startsAt) : form.startLabel || "",
        endLabel: form.endsAt ? fmtLabel(form.endsAt) : form.endLabel || "",
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      };
      if (form.id) {
        await api(`/admin/flash-drops/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setToast("Flash drop saved");
      } else {
        await api("/admin/flash-drops", { method: "POST", body: JSON.stringify(payload) });
        setToast("Flash drop created");
      }
      closeForm();
      load();
    } catch (err) {
      setError(err.message || "Could not save flash drop.");
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(row, status) {
    setMenu(null);
    setModal(null);
    setViewing(null);
    try {
      await api(`/admin/flash-drops/${row.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setToast(status === "cancelled" ? "Drop cancelled" : status === "completed" ? "Drop ended" : "Drop updated");
      load();
    } catch (err) {
      setError(err.message || "Could not update drop.");
    }
  }

  async function duplicate(row) {
    setMenu(null);
    try {
      await api(`/admin/flash-drops/${row.id}/duplicate`, { method: "POST", body: JSON.stringify({}) });
      setToast("Drop duplicated");
      load();
    } catch (err) {
      setError(err.message || "Could not duplicate.");
    }
  }

  async function remove(row) {
    setMenu(null);
    setModal(null);
    try {
      await api(`/admin/flash-drops/${row.id}`, { method: "DELETE" });
      setToast("Drop deleted");
      if (form.id === row.id) closeForm();
      setViewing(null);
      load();
    } catch (err) {
      setError(err.message || "Could not delete.");
    }
  }

  function exportCsv() {
    const header = ["SKU", "Drop", "Category", "Discount", "Type", "Status", "Start", "End", "Stock", "Sold", "Revenue"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.sku,
        `"${(r.name || "").replaceAll('"', '""')}"`,
        r.category,
        r.discountLabel,
        r.typeLabel,
        r.status,
        `"${r.startLabel || ""}"`,
        `"${r.endLabel || ""}"`,
        r.stock,
        r.sold,
        r.revenue,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-flash-drops.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Report exported");
  }

  async function importFile(file) {
    if (!file) return;
    setToast(`Imported ${file.name}. Add products to a drop from Create Flash Drop.`);
  }

  async function saveSchedule(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/flash-drops", {
        method: "POST",
        body: JSON.stringify({
          name: schedule.name,
          category: schedule.category,
          type: "percentage",
          discount: Number(schedule.discount || 0),
          status: "upcoming",
          startLabel: fmtLabel(schedule.startsAt),
          endLabel: fmtLabel(schedule.endsAt),
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          stock: 20,
        }),
      });
      setToast("Drop scheduled");
      setModal(null);
      setQuery({ action: "" });
      setSchedule({ name: "", category: "Networking", startsAt: "", endsAt: "", discount: 25 });
      load();
    } catch (err) {
      setError(err.message || "Could not schedule drop.");
    } finally {
      setBusy(false);
    }
  }

  function runQuick(id) {
    if (id === "create") navigate("/flash-drops/new");
    else if (id === "schedule") navigate("/flash-drops/new?schedule=1");
    else if (id === "import") importRef.current?.click();
    else if (id === "analytics") setQuery({ tab: "analytics", new: "", action: "" });
    else if (id === "history") setQuery({ tab: "history", new: "", action: "" });
    else if (id === "export") exportCsv();
    else if (id === "categories") setQuery({ tab: "categories", new: "", action: "" });
    else if (id === "settings") setQuery({ tab: "settings", new: "", action: "" });
  }

  function resetFilters() {
    setQ("");
    setStatusF("");
    setCatF("");
    setTypeF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
  }

  const sparkColor = { purple: "#6D28D9", green: "#16a34a", orange: "#ea580c", blue: "#2563eb" };

  if (urlTab === "categories") return <FlashDropCategories />;
  if (urlTab === "analytics") return <FlashDropAnalytics />;
  if (urlTab === "participants") return <FlashDropParticipants />;
  if (urlTab === "history") return <FlashDropHistory />;
  if (urlTab === "settings") return <FlashDropSettings />;
  if (urlTab === "logs") return <FlashDropLogs />;
  if (urlTab === "reports") return <FlashDropReports />;
  if (urlTab === "system") return <FlashDropSystemSettings />;

  return (
    <div className="fd-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>{crumb}</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drops Management
            <span className="prod-title-icon"><Icon name="bolt" size={16} /></span>
          </h1>
          <p>Create, manage and track all limited time flash drop sales.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={openCreate}>
            <Icon name="plus" size={14} /> Create Flash Drop
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Flash Drops</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="bolt" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Drops</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint">Live now</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="play" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Upcoming Drops</div>
            <div className="prod-stat-n orange">{fmtNum(stats.upcoming)}</div>
            <div className="cat-stat-hint">Scheduled</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Completed Drops</div>
            <div className="prod-stat-n blue">{fmtNum(stats.completed)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Items Sold</div>
            <div className="prod-stat-n purple">{fmtNum(stats.sold)}</div>
            <div className="cat-stat-hint">Across all drops</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="cart" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Revenue</div>
            <div className="prod-stat-n green">{kes(stats.revenue)}</div>
            <div className="cat-stat-hint">Across all drops</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="bag" size={16} /></div>
        </article>
      </section>

      <div className="pts-layout has-side comp-layout">
        <section className="card cat-table-card">
          {listView && (
            <>
              <div className="pf-tabs exp-subtabs">
                {LIST_TABS.map((t) => (
                  <button key={t.id} type="button" className={listTab === t.id ? "on" : ""} onClick={() => { setListTab(t.id); setPage(1); }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <form
                className="attr-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  load();
                }}
              >
                <div className="prod-search">
                  <Icon name="search" size={16} />
                  <input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Search flash drops..."
                  />
                </div>
                <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                  <option value="">All Status</option>
                  <option value="live">Live</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select value={catF} onChange={(e) => { setCatF(e.target.value); setPage(1); }}>
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                  <option value="">All Types</option>
                  {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
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
                <button className="link-reset" type="button" onClick={resetFilters}>Reset</button>
              </form>
              <div className="prod-table-wrap">
                <table className="table prod-table pts-table fd-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Drop / Product</th>
                      <th>Category</th>
                      <th>Discount</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Start Date & Time</th>
                      <th>End Date & Time</th>
                      <th>Stock</th>
                      <th>Sold</th>
                      <th>Revenue</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const type = typeMeta(r.type);
                      const st = statusMeta(r.status);
                      return (
                        <tr key={r.id} className={form.id === r.id ? "is-open" : ""}>
                          <td className="muted">{r.n}</td>
                          <td>
                            <button className="rule-name rwd-name" type="button" onClick={() => setViewing(r)}>
                              {r.image
                                ? <img src={r.image} alt="" className="rwd-thumb" />
                                : <span className="rule-ico purple"><Icon name="bolt" size={14} /></span>}
                              <span>
                                <strong>{r.name}</strong>
                                <div className="muted">{r.sku}</div>
                              </span>
                            </button>
                          </td>
                          <td><span className={`fd-cat ${catClass(r.category)}`}>{r.category}</span></td>
                          <td className="fd-discount">{r.discountLabel}</td>
                          <td><span className={`st-pill ${type.cls}`}>{type.label}</span></td>
                          <td><span className={`st-pill ${st.cls}`}>{st.label}</span></td>
                          <td>{r.startLabel || "—"}</td>
                          <td>
                            <div className="fd-end-cell">
                              <span>{r.endLabel || "—"}</span>
                              {r.status === "live" && r.endsAt && (
                                <span className="fd-ends">Ends in {endsIn(r.endsAt, now)}</span>
                              )}
                            </div>
                          </td>
                          <td>{fmtNum(r.stock)}</td>
                          <td>
                            <div className="fd-sold">
                              <b>{fmtNum(r.sold)}</b>
                              <span className="fd-sold-bar"><i style={{ width: `${Math.min(100, r.soldPct || 0)}%` }} /></span>
                            </div>
                          </td>
                          <td>{kes(r.revenue)}</td>
                          <td>
                            <div className="prod-row-acts">
                              <button type="button" title="View" onClick={() => setViewing(r)}><Icon name="eye" size={14} /></button>
                              <span className="ord-menu-wrap">
                                <button type="button" title="More" onClick={() => setMenu(menu === r.id ? null : r.id)}>
                                  <Icon name="more" size={14} />
                                </button>
                                {menu === r.id && (
                                  <div className="ord-menu">
                                    <button type="button" onClick={() => { setViewing(r); setMenu(null); }}>View</button>
                                    <button type="button" onClick={() => openEdit(r)}>Edit</button>
                                    <button type="button" onClick={() => duplicate(r)}>Duplicate</button>
                                    {r.status === "live" && (
                                      <button type="button" onClick={() => { setViewing(r); setModal("end"); }}>End drop</button>
                                    )}
                                    {r.status !== "cancelled" && r.status !== "completed" && (
                                      <button type="button" onClick={() => { setViewing(r); setModal("cancel"); }}>Cancel</button>
                                    )}
                                    <button type="button" onClick={() => { setViewing(r); setModal("delete"); }}>Delete</button>
                                  </div>
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr><td colSpan="12" className="muted">No flash drops match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="prod-pager">
                <span>Showing {fromN} to {toN} of {fmtNum(total)} drops</span>
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
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </footer>
            </>
          )}

        </section>

        <aside className="pts-side rwd-side">
          <section className="card pts-widget">
            <h3>Flash Drop Overview (This Month)</h3>
            <ul className="pts-sum">
              {overview.map((row) => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <b>{row.money ? kes(row.value) : typeof row.value === "number" ? fmtNum(row.value) : row.value}</b>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pts-widget">
            <h3>Active Drops</h3>
            <div className="fd-live-list">
              {activeDrops.map((d) => (
                <button key={d.id} type="button" className="fd-live-card" onClick={() => setViewing(d)}>
                  <img src={d.image} alt="" />
                  <div>
                    <strong>{d.name}</strong>
                    <div className="fd-live-prog">
                      <span>{d.soldPct}%</span>
                      <span className="muted">{fmtNum(d.sold)}/{fmtNum((d.sold || 0) + (d.stock || 0))}</span>
                    </div>
                    <span className="fd-sold-bar"><i style={{ width: `${Math.min(100, d.soldPct || 0)}%` }} /></span>
                    <div className="fd-live-meta">
                      <em className="fd-ends">Ends in {endsIn(d.endsAt, now)}</em>
                      <b>{kes(d.revenue)}</b>
                    </div>
                  </div>
                </button>
              ))}
              {activeDrops.length === 0 && <p className="muted">No live drops right now.</p>}
            </div>
          </section>

          <section className="card pts-widget">
            <h3>Flash Drop Analytics (This Month)</h3>
            <div className="fd-an">
              {analytics.map((a) => (
                <article key={a.key}>
                  <div>
                    <div className="muted">{a.label}</div>
                    <b>{a.money ? kes(a.value) : typeof a.value === "number" ? fmtNum(a.value) : a.value}</b>
                    <div className={`cat-stat-hint ${a.up ? "up" : "down"}`}>{a.hint}</div>
                  </div>
                  <Sparkline data={a.spark} color={sparkColor[a.tone] || sparkColor.purple} />
                </article>
              ))}
            </div>
          </section>

          <section className="card pts-widget">
            <h3>Quick Actions</h3>
            <div className="fd-qa-grid">
              {QUICK.map((qItem) => (
                <button key={qItem.id} type="button" onClick={() => runQuick(qItem.id)}>
                  <span className={`rule-ico ${qItem.tone}`}><Icon name={qItem.icon} size={14} /></span>
                  {qItem.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {bannerOn && (
        <section className="pts-alert fd-banner">
          <Icon name="bolt" size={16} />
          <p>
            Flash Drops are time-bound sales events with limited stock. Once the timer ends or stock is finished, the drop automatically closes and normal prices apply.{" "}
            <button className="link-reset" type="button" onClick={() => setModal("learn")}>Learn more.</button>
          </p>
          <button className="icon-btn fd-banner-x" type="button" aria-label="Dismiss" onClick={() => setBannerOn(false)}>×</button>
        </section>
      )}

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

      {viewing && !modal && (
        <div className="prod-modal" onClick={() => setViewing(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>{viewing.name}</h2>
              <button className="icon-btn" type="button" onClick={() => setViewing(null)}>×</button>
            </div>
            <div className="fd-view">
              {viewing.image && <img src={viewing.image} alt="" />}
              <dl>
                <div><dt>SKU</dt><dd>{viewing.sku}</dd></div>
                <div><dt>Category</dt><dd>{viewing.category}</dd></div>
                <div><dt>Discount</dt><dd>{viewing.discountLabel}</dd></div>
                <div><dt>Type</dt><dd>{viewing.typeLabel}</dd></div>
                <div><dt>Status</dt><dd>{statusMeta(viewing.status).label}</dd></div>
                <div><dt>Start</dt><dd>{viewing.startLabel}</dd></div>
                <div><dt>End</dt><dd>{viewing.endLabel}</dd></div>
                <div><dt>Stock</dt><dd>{fmtNum(viewing.stock)}</dd></div>
                <div><dt>Sold</dt><dd>{fmtNum(viewing.sold)}</dd></div>
                <div><dt>Revenue</dt><dd>{kes(viewing.revenue)}</dd></div>
              </dl>
              {viewing.description && <p className="muted">{viewing.description}</p>}
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(null)}>Close</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {modal === "schedule" && (
        <div className="prod-modal" onClick={() => { setModal(null); setQuery({ action: "" }); }}>
          <div className="card prod-modal-card rule-drawer" onClick={(e) => e.stopPropagation()}>
            <h2>Schedule Drop</h2>
            <form onSubmit={saveSchedule}>
              <label>
                Drop name
                <input required value={schedule.name} onChange={(e) => setSchedule({ ...schedule, name: e.target.value })} />
              </label>
              <label>
                Category
                <select value={schedule.category} onChange={(e) => setSchedule({ ...schedule, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>
                Discount %
                <input type="number" value={schedule.discount} onChange={(e) => setSchedule({ ...schedule, discount: e.target.value })} />
              </label>
              <label>
                Start
                <input required type="datetime-local" value={schedule.startsAt} onChange={(e) => setSchedule({ ...schedule, startsAt: e.target.value })} />
              </label>
              <label>
                End
                <input required type="datetime-local" value={schedule.endsAt} onChange={(e) => setSchedule({ ...schedule, endsAt: e.target.value })} />
              </label>
              <div className="prod-actions rule-drawer-acts">
                <button className="btn btn-ghost btn-small" type="button" onClick={() => { setModal(null); setQuery({ action: "" }); }}>Cancel</button>
                <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Schedule Drop"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "learn" && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>How Flash Drops work</h2>
            <p>A flash drop is a timed sale with a limited quantity. Shoppers see the flash price until the timer ends or stock runs out. After that, the product returns to its normal catalogue price.</p>
            <button className="btn btn-purple btn-small" type="button" onClick={() => setModal(null)}>Got it</button>
          </div>
        </div>
      )}

      {(modal === "delete" || modal === "cancel" || modal === "end") && viewing && (
        <div className="prod-modal" onClick={() => { setModal(null); setViewing(null); }}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>
              {modal === "delete" && "Delete flash drop"}
              {modal === "cancel" && "Cancel flash drop"}
              {modal === "end" && "End flash drop"}
            </h2>
            <p>
              {modal === "delete" && `Delete ${viewing.name}? This cannot be undone.`}
              {modal === "cancel" && `Cancel ${viewing.name}? It will move to the Cancelled tab.`}
              {modal === "end" && `End ${viewing.name} now? The live price will close.`}
            </p>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { setModal(null); setViewing(null); }}>Back</button>
              {modal === "delete" && <button className="btn btn-purple btn-small" type="button" onClick={() => remove(viewing)}>Delete</button>}
              {modal === "cancel" && <button className="btn btn-purple btn-small" type="button" onClick={() => patchStatus(viewing, "cancelled")}>Cancel drop</button>}
              {modal === "end" && <button className="btn btn-purple btn-small" type="button" onClick={() => patchStatus(viewing, "completed")}>End drop</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
