import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "general", label: "General" },
  { id: "shipping", label: "Shipping Rules" },
  { id: "couriers", label: "Couriers" },
  { id: "zones", label: "Zones & Fees" },
  { id: "returns", label: "Returns" },
  { id: "notifications", label: "Notifications" },
  { id: "automation", label: "Automation" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function Toggle({ on, label, onChange }) {
  return (
    <button
      type="button"
      className={`ptsset-switch ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <i />
      <span>{on ? (label || "Enabled") : "Disabled"}</span>
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="ptsset-field">
      <span className="ptsset-label">{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
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

export default function DeliverySettings() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState("general");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  function load() {
    api("/admin/delivery-settings")
      .then((d) => {
        setData(d);
        setForm({ ...d.settings });
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load delivery settings."));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setSaveOpen(false);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e?.preventDefault?.();
    if (!form) return;
    setBusy(true);
    try {
      const res = await api("/admin/delivery-settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setForm({ ...res.settings });
      setToast(res.message || "Settings saved.");
      setSaveOpen(false);
      setError("");
    } catch (err) {
      setError(err.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  async function resetDefaults() {
    if (!confirm("Reset all delivery settings to defaults?")) return;
    setBusy(true);
    try {
      const res = await api("/admin/delivery-settings/reset", { method: "POST" });
      setForm({ ...res.settings });
      setToast(res.message || "Settings reset.");
      setError("");
    } catch (err) {
      setError(err.message || "Could not reset settings.");
    } finally {
      setBusy(false);
    }
  }

  if (!data || !form) {
    return (
      <div className="ptsset-page dlvset-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/delivery">Delivery</Link>
          <span>›</span>
          <strong>Delivery Settings</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading settings…</p>}
      </div>
    );
  }

  const opts = data.options || {};
  const summary = data.summary || {};
  const info = data.programInfo || {};

  return (
    <div className="ptsset-page dlvset-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/delivery">Delivery</Link>
        <span>›</span>
        <strong>Delivery Settings</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="gear" size={16} /></span>
            Delivery Settings
          </h1>
          <p>Configure shipping rules, couriers, fees, returns and delivery notifications.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" disabled={busy} onClick={resetDefaults}>
            <Icon name="refresh" size={14} /> Reset Defaults
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/delivery")}>
            Back to Overview
          </button>
          <div className="ptsset-dd-wrap">
            <button
              className="btn btn-purple btn-small ptsset-save-btn"
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                save();
              }}
            >
              <Icon name="save" size={14} /> {busy ? "Saving…" : "Save Changes"}
            </button>
            <button
              className="btn btn-purple btn-small ptsset-save-caret"
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                setSaveOpen((v) => !v);
              }}
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
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ptsset-layout">
        <div className="ptsset-main">
          {tab === "general" && (
            <form className="ptsset-form" onSubmit={save}>
              <Section icon="truck" title="General Configuration" subtitle="Core delivery service settings for Tajira Kenya.">
                <div className="ptsset-row">
                  <span className="ptsset-label">
                    Enable Delivery Module
                    <span className="muted">Turn delivery operations on or off store-wide</span>
                  </span>
                  <Toggle on={form.enabled} onChange={(v) => set("enabled", v)} />
                </div>
                <Field label="Delivery Brand Name">
                  <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                </Field>
                <div className="ptsset-grid-2">
                  <Field label="Support Phone">
                    <input value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} />
                  </Field>
                  <Field label="Support Email">
                    <input type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
                  </Field>
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Timezone">
                    <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                      {(opts.timezones || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Default Courier">
                    <select value={form.defaultCourier} onChange={(e) => set("defaultCourier", e.target.value)}>
                      {(opts.couriers || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Section>

              <Section icon="clock" title="Operating Hours" subtitle="When same-day and next-day dispatch is allowed.">
                <Field label="Working Days">
                  <select value={form.workingDays} onChange={(e) => set("workingDays", e.target.value)}>
                    {(opts.workingDays || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="ptsset-grid-2">
                  <Field label="Order Cutoff Time" hint="Orders after this go to next working day">
                    <input type="time" value={form.cutoffTime} onChange={(e) => set("cutoffTime", e.target.value)} />
                  </Field>
                  <Field label="Same-Day Cutoff" hint="Last time for same-day Nairobi deliveries">
                    <input type="time" value={form.sameDayCutoff} onChange={(e) => set("sameDayCutoff", e.target.value)} />
                  </Field>
                </div>
              </Section>
            </form>
          )}

          {tab === "shipping" && (
            <form className="ptsset-form" onSubmit={save}>
              <Section icon="box" title="Shipping Rules" subtitle="Fees, packing SLA and cash-on-delivery limits.">
                <div className="ptsset-row">
                  <span className="ptsset-label">
                    Free Shipping
                    <span className="muted">Waive zone fees when order meets the minimum</span>
                  </span>
                  <Toggle on={form.freeShippingEnabled} onChange={(v) => set("freeShippingEnabled", v)} />
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Free Shipping Minimum (KES)">
                    <input type="number" min="0" value={form.freeShippingMinKes} onChange={(e) => set("freeShippingMinKes", Number(e.target.value))} disabled={!form.freeShippingEnabled} />
                  </Field>
                  <Field label="Base Delivery Fee (KES)">
                    <input type="number" min="0" value={form.baseFeeKes} onChange={(e) => set("baseFeeKes", Number(e.target.value))} />
                  </Field>
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Max Parcel Weight (kg)">
                    <input type="number" min="1" value={form.weightLimitKg} onChange={(e) => set("weightLimitKg", Number(e.target.value))} />
                  </Field>
                  <Field label="Packing Time (minutes)">
                    <input type="number" min="0" value={form.packingMinutes} onChange={(e) => set("packingMinutes", Number(e.target.value))} />
                  </Field>
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Require Signature on Delivery</span>
                  <Toggle on={form.requireSignature} onChange={(v) => set("requireSignature", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Allow Cash on Delivery (COD)</span>
                  <Toggle on={form.allowCashOnDelivery} onChange={(v) => set("allowCashOnDelivery", v)} />
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Max COD Amount (KES)">
                    <input type="number" min="0" value={form.maxCodKes} onChange={(e) => set("maxCodKes", Number(e.target.value))} disabled={!form.allowCashOnDelivery} />
                  </Field>
                  <Field label="Fragile Handling Fee (KES)">
                    <input type="number" min="0" value={form.fragileHandlingFee} onChange={(e) => set("fragileHandlingFee", Number(e.target.value))} />
                  </Field>
                </div>
              </Section>
            </form>
          )}

          {tab === "couriers" && (
            <form className="ptsset-form" onSubmit={save}>
              <Section icon="users" title="Courier Assignment" subtitle="How shipments are handed to riders and partners.">
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto-assign Couriers</span>
                  <Toggle on={form.autoAssignCourier} onChange={(v) => set("autoAssignCourier", v)} />
                </div>
                <Field label="Assignment Strategy">
                  <select value={form.assignStrategy} onChange={(e) => set("assignStrategy", e.target.value)} disabled={!form.autoAssignCourier}>
                    {(opts.assignStrategies || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="ptsset-row">
                  <span className="ptsset-label">Require Courier Verification</span>
                  <Toggle on={form.requireCourierVerification} onChange={(v) => set("requireCourierVerification", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Allow Dispatch to Offline Couriers</span>
                  <Toggle on={form.allowOfflineDispatch} onChange={(v) => set("allowOfflineDispatch", v)} />
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Max Active Deliveries per Courier">
                    <input type="number" min="1" value={form.maxActiveDeliveries} onChange={(e) => set("maxActiveDeliveries", Number(e.target.value))} />
                  </Field>
                  <Field label="Courier Pickup SLA (minutes)">
                    <input type="number" min="15" value={form.courierSlaMinutes} onChange={(e) => set("courierSlaMinutes", Number(e.target.value))} />
                  </Field>
                </div>
                <p className="muted dlvset-link-hint">
                  Manage individual couriers on the{" "}
                  <button className="link-reset" type="button" onClick={() => navigate("/delivery?tab=couriers")}>Couriers</button> page.
                </p>
              </Section>
            </form>
          )}

          {tab === "zones" && (
            <form className="ptsset-form" onSubmit={save}>
              <Section icon="pin" title="Zones & Fees" subtitle="Default fees and surcharges applied across zones.">
                <div className="ptsset-grid-2">
                  <Field label="Default Zone Fee (KES)" hint="Used when the customer address does not match a zone">
                    <input type="number" min="0" value={form.defaultZoneFeeKes} onChange={(e) => set("defaultZoneFeeKes", Number(e.target.value))} />
                  </Field>
                  <Field label="Remote Area Surcharge (KES)" hint="Added on top of the default fee when no zone matches">
                    <input type="number" min="0" value={form.remoteAreaSurchargeKes} onChange={(e) => set("remoteAreaSurchargeKes", Number(e.target.value))} />
                  </Field>
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Express surcharge (KES)" hint="Added when the customer picks Express in the app">
                    <input type="number" min="0" value={form.expressSurchargeKes ?? 200} onChange={(e) => set("expressSurchargeKes", Number(e.target.value))} />
                  </Field>
                  <Field label="Weekend Surcharge (KES)">
                    <input type="number" min="0" value={form.weekendSurchargeKes} onChange={(e) => set("weekendSurchargeKes", Number(e.target.value))} />
                  </Field>
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Apply VAT on Delivery Fees</span>
                  <Toggle on={form.vatOnDelivery} onChange={(v) => set("vatOnDelivery", v)} />
                </div>
                <Field label="VAT Percent">
                  <input type="number" min="0" max="100" value={form.vatPercent} onChange={(e) => set("vatPercent", Number(e.target.value))} disabled={!form.vatOnDelivery} />
                </Field>
                <Field label="Peak-Hour Surcharge (KES)">
                  <input type="number" min="0" value={form.peakHourSurchargeKes} onChange={(e) => set("peakHourSurchargeKes", Number(e.target.value))} />
                </Field>
                <p className="muted dlvset-link-hint">
                  Edit coverage areas on{" "}
                  <button className="link-reset" type="button" onClick={() => navigate("/delivery?tab=zones")}>Delivery Zones</button>.
                </p>
              </Section>
            </form>
          )}

          {tab === "returns" && (
            <form className="ptsset-form" onSubmit={save}>
              <Section icon="refresh" title="Return Policy" subtitle="How reverse logistics and refunds are handled.">
                <div className="ptsset-row">
                  <span className="ptsset-label">Enable Returns</span>
                  <Toggle on={form.returnsEnabled} onChange={(v) => set("returnsEnabled", v)} />
                </div>
                <Field label="Return Window (days after delivery)" hint="Customers can request a return within this period">
                  <input type="number" min="1" value={form.returnWindowDays} onChange={(e) => set("returnWindowDays", Number(e.target.value))} disabled={!form.returnsEnabled} />
                </Field>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto-approve Eligible Returns</span>
                  <Toggle on={form.autoApproveReturns} onChange={(v) => set("autoApproveReturns", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Offer Pickup for Returns</span>
                  <Toggle on={form.pickupForReturns} onChange={(v) => set("pickupForReturns", v)} />
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Default Refund Method">
                    <select value={form.refundMethod} onChange={(e) => set("refundMethod", e.target.value)}>
                      {(opts.refundMethods || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Restocking Fee (%)">
                    <input type="number" min="0" max="100" value={form.restockingFeePercent} onChange={(e) => set("restockingFeePercent", Number(e.target.value))} />
                  </Field>
                </div>
                <p className="muted dlvset-link-hint">
                  Process open returns on the{" "}
                  <button className="link-reset" type="button" onClick={() => navigate("/delivery?tab=returns")}>Returns</button> page.
                </p>
              </Section>
            </form>
          )}

          {tab === "notifications" && (
            <form className="ptsset-form" onSubmit={save}>
              <Section icon="bell" title="Customer Notifications" subtitle="Alerts sent as shipments move through the pipeline.">
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify on Dispatch</span>
                  <Toggle on={form.notifyDispatch} onChange={(v) => set("notifyDispatch", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify Out for Delivery</span>
                  <Toggle on={form.notifyOutForDelivery} onChange={(v) => set("notifyOutForDelivery", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify Delivered</span>
                  <Toggle on={form.notifyDelivered} onChange={(v) => set("notifyDelivered", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify Failed Attempt</span>
                  <Toggle on={form.notifyFailed} onChange={(v) => set("notifyFailed", v)} />
                </div>
                <Field label="Notification Channels">
                  <select value={form.notifyChannels} onChange={(e) => set("notifyChannels", e.target.value)}>
                    {(opts.notifyChannels || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="ptsset-row">
                  <span className="ptsset-label">Include Tracking Link</span>
                  <Toggle on={form.customerTrackingLink} onChange={(v) => set("customerTrackingLink", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Alert Admins on Failed Delivery</span>
                  <Toggle on={form.adminAlertOnFailed} onChange={(v) => set("adminAlertOnFailed", v)} />
                </div>
              </Section>
            </form>
          )}

          {tab === "automation" && (
            <form className="ptsset-form" onSubmit={save}>
              <Section icon="bolt" title="Automation" subtitle="Background jobs that keep delivery status in sync.">
                <div className="ptsset-grid-2">
                  <Field label="Auto-mark Delivered After (hours)" hint="If courier confirms drop-off offline">
                    <input type="number" min="1" value={form.autoMarkDeliveredHours} onChange={(e) => set("autoMarkDeliveredHours", Number(e.target.value))} />
                  </Field>
                  <Field label="Auto-fail After (days)">
                    <input type="number" min="1" value={form.autoFailAfterDays} onChange={(e) => set("autoFailAfterDays", Number(e.target.value))} />
                  </Field>
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto-reassign Failed Deliveries</span>
                  <Toggle on={form.autoReassignFailed} onChange={(v) => set("autoReassignFailed", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Sync Status with Orders</span>
                  <Toggle on={form.syncWithOrders} onChange={(v) => set("syncWithOrders", v)} />
                </div>
                <Field label="Webhook URL" hint="Optional endpoint for delivery status events">
                  <input
                    type="url"
                    placeholder="https://"
                    value={form.webhookUrl}
                    onChange={(e) => set("webhookUrl", e.target.value)}
                  />
                </Field>
                <Field label="Automation Timezone">
                  <select value={form.automationTimezone} onChange={(e) => set("automationTimezone", e.target.value)}>
                    {(opts.timezones || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
              </Section>
            </form>
          )}
        </div>

        <aside className="ptsset-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Live Snapshot</h2>
            <ul className="ptsset-summary">
              <li>
                <span className="ptsset-sum-ico green"><Icon name="pin" size={14} /></span>
                <div>
                  <span className="muted">Active zones</span>
                  <strong>{fmtNum(summary.activeZones)}</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico orange"><Icon name="users" size={14} /></span>
                <div>
                  <span className="muted">Online couriers</span>
                  <strong>{fmtNum(summary.onlineCouriers)}</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico gold"><Icon name="box" size={14} /></span>
                <div>
                  <span className="muted">Pending shipments</span>
                  <strong>{fmtNum(summary.pendingShipments)}</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico red"><Icon name="refresh" size={14} /></span>
                <div>
                  <span className="muted">Open returns</span>
                  <strong>{fmtNum(summary.openReturns)}</strong>
                </div>
              </li>
            </ul>
            <button className="link-reset ptsset-report" type="button" onClick={() => navigate("/delivery")}>
              View delivery overview →
            </button>
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
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/delivery?tab=shipments")}>
                <Icon name="box" size={14} /> Shipments
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/delivery?tab=couriers")}>
                <Icon name="users" size={14} /> Couriers
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/delivery?tab=zones")}>
                <Icon name="pin" size={14} /> Zones
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/delivery?tab=returns")}>
                <Icon name="refresh" size={14} /> Returns
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
    </div>
  );
}
