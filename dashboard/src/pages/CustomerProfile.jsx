import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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

function orderPill(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return { label: "Delivered", cls: "ord-st-delivered" };
  if (s === "SHIPPED" || s === "IN_TRANSIT") return { label: "Shipped", cls: "ord-st-shipped" };
  if (s === "CANCELLED") return { label: "Cancelled", cls: "ord-st-cancelled" };
  return { label: "Processing", cls: "ord-st-pending" };
}

function memberProgress(level) {
  const l = String(level || "BRONZE").toUpperCase();
  if (l === "PLATINUM") return { pct: 100, next: "Platinum" };
  if (l === "GOLD") return { pct: 70, next: "Platinum" };
  if (l === "SILVER") return { pct: 50, next: "Gold" };
  return { pct: 30, next: "Silver" };
}

function tagCls(tag) {
  const t = String(tag || "").toLowerCase();
  if (t.includes("vip")) return "cprof-tag purple";
  if (t.includes("network")) return "cprof-tag blue";
  return "cprof-tag teal";
}

function activityTone(item) {
  if (item.tone === "done") return "done";
  if (item.tone === "points") return "points";
  if (item.tone === "message") return "message";
  if (item.tone === "join") return "join";
  if (item.tone === "cancel") return "cancel";
  return "process";
}

function activityIcon(item) {
  if (item.type === "order") return "bag";
  if (item.type === "points") return "star";
  if (item.type === "message") return "mail";
  return "users";
}

