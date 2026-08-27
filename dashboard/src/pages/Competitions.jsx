import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import { useAuth } from "../auth";

const TABS = [
  { id: "all", label: "All Competitions" },
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "mine", label: "My Competitions" },
];

const TYPES = [
  { id: "quiz", label: "Quiz" },
  { id: "referral", label: "Referral" },
  { id: "engagement", label: "Engagement" },
  { id: "purchase", label: "Purchase" },
  { id: "lucky_draw", label: "Lucky Draw" },
];

const CATEGORIES = ["Networking", "CCTV", "Access Control", "Cabling", "Wi-Fi", "Technology", "Promotions", "General"];

const EMPTY_FORM = {
  id: null,
  title: "",
  type: "quiz",
  category: "Networking",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

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

function toInputDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(value));
}

function typeMeta(type) {
  const id = String(type || "quiz");
  const label = TYPES.find((t) => t.id === id)?.label || "Quiz";
  if (id === "referral") return { label, cls: "comp-type-referral" };
  if (id === "engagement") return { label, cls: "comp-type-engagement" };
  if (id === "purchase") return { label, cls: "comp-type-purchase" };
  if (id === "lucky_draw") return { label, cls: "comp-type-draw" };
  return { label, cls: "comp-type-quiz" };
}

function statusMeta(status) {
  const id = String(status || "upcoming");
  if (id === "active") return { label: "Active", cls: "comp-st-live" };
  if (id === "upcoming") return { label: "Upcoming", cls: "comp-st-upcoming" };
  if (id === "cancelled") return { label: "Cancelled", cls: "ord-st-cancelled" };
  return { label: "Completed", cls: "comp-st-done" };
}

function pointsLabel(row) {
  if (row.pointsNote) return row.pointsNote;
  if (!row.pointsToWin) return "N/A";
  return fmtNum(row.pointsToWin);
}

