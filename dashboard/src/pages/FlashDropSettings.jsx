import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

const BANNER_FALLBACK =
  "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 45%, #7c3aed 100%)";

function Switch({ on, onClick }) {
  return (
    <button className={`pts-switch ${on ? "on" : ""}`} type="button" onClick={onClick} aria-pressed={on}>
      <i />
    </button>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="card pf-card fds-sec">
      <h2>
        <span className="fdf-num">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ToggleRow({ label, on, onToggle }) {
  return (
    <label className="ce-set-row fds-toggle">
      <span>{label}</span>
      <span className="ce-set-ctl">
        <Switch on={on} onClick={onToggle} />
        <strong className={on ? "fds-on" : "fds-off"}>{on ? "Enabled" : "Disabled"}</strong>
      </span>
    </label>
  );
}

export default function FlashDropSettings() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function load() {
    api("/admin/flash-drop-settings")
      .then((d) => {
        setSettings(d.settings || {});
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load settings."));
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  async function save(e) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api("/admin/flash-drop-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(d.settings || settings);
      setToast("Settings saved");
    } catch (err) {
      setError(err.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  async function resetDefaults() {
    setBusy(true);
    setError("");
    try {
      const d = await api("/admin/flash-drop-settings/reset", { method: "POST" });
      setSettings(d.settings || {});
      setToast("Settings reset to default");
    } catch (err) {
      setError(err.message || "Could not reset settings.");
    } finally {
      setBusy(false);
    }
  }

  function onBannerPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("bannerUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (!settings) {
    return (
      <div className="fd-page fds-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/flash-drops">Flash Drops</Link>
          <span>›</span>
          <strong>Drop Settings</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading settings…</p>}
      </div>
    );
  }

  return (
    <div className="fd-page fds-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Drop Settings</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Flash Drop Settings
            <span className="prod-title-icon"><Icon name="gear" size={16} /></span>
          </h1>
          <p>Configure global settings and rules for Flash Drops.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" disabled={busy} onClick={resetDefaults}>
            <Icon name="refresh" size={14} /> Reset to Default
          </button>
          <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={save}>
            <Icon name="save" size={14} /> Save Settings
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <form className="fds-grid" onSubmit={save}>
        <div className="fds-col">
          <Section n="1" title="General Settings">
            <ToggleRow label="Enable Flash Drops" on={settings.enableFlashDrops} onToggle={() => set("enableFlashDrops", !settings.enableFlashDrops)} />
            <ToggleRow label="Auto Start Flash Drops" on={settings.autoStart} onToggle={() => set("autoStart", !settings.autoStart)} />
            <ToggleRow label="Auto End Flash Drops" on={settings.autoEnd} onToggle={() => set("autoEnd", !settings.autoEnd)} />
            <ToggleRow label="Show Countdown Timer" on={settings.showCountdown} onToggle={() => set("showCountdown", !settings.showCountdown)} />
            <div className="fds-2">
              <label>
                Default Duration
                <select value={settings.defaultDuration} onChange={(e) => set("defaultDuration", e.target.value)}>
                  <option value="1h">1 Hour</option>
                  <option value="2h">2 Hours</option>
                  <option value="3h">3 Hours</option>
                  <option value="4h">4 Hours</option>
                  <option value="6h">6 Hours</option>
                  <option value="12h">12 Hours</option>
                </select>
              </label>
              <label>
                Minimum Duration
                <select value={settings.minDuration} onChange={(e) => set("minDuration", e.target.value)}>
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="45m">45 Minutes</option>
                  <option value="1h">1 Hour</option>
                </select>
              </label>
            </div>
            <div className="fds-2">
              <label>
                Maximum Duration
                <select value={settings.maxDuration} onChange={(e) => set("maxDuration", e.target.value)}>
                  <option value="12h">12 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="48h">48 Hours</option>
                  <option value="72h">72 Hours</option>
                </select>
              </label>
              <label>
                Buffer Time
                <div className="pts-prefix">
                  <input type="number" min="0" value={settings.bufferMinutes} onChange={(e) => set("bufferMinutes", Number(e.target.value))} />
                  <em>Minutes</em>
                </div>
              </label>
            </div>
            <div className="fds-2">
              <label>
                Timezone
                <select value={settings.timezone} onChange={(e) => set("timezone", e.target.value)}>
                  <option value="eat">East Africa Time</option>
                  <option value="utc">UTC</option>
                  <option value="gmt">GMT</option>
                </select>
              </label>
              <label>
                Refresh Interval
                <select value={settings.refreshInterval} onChange={(e) => set("refreshInterval", e.target.value)}>
                  <option value="5s">5 Seconds</option>
                  <option value="10s">10 Seconds</option>
                  <option value="15s">15 Seconds</option>
                  <option value="30s">30 Seconds</option>
                </select>
              </label>
            </div>
            <div className="fds-2">
              <label>
                Low Stock Threshold
                <input type="number" min="0" value={settings.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} />
              </label>
              <label>
                Sold Out Behavior
                <select value={settings.soldOutBehavior} onChange={(e) => set("soldOutBehavior", e.target.value)}>
                  <option value="hide">Hide from store</option>
                  <option value="show">Show as sold out</option>
                  <option value="end">End drop immediately</option>
                </select>
              </label>
            </div>
          </Section>

          <Section n="2" title="Inventory & Stock Rules">
            <ToggleRow label="Prevent Overselling" on={settings.preventOverselling} onToggle={() => set("preventOverselling", !settings.preventOverselling)} />
            <ToggleRow label="Reserve Stock at Start" on={settings.reserveStock} onToggle={() => set("reserveStock", !settings.reserveStock)} />
            <ToggleRow label="Allow Backorders" on={settings.allowBackorders} onToggle={() => set("allowBackorders", !settings.allowBackorders)} />
            <ToggleRow label="Multi-Channel Sync" on={settings.multiChannelSync} onToggle={() => set("multiChannelSync", !settings.multiChannelSync)} />
            <ToggleRow label="Restore Price on End" on={settings.restorePrice} onToggle={() => set("restorePrice", !settings.restorePrice)} />
            <div className="fds-2">
              <label>
                Minimum Stock to Start
                <input type="number" min="0" value={settings.minStockToStart} onChange={(e) => set("minStockToStart", Number(e.target.value))} />
              </label>
              <label>
                Stock Release on Cancel
                <select value={settings.stockReleaseOnCancel} onChange={(e) => set("stockReleaseOnCancel", e.target.value)}>
                  <option value="immediate">Immediately</option>
                  <option value="1h">After 1 hour</option>
                  <option value="24h">After 24 hours</option>
                </select>
              </label>
            </div>
            <label>
              Partial Stock End
              <select value={settings.partialStockEnd} onChange={(e) => set("partialStockEnd", e.target.value)}>
                <option value="zero">End drop when stock is 0</option>
                <option value="threshold">End at low stock threshold</option>
                <option value="continue">Continue until timer ends</option>
              </select>
            </label>
          </Section>

          <Section n="3" title="Discounts & Pricing Rules">
            <div className="fds-2">
              <label>
                Max Discount
                <div className="pts-prefix">
                  <input type="number" min="0" max="100" value={settings.maxDiscount} onChange={(e) => set("maxDiscount", Number(e.target.value))} />
                  <em>%</em>
                </div>
              </label>
              <label>
                Min Discount
                <div className="pts-prefix">
                  <input type="number" min="0" max="100" value={settings.minDiscount} onChange={(e) => set("minDiscount", Number(e.target.value))} />
                  <em>%</em>
                </div>
              </label>
            </div>
            <div className="fds-2">
              <label>
                Default Discount Type
                <select value={settings.discountType} onChange={(e) => set("discountType", e.target.value)}>
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Price</option>
                  <option value="voucher">Voucher Drop</option>
                </select>
              </label>
              <label>
                Price Rounding
                <select value={settings.priceRounding} onChange={(e) => set("priceRounding", e.target.value)}>
                  <option value="1">Round to nearest 1</option>
                  <option value="5">Round to nearest 5</option>
                  <option value="10">Round to nearest 10</option>
                  <option value="none">No rounding</option>
                </select>
              </label>
            </div>
            <label>
              Currency
              <select value={settings.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="KES">KES (KSh)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
            <ToggleRow label="Allow Free Products" on={settings.allowFreeProducts} onToggle={() => set("allowFreeProducts", !settings.allowFreeProducts)} />
            <ToggleRow label="Display Savings" on={settings.displaySavings} onToggle={() => set("displaySavings", !settings.displaySavings)} />
            <ToggleRow label="Tax on Discounted Price" on={settings.taxOnDiscounted} onToggle={() => set("taxOnDiscounted", !settings.taxOnDiscounted)} />
          </Section>

          <Section n="4" title="Participation & Customers">
            <div className="fds-2">
              <label>
                Limit Entries per User
                <input type="number" min="1" value={settings.limitEntries} onChange={(e) => set("limitEntries", Number(e.target.value))} />
              </label>
              <label>
                Points Multiplier
                <input type="number" min="1" step="0.5" value={settings.pointsMultiplier} onChange={(e) => set("pointsMultiplier", Number(e.target.value))} />
              </label>
            </div>
            <ToggleRow label="Require Login to Participate" on={settings.requireLogin} onToggle={() => set("requireLogin", !settings.requireLogin)} />
            <label>
              Award Points on Purchase
              <select value={settings.awardPoints} onChange={(e) => set("awardPoints", e.target.value)}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="winners">Winners only</option>
              </select>
            </label>
            <ToggleRow label="Block Multiple Accounts" on={settings.blockMultipleAccounts} onToggle={() => set("blockMultipleAccounts", !settings.blockMultipleAccounts)} />
            <ToggleRow label="Email Notifications" on={settings.emailNotifications} onToggle={() => set("emailNotifications", !settings.emailNotifications)} />
            <ToggleRow label="SMS Notifications" on={settings.smsNotifications} onToggle={() => set("smsNotifications", !settings.smsNotifications)} />
            <label>
              Winners Announcement
              <select value={settings.winnersAnnouncement} onChange={(e) => set("winnersAnnouncement", e.target.value)}>
                <option value="end">On Drop End</option>
                <option value="immediate">Immediately</option>
                <option value="manual">Manual</option>
              </select>
            </label>
          </Section>
        </div>

        <div className="fds-col">
          <Section n="5" title="Eligibility & Rules">
            <label>
              Flash Drop Eligibility
              <select value={settings.productEligibility} onChange={(e) => set("productEligibility", e.target.value)}>
                <option value="all">All Products</option>
                <option value="selected">Selected Products</option>
                <option value="category">By Category</option>
              </select>
            </label>
            <label>
              Category Eligibility
              <select value={settings.categoryEligibility} onChange={(e) => set("categoryEligibility", e.target.value)}>
                <option value="all">All Categories</option>
                <option value="networking">Networking</option>
                <option value="cctv">CCTV</option>
                <option value="gadgets">Gadgets</option>
              </select>
            </label>
            <label>
              Brand Eligibility
              <select value={settings.brandEligibility} onChange={(e) => set("brandEligibility", e.target.value)}>
                <option value="all">All Brands</option>
                <option value="tp-link">TP-Link</option>
                <option value="hikvision">Hikvision</option>
                <option value="d-link">D-Link</option>
              </select>
            </label>
            <ToggleRow label="Exclude Out of Stock" on={settings.excludeOutOfStock} onToggle={() => set("excludeOutOfStock", !settings.excludeOutOfStock)} />
            <ToggleRow label="Allow Same Product Multiple Times" on={settings.allowSameProductMultiple} onToggle={() => set("allowSameProductMultiple", !settings.allowSameProductMultiple)} />
            <div className="fds-2">
              <label>
                Max Active Drops
                <input type="number" min="1" value={settings.maxActiveDrops} onChange={(e) => set("maxActiveDrops", Number(e.target.value))} />
              </label>
              <label>
                Cool Down Period
                <div className="pts-prefix">
                  <input type="number" min="0" value={settings.cooldownHours} onChange={(e) => set("cooldownHours", Number(e.target.value))} />
                  <em>Hours</em>
                </div>
              </label>
            </div>
            <label>
              Geographic Restrictions
              <select value={settings.geoRestrictions} onChange={(e) => set("geoRestrictions", e.target.value)}>
                <option value="all">All Countries</option>
                <option value="kenya">Kenya only</option>
                <option value="east-africa">East Africa</option>
              </select>
            </label>
          </Section>

          <Section n="6" title="Display & Communication">
            <label>Default Banner Image</label>
            <div className="fds-banner">
              {settings.bannerUrl ? (
                <img src={settings.bannerUrl} alt="Flash drop banner preview" />
              ) : (
                <div className="fds-banner-fallback" style={{ background: BANNER_FALLBACK }}>
                  <span>FLASH DEALS</span>
                </div>
              )}
              <button className="link-reset fds-banner-btn" type="button" onClick={() => fileRef.current?.click()}>
                Change Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onBannerPick} />
              <p className="muted fds-banner-hint">Recommended 1920×600px</p>
            </div>
            <ToggleRow label="Show on Homepage" on={settings.showHomepage} onToggle={() => set("showHomepage", !settings.showHomepage)} />
            <ToggleRow label="Show on Category Page" on={settings.showCategoryPage} onToggle={() => set("showCategoryPage", !settings.showCategoryPage)} />
            <ToggleRow label="Show Savings Badge" on={settings.showSavingsBadge} onToggle={() => set("showSavingsBadge", !settings.showSavingsBadge)} />
            <label>
              Default Flash Drop Badge
              <input value={settings.badgeText} onChange={(e) => set("badgeText", e.target.value)} />
            </label>
            <label>
              Badge Color
              <div className="fds-color">
                <input type="color" value={settings.badgeColor} onChange={(e) => set("badgeColor", e.target.value)} />
                <input value={settings.badgeColor} onChange={(e) => set("badgeColor", e.target.value)} />
                <span className="fds-color-swatch" style={{ background: settings.badgeColor }} />
              </div>
            </label>
          </Section>

          <Section n="7" title="System & Safety">
            <ToggleRow label="High Traffic Protection" on={settings.highTrafficProtection} onToggle={() => set("highTrafficProtection", !settings.highTrafficProtection)} />
            <label>
              Rate Limiting
              <select value={settings.rateLimiting} onChange={(e) => set("rateLimiting", e.target.value)}>
                <option value="strict">Strict</option>
                <option value="moderate">Moderate</option>
                <option value="relaxed">Relaxed</option>
                <option value="off">Off</option>
              </select>
            </label>
            <ToggleRow label="Activity Log" on={settings.activityLog} onToggle={() => set("activityLog", !settings.activityLog)} />
            <ToggleRow label="Admin Approval Required" on={settings.adminApproval} onToggle={() => set("adminApproval", !settings.adminApproval)} />
            <ToggleRow label="Maintenance Mode" on={settings.maintenanceMode} onToggle={() => set("maintenanceMode", !settings.maintenanceMode)} />
            <ToggleRow label="Auto Cleanup Completed Drops" on={settings.autoCleanup} onToggle={() => set("autoCleanup", !settings.autoCleanup)} />
            {settings.autoCleanup && (
              <label>
                Auto Cleanup After
                <div className="pts-prefix">
                  <input type="number" min="1" value={settings.cleanupDays} onChange={(e) => set("cleanupDays", Number(e.target.value))} />
                  <em>Days</em>
                </div>
              </label>
            )}
          </Section>
        </div>
      </form>

      <section className="pts-alert fd-banner fds-foot">
        <Icon name="info" size={18} />
        <p>These settings apply globally to all Flash Drops. Individual drops can have specific settings during creation.</p>
      </section>
    </div>
  );
}