const VIEWS = [
  { id: "profile", label: "Profile" },
  { id: "orders", label: "Orders" },
  { id: "points", label: "Points & Rewards" },
  { id: "activity", label: "Activity" },
  { id: "referrals", label: "Referrals" },
];

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || "profile";
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [segOpen, setSegOpen] = useState(false);
  const [msgBody, setMsgBody] = useState("");
  const [pointsAmt, setPointsAmt] = useState("100");
  const [segment, setSegment] = useState("loyal");
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  function load() {
    api(`/admin/customers/${id}`)
      .then((d) => {
        setC(d.customer);
        setError("");
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const loc = useMemo(() => {
    if (!c) return "Kenya";
    const a = (c.addresses || [])[0];
    if (!a) return "Kenya";
    return `${a.county || a.city || "Nairobi"}, Kenya`;
  }, [c]);

  const progress = memberProgress(c?.membershipLevel);
  const pointsPct = Math.min(100, Math.round(((c?.pointsBalance || 0) / 6000) * 100));
  const active = c && c.isActive !== false && !c.blacklisted;

  function setView(next) {
    const p = new URLSearchParams(params);
    if (next === "profile") p.delete("view");
    else p.set("view", next);
    setParams(p, { replace: true });
  }

  async function saveNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    await api(`/admin/customers/${c.id}`, { method: "PATCH", body: JSON.stringify({ note: note.trim() }) });
    setNote("");
    setToast("Note saved");
    load();
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/admin/customers/${c.id}`, { method: "PATCH", body: JSON.stringify(form) });
      setEdit(false);
      setToast("Customer updated");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendMsg(e) {
    e.preventDefault();
    await api(`/admin/customers/${c.id}/message`, { method: "POST", body: JSON.stringify({ body: msgBody }) });
    setMsgOpen(false);
    setMsgBody("");
    setToast("Message queued");
    load();
  }

  async function addPoints(e) {
    e.preventDefault();
    await api(`/admin/customers/${c.id}/points`, {
      method: "POST",
      body: JSON.stringify({ points: Number(pointsAmt), note: "Admin bonus" }),
    });
    setPointsOpen(false);
    setToast("Points added");
    load();
  }

  async function saveSegment(e) {
    e.preventDefault();
    await api(`/admin/customers/${c.id}`, { method: "PATCH", body: JSON.stringify({ segment }) });
    setSegOpen(false);
    setToast("Added to segment");
    load();
  }

  async function disableAccount() {
    if (!confirm(`Disable ${fullName(c)}?`)) return;
    await api(`/admin/customers/${c.id}`, { method: "PATCH", body: JSON.stringify({ isActive: false }) });
    setToast("Account disabled");
    load();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.customerNumber || "customer"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareCode() {
    const code = c.referralCode || "";
    try {
      await navigator.clipboard.writeText(code);
      setToast("Referral code copied");
    } catch {
      setToast(code);
    }
  }

  function startEdit() {
    setForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      membershipLevel: c.membershipLevel || "BRONZE",
      gender: c.gender || "",
      adminNotes: c.adminNotes || "",
    });
    setEdit(true);
  }

  if (error && !c) return <p className="error">{error}</p>;
  if (!c) return <p className="muted">Loading profile…</p>;

  const orders = c.orders || [];
  const activity = (c.activity || []).slice(0, view === "activity" ? 40 : 6);
  const notes = c.notesLog || [];

  return (
    <div className="cprof">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/customers">Customers</Link>
        <span>›</span>
        <strong>Customer Profile</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon round"><Icon name="bag" size={16} /></span>
            Customer Profile
          </h1>
          <p>View customer details, order history and activity.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-purple btn-small" type="button" onClick={startEdit}>
            <Icon name="pencil" size={14} /> Edit Customer
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setMsgOpen(true)}>
            <Icon name="mail" size={14} /> Send Message
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/customers")}>
            <Icon name="chevronLeft" size={14} /> Back
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="card cprof-hero">
        <div className="cprof-hero-left">
          <div className="cprof-avatar-wrap">
            {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="cust-av xl">{initials(c)}</span>}
            <em className={`st-pill ${active ? "ord-st-delivered" : "ord-st-cancelled"}`}>{active ? "Active" : "Inactive"}</em>
          </div>
          <div>
            <h2>{fullName(c)}</h2>
            <div className="muted">#{c.customerNumber}</div>
            <div className="cprof-contact">
              <span><Icon name="mail" size={14} /> {c.email || "—"}</span>
              <span><Icon name="phone" size={14} /> {fmtPhone(c.phone)}</span>
              <span><Icon name="pin" size={14} /> {loc}</span>
            </div>
          </div>
        </div>
        <div className="cprof-hero-metrics">
          <article>
            <span className="prod-stat-icon purple"><Icon name="bag" size={16} /></span>
            <div><b>{fmtNum(c.orderCount)}</b><span>Total Orders</span></div>
          </article>
          <article>
            <span className="prod-stat-icon green"><Icon name="chart" size={16} /></span>
            <div><b>{kes(c.spentKes)}</b><span>Total Spent</span></div>
          </article>
          <article>
            <span className="prod-stat-icon orange"><Icon name="star" size={16} /></span>
            <div><b>{fmtNum(c.pointsBalance)}</b><span>Points Balance</span></div>
          </article>
        </div>
      </section>

      <div className="pf-tabs cprof-tabs">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" className={view === v.id ? "on" : ""} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "profile" && (
        <div className="cprof-grid">
          <section className="card cprof-card">
            <h3>Customer Details</h3>
            <ul className="cprof-dl">
              <li><Icon name="users" size={14} /> {fullName(c)}</li>
              <li><Icon name="phone" size={14} /> {fmtPhone(c.phone)}</li>
              <li><Icon name="mail" size={14} /> {c.email || "—"}</li>
              <li><Icon name="pin" size={14} /> {loc}</li>
            </ul>
            <div className="cprof-member">
              <div className="cprof-member-row">
                <Icon name="crown" size={16} />
                <span>Membership Level</span>
                <em className={`st-pill ${groupCls(c.membershipLevel)}`}>{groupLabel(c.membershipLevel)}</em>
              </div>
              <div className="cprof-bar"><i style={{ width: `${progress.pct}%` }} /></div>
              <div className="muted">{progress.pct}% to {progress.next}</div>
            </div>
            <dl className="ord-sum cprof-sys">
              <div><dt>Joined</dt><dd>{fmtDate(c.createdAt)}, {fmtTime(c.createdAt)}</dd></div>
              <div><dt>Customer Since</dt><dd>{fmtDate(c.createdAt)}</dd></div>
              <div>
                <dt>Status</dt>
                <dd><span className={`st-pill ${active ? "ord-st-delivered" : "ord-st-cancelled"}`}>{active ? "Active" : "Inactive"}</span></dd>
              </div>
            </dl>
            <div className="cprof-mini3">
              <article><div className="muted">Total Spent</div><b>{kes(c.spentKes)}</b></article>
              <article><div className="muted">Orders</div><b>{fmtNum(c.orderCount)}</b></article>
              <article><div className="muted">Points</div><b>{fmtNum(c.pointsBalance)}</b></article>
            </div>
            <div className="cprof-tags-wrap">
              <div className="muted"><Icon name="tag" size={14} /> Tags</div>
              <div className="cprof-tags">
                {(c.tags || []).map((t) => <span key={t} className={tagCls(t)}>{t}</span>)}
                {(c.tags || []).length === 0 && <span className="muted">No tags</span>}
              </div>
            </div>
          </section>

          <div className="cprof-mid">
            <section className="card cprof-card">
              <div className="cprof-card-head">
                <h3>Recent Activity</h3>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => setView("activity")}>View All Activity</button>
              </div>
              <ol className="cprof-timeline">
                {activity.map((item) => (
                  <li key={item.id} className={activityTone(item)}>
                    <span className={`cprof-dot ${activityTone(item)}`}><Icon name={activityIcon(item)} size={12} /></span>
                    <div>
                      <strong>{item.text}</strong>
                      <div className="muted">{fmtDate(item.at)}, {fmtTime(item.at)}</div>
                    </div>
                    <em className={`st-pill ${
                      item.tone === "done" || item.badge === "Completed" ? "ord-st-delivered"
                        : item.tone === "points" ? "pay-paid"
                          : item.tone === "message" ? "ord-st-shipped"
                            : item.tone === "join" ? "ord-st-pending"
                              : "ord-st-pending"
                    }`}>{item.badge}</em>
                  </li>
                ))}
              </ol>
            </section>
            <section className="card cprof-card">
              <div className="cprof-card-head">
                <h3>Referral Activity</h3>
                <button className="link-reset" type="button" onClick={() => setView("referrals")}>View All</button>
              </div>
              <p>Referral Code: <strong>{c.referralCode}</strong></p>
              <p className="muted">Share this code so new customers can join Tajira Kenya and earn you points.</p>
              <div className="cprof-ref-stats">
                <span>Referred Customers: <b>{fmtNum(c.referredCount)}</b></span>
                <span>Total Points Earned: <b>{fmtNum(c.referralPoints)}</b></span>
              </div>
              <button className="btn btn-purple btn-small" type="button" onClick={shareCode}>
                <Icon name="share" size={14} /> Share Code
              </button>
            </section>
          </div>

          <div className="cprof-right">
            <section className="card cprof-card">
              <div className="cprof-card-head">
                <h3>Order History</h3>
                <button className="link-reset" type="button" onClick={() => setView("orders")}>View All</button>
              </div>
              <ul className="cprof-orders">
                {orders.slice(0, 4).map((o) => {
                  const st = orderPill(o.status);
                  return (
                    <li key={o.id}>
                      {o.thumb ? <img src={o.thumb} alt="" /> : <span className="cprof-thumb"><Icon name="box" size={14} /></span>}
                      <div>
                        <Link to={`/orders/${o.id}`}>{o.orderNumber}</Link>
                        <div className="muted">{fmtDate(o.createdAt)}</div>
                      </div>
                      <span className={`st-pill ${st.cls}`}>{st.label}</span>
                      <b>{kes(o.totalKes)}</b>
                    </li>
                  );
                })}
                {orders.length === 0 && <li className="muted">No orders yet.</li>}
              </ul>
            </section>
            <section className="card cprof-card">
              <div className="cprof-card-head">
                <h3>Loyalty Points</h3>
                <button className="link-reset" type="button" onClick={() => setView("points")}>View History</button>
              </div>
              <div className="cprof-points">
                <span className="prod-stat-icon purple"><Icon name="gift" size={18} /></span>
                <div>
                  <b>{fmtNum(c.pointsBalance)} Points</b>
                  <div className="muted">= {kes(c.pointsBalance)}</div>
                </div>
              </div>
              <div className="cprof-bar"><i style={{ width: `${pointsPct}%` }} /></div>
              <div className="muted">{pointsPct}% to 6,000 Points (Platinum)</div>
            </section>
            <section className="card cprof-card">
              <h3>Customer Notes</h3>
              <form className="cprof-note-form" onSubmit={saveNote}>
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note..." />
                <button className="btn btn-purple btn-small" type="submit">Save Note</button>
              </form>
              {notes.map((n, i) => (
                <div key={n.id || i} className="cprof-note">
                  {n.body} <span className="muted">— {fmtDate(n.at)}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {view === "orders" && (
        <section className="card cprof-card">
          <h3>Orders</h3>
          <table className="table cat-table">
            <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {orders.map((o) => {
                const st = orderPill(o.status);
                return (
                  <tr key={o.id}>
                    <td><Link to={`/orders/${o.id}`}>{o.orderNumber}</Link></td>
                    <td>{fmtDate(o.createdAt)} <span className="muted">{fmtTime(o.createdAt)}</span></td>
                    <td><span className={`st-pill ${st.cls}`}>{st.label}</span></td>
                    <td>{kes(o.totalKes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {view === "points" && (
        <section className="card cprof-card">
          <h3>Points & Rewards</h3>
          <p><b>{fmtNum(c.pointsBalance)}</b> points · {kes(c.pointsBalance)}</p>
          <table className="table cat-table">
            <thead><tr><th>When</th><th>Type</th><th>Points</th><th>Note</th></tr></thead>
            <tbody>
              {(c.pointsHistory || []).map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.createdAt)} {fmtTime(t.createdAt)}</td>
                  <td>{t.type}</td>
                  <td>{t.points > 0 ? `+${t.points}` : t.points}</td>
                  <td>{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === "activity" && (
        <section className="card cprof-card">
          <h3>Activity</h3>
          <ol className="cprof-timeline">
            {activity.map((item) => (
              <li key={item.id} className={activityTone(item)}>
                <span className={`cprof-dot ${activityTone(item)}`}><Icon name={activityIcon(item)} size={12} /></span>
                <div>
                  <strong>{item.text}</strong>
                  <div className="muted">{fmtDate(item.at)}, {fmtTime(item.at)}</div>
                </div>
                <em className="st-pill ord-st-pending">{item.badge}</em>
              </li>
            ))}
          </ol>
        </section>
      )}

      {view === "referrals" && (
        <section className="card cprof-card">
          <h3>Referrals</h3>
          <p>Code <strong>{c.referralCode}</strong> · {fmtNum(c.referredCount)} customers · {fmtNum(c.referralPoints)} points</p>
          <table className="table cat-table">
            <thead><tr><th>Customer</th><th>Joined</th></tr></thead>
            <tbody>
              {(c.referred || []).map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/customers/${r.id}`}>{fullName(r)}</Link><div className="muted">#{r.customerNumber}</div></td>
                  <td>{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
              {(c.referred || []).length === 0 && <tr><td colSpan="2" className="muted">No referrals yet.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      <footer className="cprof-actions">
        <strong>Customer Actions:</strong>
        <Link className="btn btn-ghost btn-small" to={`/orders?q=${encodeURIComponent(c.phone || c.email || "")}`}>
          <Icon name="bag" size={14} /> View Orders
        </Link>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => setPointsOpen(true)}>
          <Icon name="star" size={14} /> Add Points
        </button>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => setMsgOpen(true)}>
          <Icon name="mail" size={14} /> Send Message
        </button>
        <button className="btn btn-ghost btn-small danger-txt" type="button" onClick={disableAccount}>
          <Icon name="ban" size={14} /> Disable Account
        </button>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => setSegOpen(true)}>
          <Icon name="usersPlus" size={14} /> Add to Segment
        </button>
        <button className="btn btn-ghost btn-small" type="button" onClick={exportData}>
          <Icon name="download" size={14} /> Export Data
        </button>
      </footer>

      {edit && (
        <div className="prod-modal" onClick={() => setEdit(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h2>Edit Customer</h2>
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
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
            <label>Group</label>
            <select value={form.membershipLevel} onChange={(e) => setForm((f) => ({ ...f, membershipLevel: e.target.value }))}>
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setEdit(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}

      {msgOpen && (
        <div className="prod-modal" onClick={() => setMsgOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={sendMsg}>
            <h2>Send Message</h2>
            <label>Message</label>
            <textarea rows={4} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} required placeholder="Write a note to this customer…" />
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setMsgOpen(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Send</button>
            </div>
          </form>
        </div>
      )}

      {pointsOpen && (
        <div className="prod-modal" onClick={() => setPointsOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={addPoints}>
            <h2>Add Points</h2>
            <label>Points</label>
            <input type="number" value={pointsAmt} onChange={(e) => setPointsAmt(e.target.value)} />
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setPointsOpen(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Add Points</button>
            </div>
          </form>
        </div>
      )}

      {segOpen && (
        <div className="prod-modal" onClick={() => setSegOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveSegment}>
            <h2>Add to Segment</h2>
            <label>Segment</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="loyal">Loyal</option>
              <option value="new">New</option>
              <option value="inactive">Inactive</option>
              <option value="vip">VIP</option>
            </select>
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setSegOpen(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" type="submit">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