function LineChart({ points }) {
  const w = 300;
  const h = 140;
  const padX = 18;
  const padY = 22;
  const values = points.map((p) => p.participants || 0);
  const max = Math.max(...values, 1);
  const coords = points.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(points.length - 1, 1);
    const y = h - padY - ((p.participants || 0) / max) * (h - padY * 2);
    return { x, y, ...p };
  });
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = first && last ? `${line} L${last.x},${h - padY} L${first.x},${h - padY} Z` : "";
  return (
    <svg className="comp-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Participants last 6 months">
      <path d={area} fill="rgba(109,40,217,0.16)" />
      <path d={line} fill="none" stroke="#6D28D9" strokeWidth="2.4" />
      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r="3.5" fill="#6D28D9" />
          <text x={c.x} y={c.y - 8} textAnchor="middle" className="comp-chart-val">{c.display}</text>
          <text x={c.x} y={h - 4} textAnchor="middle" className="comp-chart-lbl">{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Competitions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const importRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({ trend: [] });
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [catF, setCatF] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [form, setForm] = useState(EMPTY_FORM);
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const meName = `${user?.firstName || "Admin"} ${user?.lastName || "User"}`.trim();
  const crumb = TABS.find((t) => t.id === tab)?.label || "All Competitions";

  function load() {
    api("/admin/competitions")
      .then((d) => {
        setRows(d.competitions || []);
        setStats(d.stats || {});
        setAnalytics(d.analytics || { trend: [] });
      })
      .catch((err) => setError(err.message || "Could not load competitions."));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function closeMenu() { setMenu(null); }
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    if (params.get("new") === "1") {
      navigate("/competitions/new", { replace: true });
    }
  }, [params, navigate]);

  function openRow(row) {
    setForm({
      id: row.id,
      title: row.title || "",
      type: row.type || "quiz",
      category: row.category || "Networking",
      startsAt: toInputDate(row.startsAt),
      endsAt: toInputDate(row.endsAt),
      isActive: row.isActive !== false && row.status !== "cancelled",
    });
    setMenu(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        type: form.type,
        category: form.category,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        isActive: form.isActive,
      };
      if (form.id) {
        await api(`/admin/competitions/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setToast("Competition saved");
      } else {
        await api("/admin/competitions", { method: "POST", body: JSON.stringify(payload) });
        setToast("Competition created");
        resetForm();
      }
      load();
    } catch (err) {
      setError(err.message || "Could not save competition.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(row) {
    setMenu(null);
    try {
      await api("/admin/competitions", {
        method: "POST",
        body: JSON.stringify({
          title: `${row.title} (Copy)`,
          description: row.description || "",
          type: row.type,
          category: row.category,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          prize: row.prize,
          pointsToWin: row.pointsToWin || 0,
          pointsNote: row.pointsNote || "",
          imageUrl: row.imageUrl || "",
          isActive: true,
          status: "upcoming",
        }),
      });
      setToast("Competition duplicated");
      load();
    } catch (err) {
      setError(err.message || "Could not duplicate.");
    }
  }

  async function cancelComp(row) {
    setMenu(null);
    try {
      await api(`/admin/competitions/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled", isActive: false }),
      });
      setToast("Competition cancelled");
      if (form.id === row.id) openRow({ ...row, status: "cancelled", isActive: false });
      load();
    } catch (err) {
      setError(err.message || "Could not cancel.");
    }
  }

  async function remove(row) {
    setMenu(null);
    if (!window.confirm(`Delete ${row.title}?`)) return;
    try {
      await api(`/admin/competitions/${row.id}`, { method: "DELETE" });
      setToast("Competition deleted");
      if (form.id === row.id) resetForm();
      load();
    } catch (err) {
      setError(err.message || "Could not delete.");
    }
  }

  function exportCsv() {
    const header = ["Code", "Title", "Type", "Status", "Category", "Participants", "Start", "End", "Prize", "Points to Win", "Created By"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        r.code,
        `"${(r.title || "").replaceAll('"', '""')}"`,
        typeMeta(r.type).label,
        statusMeta(r.status).label,
        r.category,
        r.participantCount || 0,
        fmtDate(r.startsAt),
        fmtDate(r.endsAt),
        `"${(r.prize || "").replaceAll('"', '""')}"`,
        pointsLabel(r),
        r.createdBy || "",
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netza-competitions.csv";
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
        const headers = (lines[0] || "").split(",").map((h) => h.trim().toLowerCase().replaceAll('"', ""));
        items = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim().replaceAll('"', ""));
          const row = {};
          headers.forEach((h, i) => { row[h] = cols[i]; });
          const typeRaw = String(row.type || "quiz").toLowerCase().replace(/\s+/g, "_");
          return {
            title: row.title || row.name || row.competition,
            type: typeRaw,
            category: row.category || "General",
            status: String(row.status || "").toLowerCase(),
            startsAt: row.start || row.startsAt || row["start date"],
            endsAt: row.end || row.endsAt || row["end date"],
            prize: row.prize,
            pointsToWin: Number(row.points || row["points to win"] || 0),
            description: row.description || "",
          };
        });
      }
      const d = await api("/admin/competitions/import", { method: "POST", body: JSON.stringify({ items }) });
      setToast(`Imported ${d.created} competitions`);
      load();
    } catch (err) {
      setError(err.message || "Could not import that file.");
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === "mine") {
        const mine = (r.createdBy || "").toLowerCase() === meName.toLowerCase() || (r.createdBy || "") === "Admin User";
        if (!mine) return false;
      } else if (tab !== "all" && r.status !== tab) return false;
      const hay = `${r.title} ${r.description || ""} ${r.code || ""}`.toLowerCase();
      if (q && !hay.includes(q.trim().toLowerCase())) return false;
      if (statusF && r.status !== statusF) return false;
      if (typeF && r.type !== typeF) return false;
      if (catF && r.category !== catF) return false;
      if (from && r.startsAt && new Date(r.startsAt) < new Date(from)) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (r.endsAt && new Date(r.endsAt) > end) return false;
      }
      return true;
    });
  }, [rows, tab, q, statusF, typeF, catF, from, to, meName]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const paged = filtered.slice((safePage - 1) * limit, safePage * limit);
  const fromN = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const toN = Math.min(safePage * limit, total);
  const pageButtons = [];
  {
    const maxBtns = Math.min(pages, 3);
    let start = Math.max(1, Math.min(safePage - 1, pages - maxBtns + 1));
    for (let i = 0; i < maxBtns; i += 1) pageButtons.push(start + i);
  }

  function resetFilters() {
    setQ("");
    setStatusF("");
    setTypeF("");
    setCatF("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="comp-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/competitions">Competitions</Link>
        <span>›</span>
        <strong>{crumb}</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="trophy" size={18} /></span>
            Competitions Management
          </h1>
          <p>Create, manage and monitor competitions to engage customers and reward winners.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/competitions/analytics")}>
            <Icon name="chart" size={14} /> Analytics
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Report
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => importRef.current?.click()}>
            <Icon name="upload" size={14} /> Import Competitions
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => navigate("/competitions/new")}>
            <Icon name="plus" size={14} /> New Competition
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

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Competitions</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="trophy" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Competitions</div>
            <div className="prod-stat-n green">{fmtNum(stats.active)}</div>
            <div className="cat-stat-hint">Live now</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="play" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Upcoming</div>
            <div className="prod-stat-n orange">{fmtNum(stats.upcoming)}</div>
            <div className="cat-stat-hint">Starting soon</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Completed</div>
            <div className="prod-stat-n blue">{fmtNum(stats.completed)}</div>
            <div className="cat-stat-hint">Ended</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Participants</div>
            <div className="prod-stat-n orange">{fmtNum(stats.participants)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.participantsPct || 0).toFixed(1)}% vs last 30 days</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Points Awarded</div>
            <div className="prod-stat-n red">{fmtNum(stats.pointsAwarded)}</div>
            <div className="cat-stat-hint up">↑ {Number(stats.pointsPct || 0).toFixed(1)}% vs last 30 days</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="gift" size={16} /></div>
        </article>
      </section>

      <div className="pts-layout has-side comp-layout">
        <section className="card cat-table-card">
          <div className="pf-tabs exp-subtabs">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); setPage(1); }}>
                {t.label}
              </button>
            ))}
          </div>
          <form
            className="attr-filters"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
            }}
          >
            <div className="prod-search">
              <Icon name="search" size={16} />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search by title, description or ID..."
              />
            </div>
            <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <select value={catF} onChange={(e) => { setCatF(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="ord-dates" title="Select Date Range">
              <Icon name="calendar" size={14} />
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} title="From date" />
              <span className="muted">–</span>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} title="To date" />
            </div>
            <button className="btn btn-ghost btn-small" type="submit">
              <Icon name="filter" size={14} /> Filter
            </button>
            <button className="link-reset" type="button" onClick={resetFilters}>Reset</button>
          </form>
          <div className="comp-table-scroll">
            <table className="table comp-table">
              <thead>
                <tr>
                  <th>Competition</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Participants</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Prize</th>
                  <th>Points to Win</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const type = typeMeta(r.type);
                  const st = statusMeta(r.status);
                  return (
                    <tr key={r.id} className={form.id === r.id ? "is-open" : ""}>
                      <td>
                        <button className="comp-cell" type="button" onClick={() => openRow(r)}>
                          {r.imageUrl
                            ? <img src={r.imageUrl} alt="" />
                            : (
                              <span className="comp-thumb-ph">
                                <Icon name="trophy" size={14} />
                              </span>
                            )}
                          <span>
                            <strong>{r.title}</strong>
                            <em>#{r.code}</em>
                          </span>
                        </button>
                      </td>
                      <td><span className={`st-pill ${type.cls}`}>{type.label}</span></td>
                      <td><span className={`st-pill ${st.cls}`}>{st.label}</span></td>
                      <td className="comp-joined">{fmtNum(r.participantCount)} Joined</td>
                      <td className="comp-date">{fmtDate(r.startsAt)}</td>
                      <td className="comp-date">{fmtDate(r.endsAt)}</td>
                      <td><span className="comp-prize">{r.prize || "—"}</span></td>
                      <td className="comp-pts">{pointsLabel(r)}</td>
                      <td className="comp-by">{r.createdBy || "—"}</td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => navigate(`/competitions/${r.id}`)}>
                            <Icon name="eye" size={14} />
                          </button>
                          <button type="button" title="Edit" onClick={() => navigate(`/competitions/${r.id}/edit`)}>
                            <Icon name="pencil" size={14} />
                          </button>
                          <span className="ord-menu-wrap">
                            <button type="button" title="More" onClick={(e) => { e.stopPropagation(); setMenu(menu === r.id ? null : r.id); }}>
                              <Icon name="more" size={14} />
                            </button>
                            {menu === r.id && (
                              <div className="ord-menu" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => navigate(`/competitions/${r.id}`)}>View competition</button>
                                <button type="button" onClick={() => navigate(`/competitions/${r.id}/edit`)}>Edit competition</button>
                                <button type="button" onClick={() => duplicate(r)}>Duplicate</button>
                                {r.status !== "cancelled" && (
                                  <button type="button" onClick={() => cancelComp(r)}>Cancel competition</button>
                                )}
                                <button type="button" onClick={() => remove(r)}>Delete</button>
                              </div>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr><td colSpan="10" className="muted">No competitions match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} competitions</span>
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
                {[8, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </footer>
        </section>

        <aside className="pts-side rwd-side">
          <section className="ord-drawer rule-drawer rwd-drawer">
            <div className="ord-drawer-head">
              <h2>Create / Edit Competition</h2>
            </div>
            <form onSubmit={save}>
              <label>
                Title
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Flash Tech Quiz"
                />
              </label>
              <label>
                Competition Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="rwd-dates">
                <label>
                  Start Date
                  <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </label>
                <label>
                  End Date
                  <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </label>
              </div>
              <div className="rule-status-row">
                <span>Active</span>
                <button
                  className={`pts-switch ${form.isActive ? "on" : ""}`}
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                >
                  <i />
                </button>
              </div>
              <div className="prod-actions rule-drawer-acts">
                <button className="btn btn-ghost btn-small" type="button" onClick={resetForm}>Cancel</button>
                <button className="btn btn-purple btn-small" disabled={busy} type="submit">
                  {busy ? "Saving…" : "Save Competition"}
                </button>
              </div>
            </form>
          </section>

          <section className="card pts-widget">
            <h3>Competition Analytics (Last 6 Months)</h3>
            <ul className="pts-sum">
              <li><span>Total Competitions</span><b>{fmtNum(analytics.total)}</b></li>
              <li><span>Total Participants</span><b>{fmtNum(analytics.participants)}</b></li>
              <li><span>Total Winners</span><b>{fmtNum(analytics.winners)}</b></li>
              <li><span>Points Awarded</span><b>{fmtNum(analytics.pointsAwarded)}</b></li>
              <li><span>Average Participants/Comp</span><b>{fmtNum(analytics.avgParticipants)}</b></li>
            </ul>
            <LineChart points={analytics.trend || []} />
          </section>
        </aside>
      </div>

      <section className="rule-how">
        <h3>How Competitions Work</h3>
        <div className="rule-how-grid comp-how">
          <article>
            <div className="rule-how-ico purple"><Icon name="plus" size={14} /></div>
            <div>
              <strong>Create</strong>
              <p>Create a competition and set rules, prizes & duration.</p>
            </div>
          </article>
          <article>
            <div className="rule-how-ico blue"><Icon name="megaphone" size={14} /></div>
            <div>
              <strong>Promote</strong>
              <p>Promote the competition across app & channels.</p>
            </div>
          </article>
          <article>
            <div className="rule-how-ico green"><Icon name="users" size={14} /></div>
            <div>
              <strong>Participate</strong>
              <p>Customers join and complete actions.</p>
            </div>
          </article>
          <article>
            <div className="rule-how-ico orange"><Icon name="trophy" size={14} /></div>
            <div>
              <strong>Select Winners</strong>
              <p>System ranks entries and selects winners.</p>
            </div>
          </article>
          <article>
            <div className="rule-how-ico purple"><Icon name="gift" size={14} /></div>
            <div>
              <strong>Reward</strong>
              <p>Winners receive prizes and points automatically.</p>
            </div>
          </article>
          <article>
            <div className="rule-how-ico teal"><Icon name="chart" size={14} /></div>
            <div>
              <strong>Report</strong>
              <p><Link to="/competitions/analytics">View performance and competition analytics.</Link></p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
