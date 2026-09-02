import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "general", label: "General" },
  { id: "store", label: "Store" },
  { id: "payments", label: "Payments" },
  { id: "team", label: "Team & Roles" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "integrations", label: "Integrations" },
];

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      className={`ptsset-switch ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <i />
      <span>{on ? "Enabled" : "Disabled"}</span>
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="ptsset-field">
      <span className="ptsset-label">{label}</span>
      {children}
      {hint ? <small className="muted">{hint}</small> : null}
    </label>
  );
}

function Section({ icon, title, subtitle, children }) {
  return (
    <section className="card pf-card ptsset-section">
      <header className="ptsset-sec-head">
        <span className="ptsset-sec-ico"><Icon name={icon} size={14} /></span>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState(searchParams.get("tab") || "general");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [invite, setInvite] = useState({ name: "", email: "", role: "Support Agent" });

  function load() {
    api("/admin/settings")
      .then((d) => {
        setData(d);
        setForm({ ...d.settings });
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load settings."));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() { setSaveOpen(false); }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function switchTab(id) {
    setTab(id);
    setSearchParams(id === "general" ? {} : { tab: id });
  }

  async function save(extra = {}) {
    if (!form) return;
    setBusy(true);
    try {
      const res = await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ ...form, ...extra }),
      });
      setData(res);
      setForm({ ...res.settings });
      setToast(res.message || "Settings saved.");
      setSaveOpen(false);
      setInviteOpen(false);
      setEditing(null);
      setError("");
    } catch (err) {
      setError(err.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm("Reset all settings to defaults?")) return;
    setBusy(true);
    try {
      const res = await api("/admin/settings/reset", { method: "POST", body: "{}" });
      setData(res);
      setForm({ ...res.settings });
      setToast(res.message || "Settings reset to defaults.");
      setError("");
    } catch (err) {
      setError(err.message || "Could not reset settings.");
    } finally {
      setBusy(false);
    }
  }

  function sendInvite(e) {
    e.preventDefault();
    if (!invite.name.trim() || !invite.email.trim()) return setToast("Name and email are required");
    save({ invite: { ...invite } }).then(() => {
      setInvite({ name: "", email: "", role: "Support Agent" });
    });
  }

  function saveMember(e) {
    e.preventDefault();
    if (!editing) return;
    save({ memberUpdate: editing });
  }

  if (!form || !data) {
    return (
      <div className="ptsset-page set-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <strong>Settings</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading settings…</p>}
      </div>
    );
  }

  const opts = data.options || {};
  const summary = data.summary || {};
  const info = data.info || {};

  return (
    <div className="ptsset-page set-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <strong>Settings</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="gear" size={16} /></span>
            Settings
          </h1>
          <p>Configure store details, payments, team access, notifications and integrations.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" disabled={busy} onClick={reset}>
            Reset defaults
          </button>
          <div className="ptsset-dd-wrap">
            <button
              className="btn btn-purple btn-small ptsset-save-btn"
              type="button"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); save(); }}
            >
              <Icon name="save" size={14} /> {busy ? "Saving…" : "Save Changes"}
            </button>
            <button
              className="btn btn-purple btn-small ptsset-save-caret"
              type="button"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); setSaveOpen((v) => !v); }}
            >
              <Icon name="chevron" size={14} />
            </button>
            {saveOpen && (
              <div className="ptsset-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => save()}>Save Changes</button>
                <button type="button" onClick={() => { setSaveOpen(false); setToast("Saved as draft"); }}>Save as Draft</button>
                <button type="button" onClick={() => { setSaveOpen(false); load(); setToast("Changes discarded"); }}>Discard Changes</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <div className="ptsset-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => switchTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ptsset-layout">
        <div className="ptsset-main">
          {tab === "general" && (
            <form className="ptsset-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Section icon="gear" title="General Configuration" subtitle="Brand identity and regional defaults for Tajira Kenya.">
                <div className="ptsset-grid-2">
                  <Field label="Store name"><input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} /></Field>
                  <Field label="Tagline"><input value={form.storeTagline} onChange={(e) => set("storeTagline", e.target.value)} /></Field>
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Support email"><input type="email" value={form.storeEmail} onChange={(e) => set("storeEmail", e.target.value)} /></Field>
                  <Field label="Support phone"><input value={form.storePhone} onChange={(e) => set("storePhone", e.target.value)} /></Field>
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Timezone">
                    <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                      {(opts.timezones || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Currency">
                    <select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                      {(opts.currencies || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Default language">
                  <select value={form.language} onChange={(e) => set("language", e.target.value)}>
                    {(opts.languages || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </Section>

              <Section icon="warning" title="Maintenance Mode" subtitle="Temporarily pause public storefront access.">
                <div className="ptsset-row">
                  <span className="ptsset-label">
                    Enable maintenance mode
                    <span className="muted">Customers will see a maintenance message on web and app</span>
                  </span>
                  <Toggle on={form.maintenanceMode} onChange={(v) => set("maintenanceMode", v)} />
                </div>
              </Section>
            </form>
          )}

          {tab === "store" && (
            <form className="ptsset-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Section icon="box" title="Store Operations" subtitle="Checkout, tax, inventory and order defaults.">
                <Field label="Business address" hint="Shown on invoices and receipts.">
                  <input value={form.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
                <div className="ptsset-grid-2">
                  <Field label="City"><input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
                  <Field label="Country"><input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
                </div>
                <div className="ptsset-grid-2">
                  <Field label="VAT / Tax rate (%)"><input type="number" min="0" value={form.taxRate} onChange={(e) => set("taxRate", Number(e.target.value))} /></Field>
                  <Field label="Low stock threshold"><input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} /></Field>
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Order ID prefix"><input value={form.orderPrefix} onChange={(e) => set("orderPrefix", e.target.value)} /></Field>
                  <Field label="Invoice prefix"><input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></Field>
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Allow guest checkout<span className="muted">Buy without creating an account</span></span>
                  <Toggle on={form.allowGuestCheckout} onChange={(v) => set("allowGuestCheckout", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Require email verification<span className="muted">New accounts must verify before ordering</span></span>
                  <Toggle on={form.requireEmailVerify} onChange={(v) => set("requireEmailVerify", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Show out-of-stock products<span className="muted">Display with “Notify me” instead of hiding</span></span>
                  <Toggle on={form.showOutOfStock} onChange={(v) => set("showOutOfStock", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto-confirm paid orders<span className="muted">Skip pending review when payment succeeds</span></span>
                  <Toggle on={form.autoConfirmOrders} onChange={(v) => set("autoConfirmOrders", v)} />
                </div>
              </Section>
            </form>
          )}

          {tab === "payments" && (
            <form className="ptsset-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Section icon="card" title="Pesapal (live checkout)" subtitle="Customers pay M-Pesa, Airtel Money or card into your Pesapal merchant account.">
                <div className="ptsset-row">
                  <span className="ptsset-label">
                    Status
                    <span className="muted">
                      {data?.pesapal?.liveReady
                        ? "Live payments are configured"
                        : data?.pesapal?.configured
                          ? `Keys loaded · ${data.pesapal.env} mode`
                          : "Add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET on the API"}
                    </span>
                  </span>
                  <span className={`st-pill ${data?.pesapal?.liveReady ? "sup-st-resolved" : "sup-st-pending"}`}>
                    {data?.pesapal?.liveReady ? "Live" : data?.pesapal?.configured ? data.pesapal.env : "Not configured"}
                  </span>
                </div>
                <p className="muted">
                  Set <code>PESAPAL_ENV=live</code>, live merchant keys, and <code>PUBLIC_BASE_URL</code> on the API host,
                  then run <code>npm run pesapal:setup</code> in <code>backend</code> to register the IPN.
                </p>
              </Section>
              <Section icon="card" title="Payment Methods" subtitle="Enable checkout payment options for customers.">
                <div className="ptsset-row">
                  <span className="ptsset-label">M-PESA<span className="muted">Lipa Na M-PESA STK push</span></span>
                  <Toggle on={form.mpesaEnabled} onChange={(v) => set("mpesaEnabled", v)} />
                </div>
                <Field label="M-PESA shortcode" hint="Till or Paybill number">
                  <input value={form.mpesaShortcode} onChange={(e) => set("mpesaShortcode", e.target.value)} disabled={!form.mpesaEnabled} />
                </Field>
                <div className="ptsset-row">
                  <span className="ptsset-label">Card payments<span className="muted">Visa / Mastercard via gateway</span></span>
                  <Toggle on={form.cardEnabled} onChange={(v) => set("cardEnabled", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Cash on delivery</span>
                  <Toggle on={form.cashOnDelivery} onChange={(v) => set("cashOnDelivery", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Bank transfer</span>
                  <Toggle on={form.bankTransfer} onChange={(v) => set("bankTransfer", v)} />
                </div>
              </Section>
            </form>
          )}

          {tab === "team" && (
            <div className="ptsset-form">
              <Section icon="users" title="Team Members" subtitle="Invite staff and manage dashboard roles.">
                <div className="prod-actions" style={{ marginBottom: 12 }}>
                  <button className="btn btn-purple btn-small" type="button" onClick={() => setInviteOpen(true)}>
                    <Icon name="plus" size={14} /> Invite member
                  </button>
                </div>
                <div className="prod-table-wrap">
                  <table className="table prod-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.team || []).map((m) => (
                        <tr key={m.id}>
                          <td className="muted">{m.n}</td>
                          <td><strong>{m.name}</strong></td>
                          <td>{m.email}</td>
                          <td>{m.role}</td>
                          <td>
                            <span className={`st-pill ${m.status === "active" ? "sup-st-resolved" : "sup-st-pending"}`}>
                              {m.status}
                            </span>
                          </td>
                          <td>{m.lastActive}</td>
                          <td>
                            <button
                              className="btn btn-ghost btn-small"
                              type="button"
                              onClick={() => setEditing({ id: m.id, name: m.name, email: m.email, role: m.role, status: m.status })}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          )}

          {tab === "notifications" && (
            <form className="ptsset-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Section icon="bell" title="Admin Notifications" subtitle="Choose which events alert your team.">
                {[
                  ["notifyNewOrder", "New order placed", "SMS to admin, sales and the customer"],
                  ["notifyLowStock", "Low stock alerts", "When inventory hits the threshold"],
                  ["notifyTicket", "New support ticket", "Open tickets from customers"],
                  ["notifyPaymentFail", "Failed payments", "SMS when Pesapal payment fails"],
                  ["notifyFlashDrop", "Flash Drop events", "Start, end and sell-out alerts"],
                  ["notifyDailyDigest", "Daily digest", "Summary email every morning at 8:00 AM"],
                ].map(([key, label, hint]) => (
                  <div className="ptsset-row" key={key}>
                    <span className="ptsset-label">
                      {label}
                      <span className="muted">{hint}</span>
                    </span>
                    <Toggle on={!!form[key]} onChange={(v) => set(key, v)} />
                  </div>
                ))}
              </Section>
              <Section icon="mail" title="Beem Africa SMS" subtitle="SMS is the main channel for order updates to customers, admin and sales.">
                <div className="ptsset-row">
                  <span className="ptsset-label">
                    Gateway
                    <span className="muted">
                      {data?.sms?.configured
                        ? `Sender ID ${data.sms.senderId} · ${data.sms.adminCount} admin, ${data.sms.salesCount} sales numbers`
                        : "Add BEEM_API_KEY and BEEM_SECRET_KEY on the API"}
                    </span>
                  </span>
                  <span className={`st-pill ${data?.sms?.configured ? "sup-st-resolved" : "sup-st-pending"}`}>
                    {data?.sms?.configured ? "Live" : "Not configured"}
                  </span>
                </div>
                <Field label="Admin phones" hint="Who gets new-order and payment alerts. Comma-separated, e.g. 254712345678, 0712345678">
                  <input
                    value={form.smsAdminPhones || ""}
                    onChange={(e) => set("smsAdminPhones", e.target.value)}
                    placeholder="2547XXXXXXXX"
                  />
                </Field>
                <Field label="Sales team phones" hint="Who gets packing, shipping and delivery alerts. Comma-separated.">
                  <input
                    value={form.smsSalesPhones || ""}
                    onChange={(e) => set("smsSalesPhones", e.target.value)}
                    placeholder="2547XXXXXXXX, 2547XXXXXXXX"
                  />
                </Field>
                <Field label="Support phone" hint="Shown to the customer on cancelled-order SMS.">
                  <input
                    value={form.smsSupportPhone || ""}
                    onChange={(e) => set("smsSupportPhone", e.target.value)}
                    placeholder="2547XXXXXXXX"
                  />
                </Field>
                <p className="muted">
                  Beem API keys stay on the server (<code>BEEM_API_KEY</code> / <code>BEEM_SECRET_KEY</code>).
                  These numbers are saved here and used for every order SMS.
                </p>
              </Section>
              <Section icon="mail" title="Email Sender" subtitle="Optional fallback for non-order mail.">
                <div className="ptsset-grid-2">
                  <Field label="From name"><input value={form.emailFromName} onChange={(e) => set("emailFromName", e.target.value)} /></Field>
                  <Field label="From address"><input type="email" value={form.emailFromAddress} onChange={(e) => set("emailFromAddress", e.target.value)} /></Field>
                </div>
                <Field label="SMS sender ID"><input value={form.smsSenderId} onChange={(e) => set("smsSenderId", e.target.value)} maxLength={11} /></Field>
              </Section>
            </form>
          )}

          {tab === "security" && (
            <form className="ptsset-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Section icon="ban" title="Security" subtitle="Protect admin access and sessions.">
                <div className="ptsset-row">
                  <span className="ptsset-label">
                    Require 2FA for admins
                    <span className="muted">Staff must verify with a second factor at login</span>
                  </span>
                  <Toggle on={form.twoFactorAdmin} onChange={(v) => set("twoFactorAdmin", v)} />
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Session timeout (minutes)">
                    <input type="number" min="5" value={form.sessionTimeoutMin} onChange={(e) => set("sessionTimeoutMin", Number(e.target.value))} />
                  </Field>
                  <Field label="Minimum password length">
                    <input type="number" min="6" value={form.passwordMinLength} onChange={(e) => set("passwordMinLength", Number(e.target.value))} />
                  </Field>
                </div>
                <Field label="Lock account after failed attempts">
                  <input type="number" min="3" value={form.lockoutAttempts} onChange={(e) => set("lockoutAttempts", Number(e.target.value))} />
                </Field>
              </Section>
            </form>
          )}

          {tab === "integrations" && (
            <form className="ptsset-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Section icon="globe" title="API & Webhooks" subtitle="Connect external systems and listen for events.">
                <Field label="API key" hint="Shown masked. Rotate from security if compromised.">
                  <input value={form.apiKeyMasked} readOnly />
                </Field>
                <Field label="Webhook URL" hint="POST JSON events for orders, payments and tickets.">
                  <input value={form.webhookUrl} onChange={(e) => set("webhookUrl", e.target.value)} placeholder="https://…" />
                </Field>
                <div className="prod-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("API key rotation started")}>
                    Rotate API key
                  </button>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("Test webhook sent")}>
                    Send test webhook
                  </button>
                </div>
              </Section>
              <Section icon="chart" title="Analytics" subtitle="Optional tracking IDs for marketing attribution.">
                <div className="ptsset-grid-2">
                  <Field label="Google Analytics ID"><input value={form.googleAnalyticsId} onChange={(e) => set("googleAnalyticsId", e.target.value)} placeholder="G-XXXXXXXX" /></Field>
                  <Field label="Meta Pixel ID"><input value={form.metaPixelId} onChange={(e) => set("metaPixelId", e.target.value)} placeholder="Pixel ID" /></Field>
                </div>
              </Section>
            </form>
          )}
        </div>

        <aside className="ptsset-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Snapshot</h2>
            <ul className="ptsset-summary">
              <li>
                <span className="ptsset-sum-ico purple"><Icon name="users" size={14} /></span>
                <div>
                  <span className="muted">Active team</span>
                  <strong>{summary.teamActive || 0}</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico orange"><Icon name="mail" size={14} /></span>
                <div>
                  <span className="muted">Pending invites</span>
                  <strong>{summary.teamInvited || 0}</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico green"><Icon name="card" size={14} /></span>
                <div>
                  <span className="muted">Payment methods on</span>
                  <strong>{summary.paymentsOn || 0}</strong>
                </div>
              </li>
              <li>
                <span className={`ptsset-sum-ico ${summary.maintenance ? "red" : "blue"}`}><Icon name="warning" size={14} /></span>
                <div>
                  <span className="muted">Maintenance</span>
                  <strong>{summary.maintenance ? "On" : "Off"}</strong>
                </div>
              </li>
            </ul>
          </section>

          <section className="card pf-card">
            <h2><Icon name="info" size={14} /> Settings Info</h2>
            <dl className="ptsset-info">
              <div><dt>Settings ID</dt><dd><code>{info.settingsId}</code></dd></div>
              <div><dt>Environment</dt><dd>{info.env}</dd></div>
              <div><dt>Last updated</dt><dd>{info.lastUpdated}</dd></div>
              <div><dt>Updated by</dt><dd>{info.lastUpdatedBy}</dd></div>
            </dl>
          </section>

          <section className="card pf-card">
            <h2><Icon name="bulb" size={14} /> Notes</h2>
            <ul className="ptsset-notes">
              {(data.notes || []).map((n) => (
                <li key={n}>
                  <Icon name="checkCircle" size={14} />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pf-card dlvset-quick">
            <h2><Icon name="bolt" size={14} /> Quick Links</h2>
            <div className="dlvset-quick-list">
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/delivery?tab=settings")}>
                <Icon name="truck" size={14} /> Delivery settings
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/points?tab=settings")}>
                <Icon name="star" size={14} /> Points settings
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/marketing")}>
                <Icon name="megaphone" size={14} /> Marketing
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/support")}>
                <Icon name="help" size={14} /> Support
              </button>
            </div>
          </section>
        </aside>
      </div>

      {data.footerTip && (
        <footer className="card pf-card ptsset-foot">
          <p>
            <Icon name="info" size={14} />
            {data.footerTip}
          </p>
        </footer>
      )}

      {inviteOpen && (
        <div className="prod-modal" onClick={() => setInviteOpen(false)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={sendInvite}>
            <div className="ord-drawer-head">
              <div>
                <h2>Invite team member</h2>
                <p className="muted">They will receive an email to join the dashboard.</p>
              </div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setInviteOpen(false)}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="form-grid">
              <Field label="Full name"><input value={invite.name} onChange={(e) => setInvite((f) => ({ ...f, name: e.target.value }))} required /></Field>
              <Field label="Email"><input type="email" value={invite.email} onChange={(e) => setInvite((f) => ({ ...f, email: e.target.value }))} required /></Field>
              <Field label="Role">
                <select value={invite.role} onChange={(e) => setInvite((f) => ({ ...f, role: e.target.value }))}>
                  {(data.roles || []).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit" disabled={busy}>Send invite</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setInviteOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="prod-modal" onClick={() => setEditing(null)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveMember}>
            <div className="ord-drawer-head">
              <div>
                <h2>Edit team member</h2>
                <p className="muted">{editing.email}</p>
              </div>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setEditing(null)}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="form-grid">
              <Field label="Full name">
                <input value={editing.name} onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))} required />
              </Field>
              <Field label="Role">
                <select value={editing.role} onChange={(e) => setEditing((f) => ({ ...f, role: e.target.value }))}>
                  {(data.roles || []).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={editing.status} onChange={(e) => setEditing((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">active</option>
                  <option value="invited">invited</option>
                  <option value="disabled">disabled</option>
                </select>
              </Field>
            </div>
            <div className="prod-actions rule-drawer-acts">
              <button className="btn btn-purple btn-small" type="submit" disabled={busy}>Save member</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
