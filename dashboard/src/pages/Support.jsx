import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DeliveryRowMenu, DetailMeta } from "../DeliveryRowMenu";

const TABS = [
  { id: "all", label: "All Tickets" },
  { id: "open", label: "Open" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "knowledge", label: "Knowledge Base" },
];

function fmtNum(n, digits = 0) {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n || 0);
}

function statusCls(status) {
  if (status === "open") return "sup-st-open";
  if (status === "pending") return "sup-st-pending";
  if (status === "resolved") return "sup-st-resolved";
  return "sup-st-closed";
}

function priorityCls(priority) {
  if (priority === "urgent") return "sup-pr-urgent";
  if (priority === "high") return "sup-pr-high";
  if (priority === "low") return "sup-pr-low";
  return "sup-pr-med";
}

export default function Support() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [priorityF, setPriorityF] = useState("");
  const [channelF, setChannelF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", customer: "", channel: "email", priority: "medium" });

  function qs(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      priority: next.priority ?? priorityF,
      channel: next.channel ?? channelF,
      tab: next.tab ?? tab,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.priority) p.set("priority", vals.priority);
    if (vals.channel) p.set("channel", vals.channel);
    if (vals.tab) p.set("tab", vals.tab);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/support?${qs(overrides)}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load support tickets."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, priorityF, channelF, tab]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setFormOpen(true);
  }, [searchParams]);

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

  function open(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(r);
  }

  function saveTicket(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.customer.trim()) return setToast("Subject and customer are required");
    setFormOpen(false);
    setToast(`Ticket created for “${form.customer}”`);
    setForm({ subject: "", customer: "", channel: "email", priority: "medium" });
  }

  if (!data) {
    return (
      <div className="sup-page">
        <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><strong>Support</strong></nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading support…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.tickets || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  return (
    <div className="sup-page">
      <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><strong>Support</strong></nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="help" size={16} /></span>
            Support
          </h1>
          <p>Manage customer tickets, live chat escalations and help articles.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => { setTab("knowledge"); setPage(1); }}>
            <Icon name="layers" size={14} /> Knowledge Base
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={() => setFormOpen(true)}>
            <Icon name="plus" size={14} /> New Ticket
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six sup-kpis">
        <article className="prod-stat cat-stat"><div><div className="muted">Open</div><div className="prod-stat-n purple">{fmtNum(stats.open)}</div></div><div className="prod-stat-icon purple"><Icon name="mail" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Pending</div><div className="prod-stat-n orange">{fmtNum(stats.pending)}</div></div><div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Resolved</div><div className="prod-stat-n green">{fmtNum(stats.resolved)}</div></div><div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Closed</div><div className="prod-stat-n blue">{fmtNum(stats.closed)}</div></div><div className="prod-stat-icon blue"><Icon name="xCircle" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Avg. Response</div><div className="prod-stat-n indigo">{stats.avgResponse}</div></div><div className="prod-stat-icon indigo"><Icon name="trend" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">CSAT</div><div className="prod-stat-n pink">{fmtNum(stats.csat, 1)}%</div></div><div className="prod-stat-icon pink"><Icon name="star" size={16} /></div></article>
      </section>

      <div className="mktov-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); setPage(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "knowledge" ? (
        <section className="card prod-table-wrap sup-table-card">
          <div className="sup-table-head"><h2>Popular Help Articles</h2></div>
          <table className="table prod-table">
            <thead>
              <tr><th>#</th><th>Article</th><th>Category</th><th>Views</th><th>Helpful %</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {(data.articles || []).map((a, i) => (
                <tr key={a.title}>
                  <td className="muted">{i + 1}</td>
                  <td><strong>{a.title}</strong></td>
                  <td>{a.category}</td>
                  <td>{fmtNum(a.views)}</td>
                  <td>{a.helpful}%</td>
                  <td>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast(`Opened “${a.title}”`)}>
                      <Icon name="eye" size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <>
          <section className="card prod-filters">
            <form className="prod-filter-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load({ q, page: 1 }); }}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets, customers..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {(data.filters?.statuses || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={priorityF} onChange={(e) => { setPriorityF(e.target.value); setPage(1); }}>
                <option value="">All Priority</option>
                {(data.filters?.priorities || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={channelF} onChange={(e) => { setChannelF(e.target.value); setPage(1); }}>
                <option value="">All Channels</option>
                {(data.filters?.channels || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn btn-ghost btn-small" type="submit"><Icon name="filter" size={14} /> Filter</button>
              <button className="link-reset" type="button" onClick={() => { setQ(""); setStatusF(""); setPriorityF(""); setChannelF(""); setPage(1); load({ q: "", status: "", priority: "", channel: "", page: 1 }); }}>Reset</button>
            </form>
          </section>

          <section className="card prod-table-wrap sup-table-card">
            <table className="table prod-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Channel</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">{r.n}</td>
                    <td>
                      <button className="link-reset sup-id" type="button" onClick={(e) => open(r, e)}>
                        <strong>{r.id}</strong>
                        <div className="muted sup-sub">{r.subject}</div>
                      </button>
                    </td>
                    <td>
                      <strong>{r.customer}</strong>
                      <div className="muted sup-sub">{r.email}</div>
                    </td>
                    <td className="caps">{r.channel}</td>
                    <td><span className={`st-pill ${priorityCls(r.priority)}`}>{r.priority}</span></td>
                    <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                    <td>{r.assignee}</td>
                    <td>{r.updated}</td>
                    <td>
                      <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                        <button type="button" title="View" onClick={(e) => open(r, e)}><Icon name="eye" size={14} /></button>
                        <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                          <button type="button" onClick={(e) => open(r, e)}>View ticket</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`Assigned ${r.id} to you`); }}>Assign to me</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`${r.id} marked resolved`); }}>Mark resolved</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(null); setToast(`${r.id} closed`); }}>Close ticket</button>
                        </DeliveryRowMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan="9" className="muted">No tickets match these filters.</td></tr>}
              </tbody>
            </table>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} tickets</span>
              <div className="pager-btns">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon name="chevronLeft" size={14} /></button>
                <button type="button" className="on">{page}</button>
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><Icon name="chevronRight" size={14} /></button>
              </div>
            </footer>
          </section>
        </>
      )}

      {formOpen && (
        <div className="prod-modal" onClick={() => setFormOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveTicket}>
            <div className="ord-drawer-head">
              <div><h2>New Support Ticket</h2><p className="muted">Log a customer issue manually.</p></div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <label className="full">Subject<input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required /></label>
              <label>Customer<input value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} required /></label>
              <label>Channel
                <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                  {(data.filters?.channels || []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label>Priority
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {(data.filters?.priorities || []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit">Create ticket</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <DeliveryDetailModal
          title={viewing.id}
          subtitle={viewing.subject}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={(
            <>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { setToast(`Assigned ${viewing.id} to you`); setViewing(null); }}>Assign to me</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => { setToast(`${viewing.id} marked resolved`); setViewing(null); }}>Resolve</button>
            </>
          )}
        >
          <DetailMeta
            rows={[
              { label: "Customer", value: (<><strong>{viewing.customer}</strong><span className="muted">{viewing.email}</span></>) },
              { label: "Channel", value: viewing.channel },
              { label: "Priority", value: <span className={`st-pill ${priorityCls(viewing.priority)}`}>{viewing.priority}</span> },
              { label: "Assignee", value: viewing.assignee },
              { label: "Created", value: viewing.created },
              { label: "Updated", value: viewing.updated },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
