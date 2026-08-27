import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "general", label: "General Settings" },
  { id: "security", label: "Security Settings" },
  { id: "notifications", label: "Notifications" },
  { id: "integrations", label: "Integrations" },
  { id: "payment", label: "Payment Settings" },
  { id: "email", label: "Email Settings" },
  { id: "advanced", label: "Advanced Settings" },
  { id: "tools", label: "System Tools" },
];

function Switch({ on, onClick }) {
  return (
    <button className={`pts-switch ${on ? "on" : ""}`} type="button" onClick={onClick} aria-pressed={on}>
      <i />
    </button>
  );
}

function Card({ icon, title, children, className = "" }) {
  return (
    <section className={`card pf-card fdss-card ${className}`}>
      <h2>
        {icon ? <Icon name={icon} size={14} /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="fdss-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({ label, on, onToggle }) {
  return (
    <label className="ce-set-row fdss-toggle">
      <span>{label}</span>
      <span className="ce-set-ctl">
        <Switch on={on} onClick={onToggle} />
        <strong className={on ? "fds-on" : "fds-off"}>{on ? "Enabled" : "Disabled"}</strong>
      </span>
    </label>
  );
}

function InfoRow({ label, value, status }) {
  return (
    <div className="fdss-info-row">
      <span>{label}</span>
      {status ? (
        <span className="fdss-status">
          <i className="fdss-status-dot" />
          {value}
        </span>
      ) : (
        <strong>{value}</strong>
      )}
    </div>
  );
}

function roleCls(key) {
  if (key === "super_admin") return "fdl-role-super";
  if (key === "admin") return "fdl-role-admin";
  if (key === "manager") return "fdl-role-mgr";
  return "fdl-role-sys";
}

function SiteInformation({ s, set }) {
  return (
    <Card icon="home" title="Site Information">
      <Field label="Site Name">
        <input value={s.siteName || ""} onChange={(e) => set("siteName", e.target.value)} />
      </Field>
      <Field label="Site Tagline">
        <input value={s.siteTagline || ""} onChange={(e) => set("siteTagline", e.target.value)} />
      </Field>
      <Field label="Site Email">
        <input type="email" value={s.siteEmail || ""} onChange={(e) => set("siteEmail", e.target.value)} />
      </Field>
      <Field label="Site Phone">
        <input value={s.sitePhone || ""} onChange={(e) => set("sitePhone", e.target.value)} />
      </Field>
      <Field label="Site Currency">
        <select value={s.siteCurrency || "KES"} onChange={(e) => set("siteCurrency", e.target.value)}>
          <option value="KES">KES — Kenyan Shilling</option>
          <option value="USD">USD — US Dollar</option>
        </select>
      </Field>
      <Field label="Timezone">
        <select value={s.timezone || ""} onChange={(e) => set("timezone", e.target.value)}>
          <option value="GMT +03:00 East Africa Time">GMT +03:00 East Africa Time</option>
          <option value="GMT +00:00 UTC">GMT +00:00 UTC</option>
        </select>
      </Field>
      <Field label="Date Format">
        <select value={s.dateFormat || "DD/MM/YYYY"} onChange={(e) => set("dateFormat", e.target.value)}>
          <option>DD/MM/YYYY</option>
          <option>MM/DD/YYYY</option>
          <option>YYYY-MM-DD</option>
        </select>
      </Field>
      <Field label="Time Format">
        <select value={s.timeFormat || "12 Hour"} onChange={(e) => set("timeFormat", e.target.value)}>
          <option>12 Hour</option>
          <option>24 Hour</option>
        </select>
      </Field>
      <Field label="Items Per Page">
        <input type="number" min="5" value={s.itemsPerPage ?? 20} onChange={(e) => set("itemsPerPage", Number(e.target.value))} />
      </Field>
      <Field label="Default Language">
        <select value={s.defaultLanguage || "English"} onChange={(e) => set("defaultLanguage", e.target.value)}>
          <option>English</option>
          <option>Swahili</option>
        </select>
      </Field>
    </Card>
  );
}

function FlashDropDefaults({ s, set }) {
  return (
    <Card icon="bolt" title="Flash Drop Defaults">
      <Field label="Default Discount Type">
        <select value={s.discountType || "percentage"} onChange={(e) => set("discountType", e.target.value)}>
          <option value="percentage">Percentage Discount</option>
          <option value="fixed">Fixed Amount</option>
        </select>
      </Field>
      <Field label="Default Discount Value (%)">
        <input type="number" min="0" max="100" value={s.defaultDiscount ?? 20} onChange={(e) => set("defaultDiscount", Number(e.target.value))} />
      </Field>
      <Field label="Default Drop Duration">
        <select value={s.defaultDuration || "2h"} onChange={(e) => set("defaultDuration", e.target.value)}>
          <option value="1h">1 Hour</option>
          <option value="2h">2 Hours</option>
          <option value="3h">3 Hours</option>
          <option value="6h">6 Hours</option>
          <option value="24h">24 Hours</option>
        </select>
      </Field>
      <Field label="Buffer Time">
        <select value={String(s.bufferMinutes ?? 5)} onChange={(e) => set("bufferMinutes", Number(e.target.value))}>
          <option value="5">5 Minutes</option>
          <option value="10">10 Minutes</option>
          <option value="15">15 Minutes</option>
        </select>
      </Field>
      <ToggleRow label="Auto Start Flash Drops" on={!!s.autoStart} onToggle={() => set("autoStart", !s.autoStart)} />
      <ToggleRow label="Show Countdown Timer" on={!!s.showCountdown} onToggle={() => set("showCountdown", !s.showCountdown)} />
      <Field label="Sold Out Behavior">
        <select value={s.soldOutBehavior || "hide"} onChange={(e) => set("soldOutBehavior", e.target.value)}>
          <option value="hide">Hide from store</option>
          <option value="show">Show as sold out</option>
        </select>
      </Field>
      <Field label="Low Stock Threshold">
        <input type="number" min="0" value={s.lowStockThreshold ?? 5} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} />
      </Field>
    </Card>
  );
}

function DisplaySettings({ s, set }) {
  return (
    <Card icon="grid" title="Display Settings">
      <Field label="Theme">
        <select value={s.theme || "light"} onChange={(e) => set("theme", e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </Field>
      <Field label="Primary Color">
        <div className="fds-color">
          <input type="color" value={s.primaryColor || "#6C5DD3"} onChange={(e) => set("primaryColor", e.target.value)} />
          <input type="text" value={s.primaryColor || "#6C5DD3"} onChange={(e) => set("primaryColor", e.target.value)} />
          <span className="fds-color-swatch" style={{ background: s.primaryColor || "#6C5DD3" }} />
        </div>
      </Field>
      <div className="fdss-2">
        <Field label="Items Per Row (Desktop)">
          <input type="number" min="1" max="6" value={s.desktopCols ?? 4} onChange={(e) => set("desktopCols", Number(e.target.value))} />
        </Field>
        <Field label="Items Per Row (Mobile)">
          <input type="number" min="1" max="4" value={s.mobileCols ?? 2} onChange={(e) => set("mobileCols", Number(e.target.value))} />
        </Field>
      </div>
      <ToggleRow label="Show Discount Badge" on={!!s.showDiscountBadge} onToggle={() => set("showDiscountBadge", !s.showDiscountBadge)} />
      <ToggleRow label="Show Savings Amount" on={!!s.showSavingsAmount} onToggle={() => set("showSavingsAmount", !s.showSavingsAmount)} />
      <ToggleRow label="Enable Product Quick View" on={!!s.enableQuickView} onToggle={() => set("enableQuickView", !s.enableQuickView)} />
      <ToggleRow label="Show Related Products" on={!!s.showRelatedProducts} onToggle={() => set("showRelatedProducts", !s.showRelatedProducts)} />
    </Card>
  );
}

function SystemInformation({ info }) {
  const i = info || {};
  return (
    <Card icon="info" title="System Information">
      <InfoRow label="Version" value={i.version || "v2.4.1"} />
      <InfoRow label="Environment" value={i.environment || "Production"} />
      <InfoRow label="PHP Version" value={i.php || "8.2.12"} />
      <InfoRow label="Laravel Version" value={i.laravel || "10.48.7"} />
      <InfoRow label="Database" value={i.mysql ? `MySQL ${i.mysql}` : "MySQL 8.0"} />
      <InfoRow label="Server Time" value={i.serverTime || "—"} />
      <InfoRow label="Server Uptime" value={i.uptime || "—"} />
      <InfoRow label="System Status" value="Healthy" status />
    </Card>
  );
}

function InventorySettings({ s, set }) {
  return (
    <Card icon="box" title="Inventory Settings">
      <ToggleRow label="Prevent Overselling" on={!!s.preventOverselling} onToggle={() => set("preventOverselling", !s.preventOverselling)} />
      <ToggleRow label="Reserve Stock at Start" on={!!s.reserveStock} onToggle={() => set("reserveStock", !s.reserveStock)} />
      <ToggleRow label="Allow Backorders" on={!!s.allowBackorders} onToggle={() => set("allowBackorders", !s.allowBackorders)} />
      <ToggleRow label="Restore Price on End" on={!!s.restorePrice} onToggle={() => set("restorePrice", !s.restorePrice)} />
      <Field label="Minimum Stock to Start">
        <input type="number" min="0" value={s.minStockToStart ?? 1} onChange={(e) => set("minStockToStart", Number(e.target.value))} />
      </Field>
      <Field label="Stock Release on Cancel">
        <select value={s.stockReleaseOnCancel || "immediate"} onChange={(e) => set("stockReleaseOnCancel", e.target.value)}>
          <option value="immediate">Immediately</option>
          <option value="manual">Manual release</option>
        </select>
      </Field>
    </Card>
  );
}

function PricingDiscounts({ s, set }) {
  return (
    <Card icon="tag" title="Pricing & Discounts">
      <div className="fdss-2">
        <Field label="Maximum Discount Allowed (%)">
          <input type="number" min="0" max="100" value={s.maxDiscount ?? 70} onChange={(e) => set("maxDiscount", Number(e.target.value))} />
        </Field>
        <Field label="Minimum Discount Allowed (%)">
          <input type="number" min="0" max="100" value={s.minDiscount ?? 5} onChange={(e) => set("minDiscount", Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Price Rounding">
        <select value={s.priceRounding || "1"} onChange={(e) => set("priceRounding", e.target.value)}>
          <option value="1">Round to nearest 1</option>
          <option value="5">Round to nearest 5</option>
          <option value="10">Round to nearest 10</option>
        </select>
      </Field>
      <ToggleRow label="Allow Free Products" on={!!s.allowFreeProducts} onToggle={() => set("allowFreeProducts", !s.allowFreeProducts)} />
      <ToggleRow label="Tax on Discounted Price" on={!!s.taxOnDiscounted} onToggle={() => set("taxOnDiscounted", !s.taxOnDiscounted)} />
    </Card>
  );
}

function NotificationsCard({ s, set }) {
  return (
    <Card icon="bell" title="Notifications">
      <ToggleRow label="Admin Notifications" on={!!s.adminNotifications} onToggle={() => set("adminNotifications", !s.adminNotifications)} />
      <ToggleRow label="Low Stock Alerts" on={!!s.lowStockAlerts} onToggle={() => set("lowStockAlerts", !s.lowStockAlerts)} />
      <ToggleRow label="Participant Notifications" on={!!s.participantNotifications} onToggle={() => set("participantNotifications", !s.participantNotifications)} />
      <Field label="Winners Announcement">
        <select value={s.winnersAnnouncement || "end"} onChange={(e) => set("winnersAnnouncement", e.target.value)}>
          <option value="end">On Drop End</option>
          <option value="immediate">Immediately</option>
          <option value="manual">Manual</option>
        </select>
      </Field>
    </Card>
  );
}

function OtherSettings({ s, set }) {
  return (
    <Card icon="star" title="Other Settings">
      <ToggleRow label="Enable Points on Flash Drops" on={!!s.enablePoints} onToggle={() => set("enablePoints", !s.enablePoints)} />
      <Field label="Points Multiplier">
        <input type="number" min="1" step="0.5" value={s.pointsMultiplier ?? 2} onChange={(e) => set("pointsMultiplier", Number(e.target.value))} />
      </Field>
      <Field label="Max Entries per User">
        <input type="number" min="1" value={s.limitEntries ?? 5} onChange={(e) => set("limitEntries", Number(e.target.value))} />
      </Field>
      <ToggleRow label="Require Login to Participate" on={!!s.requireLogin} onToggle={() => set("requireLogin", !s.requireLogin)} />
    </Card>
  );
}

function MaintenanceMode({ s, set, onSave, busy }) {
  return (
    <Card icon="shield" title="Maintenance Mode">
      <ToggleRow label="Enable Maintenance Mode" on={!!s.maintenanceMode} onToggle={() => set("maintenanceMode", !s.maintenanceMode)} />
      <Field label="Maintenance Message">
        <textarea rows={3} value={s.maintenanceMessage || ""} onChange={(e) => set("maintenanceMessage", e.target.value)} />
      </Field>
      <button className="btn btn-purple btn-small fdss-maint-btn" type="button" disabled={busy} onClick={onSave}>
        Save Maintenance Settings
      </button>
    </Card>
  );
}

function CacheManagement({ caches, onClear, onClearAll }) {
  const list = caches || ["Application", "Config", "Route", "View"];
  return (
    <Card icon="refresh" title="Cache Management">
      <ul className="fdss-cache-list">
        {list.map((name) => (
          <li key={name}>
            <span>{name} Cache</span>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onClear(name)}>
              Clear
            </button>
          </li>
        ))}
      </ul>
      <button className="fdss-clear-all" type="button" onClick={onClearAll}>
        Clear All
      </button>
    </Card>
  );
}

function BackupRestore({ onBackup, onRestore }) {
  return (
    <Card icon="download" title="Backup & Restore">
      <div className="fdss-backup-btns">
        <button className="btn btn-purple" type="button" onClick={onBackup}>
          <Icon name="download" size={14} /> Download Backup
        </button>
        <button className="btn btn-ghost" type="button" onClick={onRestore}>
          <Icon name="upload" size={14} /> Restore Settings
        </button>
      </div>
    </Card>
  );
}

function ActivityLog({ rows }) {
  return (
    <section className="card pf-card fdss-activity">
      <h2>
        <Icon name="list" size={14} />
        Activity Log (Settings Changes)
      </h2>
      <div className="table-wrap">
        <table className="data-table fdss-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Changed By</th>
              <th>Section</th>
              <th>Setting</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Date &amp; Time</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id}>
                <td>{r.n}</td>
                <td>
                  <div className="fdl-user fdss-changed-by">
                    <span>
                      <strong>{r.userName}</strong>
                      <span className={`fdl-role ${roleCls(r.roleKey)}`}>{r.userRole}</span>
                    </span>
                  </div>
                </td>
                <td>{r.section}</td>
                <td>{r.setting}</td>
                <td className="fdss-old">{r.oldValue}</td>
                <td className="fdss-new">{r.newValue}</td>
                <td className="fdl-when">{r.atLabel}</td>
                <td>{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GeneralGrid(props) {
  const { s, set, info, caches, activity, onMaintSave, onClearCache, onClearAllCache, onBackup, onRestore, busy } = props;
  return (
    <>
      <div className="fdss-grid-4">
        <div className="fdss-col">
          <SiteInformation s={s} set={set} />
          <InventorySettings s={s} set={set} />
        </div>
        <div className="fdss-col">
          <FlashDropDefaults s={s} set={set} />
          <PricingDiscounts s={s} set={set} />
        </div>
        <div className="fdss-col">
          <DisplaySettings s={s} set={set} />
          <NotificationsCard s={s} set={set} />
          <OtherSettings s={s} set={set} />
        </div>
        <div className="fdss-col">
          <SystemInformation info={info} />
          <MaintenanceMode s={s} set={set} onSave={onMaintSave} busy={busy} />
          <CacheManagement caches={caches} onClear={onClearCache} onClearAll={onClearAllCache} />
          <BackupRestore onBackup={onBackup} onRestore={onRestore} />
        </div>
      </div>
      <ActivityLog rows={activity} />
    </>
  );
}

export default function FlashDropSystemSettings() {
  const [settings, setSettings] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [activity, setActivity] = useState([]);
  const [caches, setCaches] = useState([]);
  const [tab, setTab] = useState("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function load() {
    api("/admin/flash-drop-system-settings")
      .then((d) => {
        setSettings(d.settings || {});
        setSystemInfo(d.systemInfo || {});
        setActivity(d.activity || []);
        setCaches(d.caches || []);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load system settings."));
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveAll(e) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api("/admin/flash-drop-system-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(d.settings || settings);
      setActivity(d.activity || activity);
      setToast("All settings saved successfully");
    } catch (err) {
      setError(err.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMaintenance() {
    setBusy(true);
    try {
      const d = await api("/admin/flash-drop-system-settings", {
        method: "PUT",
        body: JSON.stringify({
          maintenanceMode: settings.maintenanceMode,
          maintenanceMessage: settings.maintenanceMessage,
        }),
      });
      setSettings((s) => ({ ...s, ...d.settings }));
      setToast("Maintenance settings saved");
    } catch (err) {
      setError(err.message || "Could not save maintenance settings.");
    } finally {
      setBusy(false);
    }
  }

  function clearCache(name) {
    setToast(`${name} cache cleared`);
  }

  function clearAllCache() {
    setToast("All caches cleared");
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netza-flash-drop-settings-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Backup downloaded");
  }

  function restoreSettings() {
    setToast("Restore settings — upload a backup file from your device");
  }

  const shared = {
    s: settings,
    set,
    info: systemInfo,
    caches,
    activity,
    onMaintSave: saveMaintenance,
    onClearCache: clearCache,
    onClearAllCache: clearAllCache,
    onBackup: downloadBackup,
    onRestore: restoreSettings,
    busy,
  };

  if (!settings) {
    return (
      <div className="fd-page fdss-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/flash-drops">Flash Drops</Link>
          <span>›</span>
          <strong>System Settings</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading system settings…</p>}
      </div>
    );
  }

  return (
    <div className="fd-page fdss-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>System Settings</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            System Settings
            <span className="prod-title-icon purple"><Icon name="gear" size={16} /></span>
          </h1>
          <p>Manage global system configuration and preferences.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-purple" type="button" disabled={busy} onClick={saveAll}>
            Save All Settings
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <div className="pf-tabs fdss-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralGrid {...shared} />}

      {tab === "security" && (
        <div className="fdss-grid-4">
          <MaintenanceMode s={settings} set={set} onSave={saveMaintenance} busy={busy} />
          <SystemInformation info={systemInfo} />
        </div>
      )}

      {tab === "notifications" && (
        <div className="fdss-grid-4">
          <NotificationsCard s={settings} set={set} />
        </div>
      )}

      {tab === "integrations" && (
        <section className="card pf-card fdss-card">
          <h2><Icon name="link" size={14} /> Integrations</h2>
          <p className="muted fdss-stub">Connect M-Pesa, SMS gateways, and third-party services for Flash Drops.</p>
        </section>
      )}

      {tab === "payment" && (
        <div className="fdss-grid-4">
          <PricingDiscounts s={settings} set={set} />
        </div>
      )}

      {tab === "email" && (
        <div className="fdss-grid-4">
          <SiteInformation s={settings} set={set} />
        </div>
      )}

      {tab === "advanced" && (
        <div className="fdss-grid-4">
          <CacheManagement caches={caches} onClear={clearCache} onClearAll={clearAllCache} />
          <BackupRestore onBackup={downloadBackup} onRestore={restoreSettings} />
        </div>
      )}

      {tab === "tools" && (
        <div className="fdss-grid-4">
          <SystemInformation info={systemInfo} />
          <CacheManagement caches={caches} onClear={clearCache} onClearAll={clearAllCache} />
          <BackupRestore onBackup={downloadBackup} onRestore={restoreSettings} />
        </div>
      )}

      {tab !== "general" && <ActivityLog rows={activity} />}

      <footer className="card pf-card fdss-foot">
        <p>
          <Icon name="info" size={14} />
          <strong>Tip:</strong> Settings are applied globally to all Flash Drops. Changes may take up to 5 minutes to reflect on the frontend.
        </p>
      </footer>
    </div>
  );
}
