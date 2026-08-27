import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "general", label: "General Settings" },
  { id: "earning", label: "Earning Rules" },
  { id: "redemption", label: "Redemption Rules" },
  { id: "expiry", label: "Expiry Settings" },
  { id: "notifications", label: "Notifications" },
  { id: "fraud", label: "Fraud & Limits" },
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

export default function PointsSettings() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState("general");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  function load() {
    api("/admin/points-settings")
      .then((d) => {
        setData(d);
        setForm({ ...d.settings });
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load settings."));
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
      const res = await api("/admin/points-settings", {
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

  if (!data || !form) {
    return (
      <div className="ptsset-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/points">Points & Rewards</Link>
          <span>›</span>
          <strong>Settings</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading settings…</p>}
      </div>
    );
  }

  const opts = data.options || {};
  const summary = data.summary || {};
  const info = data.programInfo || {};

  return (
    <div className="ptsset-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/points">Points & Rewards</Link>
        <span>›</span>
        <strong>Settings</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid"><Icon name="gear" size={16} /></span>
            Points & Rewards Settings
          </h1>
          <p>Configure how points are earned, redeemed and managed in the system.</p>
        </div>
        <div className="prod-actions">
          <button
            className="btn btn-ghost btn-small ptsset-preview"
            type="button"
            onClick={() => setToast("Member preview opened")}
          >
            <Icon name="eye" size={14} /> Preview Member View
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
          {tab === "general" ? (
            <form className="ptsset-form" onSubmit={save}>
              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="gear" size={14} /></span>
                  <div>
                    <h2>General Configuration</h2>
                    <p className="muted">Set the basic configuration for the loyalty program.</p>
                  </div>
                </header>

                <div className="ptsset-row">
                  <span className="ptsset-label">Enable Points & Rewards</span>
                  <Toggle on={form.enabled} onChange={(v) => set("enabled", v)} />
                </div>

                <Field label="Program Name">
                  <input value={form.programName} onChange={(e) => set("programName", e.target.value)} />
                </Field>

                <Field label="Program Description">
                  <textarea
                    rows={3}
                    value={form.programDescription}
                    onChange={(e) => set("programDescription", e.target.value)}
                  />
                </Field>

                <div className="ptsset-grid-2">
                  <Field label="Points Name (Singular)">
                    <input value={form.pointsSingular} onChange={(e) => set("pointsSingular", e.target.value)} />
                  </Field>
                  <Field label="Points Name (Plural)">
                    <input value={form.pointsPlural} onChange={(e) => set("pointsPlural", e.target.value)} />
                  </Field>
                </div>

                <Field label="Points Symbol" hint="Example: pts, P, Points">
                  <div className="ptsset-symbol">
                    <span className="ptsset-symbol-ico"><Icon name="star" size={14} /></span>
                    <input value={form.pointsSymbol} onChange={(e) => set("pointsSymbol", e.target.value)} />
                  </div>
                </Field>
              </section>

              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="calculator" size={14} /></span>
                  <div>
                    <h2>Points Calculation</h2>
                    <p className="muted">Configure how points are calculated and rounded.</p>
                  </div>
                </header>

                <Field label="Points Earning Type">
                  <select value={form.earningType} onChange={(e) => set("earningType", e.target.value)}>
                    {(opts.earningTypes || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>

                <div className="ptsset-grid-2">
                  <Field label="Points per KES Spent" hint="Earn 10 points for every KES 100 spent">
                    <input type="number" min="0" value={form.pointsPerKes} onChange={(e) => set("pointsPerKes", Number(e.target.value))} />
                  </Field>
                  <Field label="Minimum Order Amount (KES)" hint="Minimum amount to earn points">
                    <input type="number" min="0" value={form.minOrderKes} onChange={(e) => set("minOrderKes", Number(e.target.value))} />
                  </Field>
                </div>

                <Field label="Rounding Rule">
                  <select value={form.roundingRule} onChange={(e) => set("roundingRule", e.target.value)}>
                    {(opts.roundingRules || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>

                <div className="ptsset-grid-2">
                  <Field label="Maximum Points per Order" hint="Cap points earned per order">
                    <input type="number" min="0" value={form.maxPointsPerOrder} onChange={(e) => set("maxPointsPerOrder", Number(e.target.value))} />
                  </Field>
                  <Field label="Bonus Points on Signup" hint="Points awarded on new registration">
                    <input type="number" min="0" value={form.signupBonus} onChange={(e) => set("signupBonus", Number(e.target.value))} />
                  </Field>
                </div>
              </section>

              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="sliders" size={14} /></span>
                  <div>
                    <h2>Other Settings</h2>
                    <p className="muted">Additional program preferences.</p>
                  </div>
                </header>

                <div className="ptsset-row">
                  <span className="ptsset-label">Allow Points Redemption</span>
                  <Toggle on={form.allowRedemption} onChange={(v) => set("allowRedemption", v)} />
                </div>

                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Partial Redemption</span>
                    <small className="muted">Allow members to use partial points</small>
                  </div>
                  <Toggle on={form.partialRedemption} onChange={(v) => set("partialRedemption", v)} />
                </div>

                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Combine with Discounts</span>
                    <small className="muted">Allow points with other discounts</small>
                  </div>
                  <Toggle on={form.combineWithDiscounts} onChange={(v) => set("combineWithDiscounts", v)} />
                </div>

                <div className="ptsset-grid-2">
                  <Field label="Tax on Rewards">
                    <select value={form.taxOnRewards} onChange={(e) => set("taxOnRewards", e.target.value)}>
                      {(opts.taxOptions || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Default Reward Delivery">
                    <select value={form.defaultDelivery} onChange={(e) => set("defaultDelivery", e.target.value)}>
                      {(opts.deliveryOptions || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="ptsset-status-row">
                  <span className="ptsset-label">Loyalty Program Status</span>
                  <div className="ptsset-status">
                    <span className={`st-pill ${form.programActive ? "ptsset-st-active" : "ptsset-st-inactive"}`}>
                      {form.programActive ? "Active" : "Inactive"}
                    </span>
                    <span className="muted">
                      {form.programActive ? "Program is currently active" : "Program is currently inactive"}
                    </span>
                  </div>
                </div>
              </section>
            </form>
          ) : tab === "earning" ? (
            <form className="ptsset-form" onSubmit={save}>
              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="star" size={14} /></span>
                  <div>
                    <h2>Earning Rules</h2>
                    <p className="muted">Choose which events award points and how bonuses work.</p>
                  </div>
                </header>

                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Earn on Purchase</span>
                    <small className="muted">Award points when an order is paid</small>
                  </div>
                  <Toggle on={form.earnOnPurchase} onChange={(v) => set("earnOnPurchase", v)} />
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Earn on Signup</span>
                    <small className="muted">Welcome bonus for new accounts</small>
                  </div>
                  <Toggle on={form.earnOnSignup} onChange={(v) => set("earnOnSignup", v)} />
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Earn on Referral</span>
                    <small className="muted">Reward both referrer and friend</small>
                  </div>
                  <Toggle on={form.earnOnReferral} onChange={(v) => set("earnOnReferral", v)} />
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Earn on Product Review</span>
                    <small className="muted">Bonus when a review is approved</small>
                  </div>
                  <Toggle on={form.earnOnReview} onChange={(v) => set("earnOnReview", v)} />
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Birthday Bonus</span>
                    <small className="muted">Annual birthday points</small>
                  </div>
                  <Toggle on={form.earnOnBirthday} onChange={(v) => set("earnOnBirthday", v)} />
                </div>
              </section>

              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="gift" size={14} /></span>
                  <div>
                    <h2>Bonus Amounts</h2>
                    <p className="muted">Fixed point bonuses for non-purchase events.</p>
                  </div>
                </header>
                <div className="ptsset-grid-2">
                  <Field label="Review Bonus (pts)">
                    <input type="number" min="0" value={form.reviewBonus} onChange={(e) => set("reviewBonus", Number(e.target.value))} />
                  </Field>
                  <Field label="Birthday Bonus (pts)">
                    <input type="number" min="0" value={form.birthdayBonus} onChange={(e) => set("birthdayBonus", Number(e.target.value))} />
                  </Field>
                  <Field label="Referral Bonus — Referrer (pts)">
                    <input type="number" min="0" value={form.referralBonusReferrer} onChange={(e) => set("referralBonusReferrer", Number(e.target.value))} />
                  </Field>
                  <Field label="Referral Bonus — Friend (pts)">
                    <input type="number" min="0" value={form.referralBonusFriend} onChange={(e) => set("referralBonusFriend", Number(e.target.value))} />
                  </Field>
                </div>
              </section>

              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="sliders" size={14} /></span>
                  <div>
                    <h2>Earning Conditions</h2>
                    <p className="muted">Control when and how purchase points are credited.</p>
                  </div>
                </header>
                <Field label="Credit Delay (days)" hint="0 = credit immediately after payment">
                  <input type="number" min="0" value={form.earnDelayDays} onChange={(e) => set("earnDelayDays", Number(e.target.value))} />
                </Field>
                <div className="ptsset-row">
                  <span className="ptsset-label">Exclude Discounted Items</span>
                  <Toggle on={form.excludeDiscountedItems} onChange={(v) => set("excludeDiscountedItems", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Exclude Shipping Fees</span>
                  <Toggle on={form.excludeShipping} onChange={(v) => set("excludeShipping", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Stack with Promotions</span>
                  <Toggle on={form.stackWithPromotions} onChange={(v) => set("stackWithPromotions", v)} />
                </div>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=rules")}>
                  Manage detailed earn rules →
                </button>
              </section>
            </form>
          ) : tab === "redemption" ? (
            <form className="ptsset-form" onSubmit={save}>
              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="exchange" size={14} /></span>
                  <div>
                    <h2>Redemption Rules</h2>
                    <p className="muted">Control how members spend points at checkout and on rewards.</p>
                  </div>
                </header>
                <div className="ptsset-grid-2">
                  <Field label="Minimum Points to Redeem">
                    <input type="number" min="0" value={form.minRedeemPoints} onChange={(e) => set("minRedeemPoints", Number(e.target.value))} />
                  </Field>
                  <Field label="Max Order Coverage (%)" hint="Share of cart that points can cover">
                    <input type="number" min="0" max="100" value={form.maxRedeemPercent} onChange={(e) => set("maxRedeemPercent", Number(e.target.value))} />
                  </Field>
                  <Field label="Redeem Increment (pts)">
                    <input type="number" min="1" value={form.redeemIncrement} onChange={(e) => set("redeemIncrement", Number(e.target.value))} />
                  </Field>
                  <Field label="Points → KES Rate" hint="How many points equal KES 1">
                    <input type="number" min="0" step="0.1" value={form.pointsToKesRate} onChange={(e) => set("pointsToKesRate", Number(e.target.value))} />
                  </Field>
                </div>
                <Field label="Cooldownemption Cooldown (hours)" hint="0 = no cooldown between redemptions">
                  <input type="number" min="0" value={form.redeemCooldownHours} onChange={(e) => set("redeemCooldownHours", Number(e.target.value))} />
                </Field>
              </section>

              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="shield" size={14} /></span>
                  <div>
                    <h2>Checkout Options</h2>
                    <p className="muted">Rules applied when redeeming at checkout.</p>
                  </div>
                </header>
                <div className="ptsset-row">
                  <span className="ptsset-label">Require Login to Redeem</span>
                  <Toggle on={form.requireLoginToRedeem} onChange={(v) => set("requireLoginToRedeem", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Block Redeem on Sale Items</span>
                  <Toggle on={form.blockRedeemOnSaleItems} onChange={(v) => set("blockRedeemOnSaleItems", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto-apply Best Redemption</span>
                  <Toggle on={form.autoApplyBestRedeem} onChange={(v) => set("autoApplyBestRedeem", v)} />
                </div>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=redeem")}>
                  Manage redeem rewards catalog →
                </button>
              </section>
            </form>
          ) : tab === "expiry" ? (
            <form className="ptsset-form" onSubmit={save}>
              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="clock" size={14} /></span>
                  <div>
                    <h2>Expiry Settings</h2>
                    <p className="muted">Configure when unused points expire and how members are warned.</p>
                  </div>
                </header>
                <div className="ptsset-row">
                  <span className="ptsset-label">Enable Points Expiry</span>
                  <Toggle on={form.pointsExpire} onChange={(v) => set("pointsExpire", v)} />
                </div>
                <div className="ptsset-grid-2">
                  <Field label="Expiry Period (months)">
                    <input type="number" min="1" value={form.expiryMonths} onChange={(e) => set("expiryMonths", Number(e.target.value))} disabled={!form.pointsExpire} />
                  </Field>
                  <Field label="Warning Before Expiry (days)">
                    <input type="number" min="0" value={form.expiryWarningDays} onChange={(e) => set("expiryWarningDays", Number(e.target.value))} disabled={!form.pointsExpire} />
                  </Field>
                  <Field label="Grace Period (days)">
                    <input type="number" min="0" value={form.gracePeriodDays} onChange={(e) => set("gracePeriodDays", Number(e.target.value))} disabled={!form.pointsExpire} />
                  </Field>
                  <Field label="Auto-expire Schedule">
                    <select value={form.autoExpireCron} onChange={(e) => set("autoExpireCron", e.target.value)} disabled={!form.pointsExpire}>
                      {(opts.cronOptions || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Expire Unused Points Only</span>
                    <small className="muted">Recently earned points stay active first (FIFO)</small>
                  </div>
                  <Toggle on={form.expireUnusedOnly} onChange={(v) => set("expireUnusedOnly", v)} />
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Extend Expiry on Purchase</span>
                    <small className="muted">Reset the expiry clock when a member shops</small>
                  </div>
                  <Toggle on={form.extendOnPurchase} onChange={(v) => set("extendOnPurchase", v)} />
                </div>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/points?tab=expiry")}>
                  Open expiry management →
                </button>
              </section>
            </form>
          ) : tab === "notifications" ? (
            <form className="ptsset-form" onSubmit={save}>
              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="bell" size={14} /></span>
                  <div>
                    <h2>Notifications</h2>
                    <p className="muted">Choose which loyalty events notify members.</p>
                  </div>
                </header>
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify on Points Earned</span>
                  <Toggle on={form.notifyEarn} onChange={(v) => set("notifyEarn", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify on Redemption</span>
                  <Toggle on={form.notifyRedeem} onChange={(v) => set("notifyRedeem", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify Before Expiry</span>
                  <Toggle on={form.notifyExpiry} onChange={(v) => set("notifyExpiry", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Notify on Tier Change</span>
                  <Toggle on={form.notifyTier} onChange={(v) => set("notifyTier", v)} />
                </div>
              </section>

              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="mail" size={14} /></span>
                  <div>
                    <h2>Delivery Channels</h2>
                    <p className="muted">How and how often members receive loyalty messages.</p>
                  </div>
                </header>
                <div className="ptsset-grid-2">
                  <Field label="Preferred Channels">
                    <select value={form.notifyChannels} onChange={(e) => set("notifyChannels", e.target.value)}>
                      {(opts.notifyChannels || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Digest Frequency">
                    <select value={form.digestFrequency} onChange={(e) => set("digestFrequency", e.target.value)}>
                      {(opts.digestFrequencies || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Expiry Reminder Lead Time (days)">
                  <input type="number" min="1" value={form.expiryReminderDays} onChange={(e) => set("expiryReminderDays", Number(e.target.value))} />
                </Field>
              </section>
            </form>
          ) : tab === "fraud" ? (
            <form className="ptsset-form" onSubmit={save}>
              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="shield" size={14} /></span>
                  <div>
                    <h2>Fraud & Limits</h2>
                    <p className="muted">Protect the program from abuse and unusual activity.</p>
                  </div>
                </header>
                <div className="ptsset-grid-2">
                  <Field label="Max Earn per Day (pts)">
                    <input type="number" min="0" value={form.maxEarnPerDay} onChange={(e) => set("maxEarnPerDay", Number(e.target.value))} />
                  </Field>
                  <Field label="Max Redeem per Day (pts)">
                    <input type="number" min="0" value={form.maxRedeemPerDay} onChange={(e) => set("maxRedeemPerDay", Number(e.target.value))} />
                  </Field>
                  <Field label="Max Accounts per Phone">
                    <input type="number" min="1" value={form.maxAccountsPerPhone} onChange={(e) => set("maxAccountsPerPhone", Number(e.target.value))} />
                  </Field>
                  <Field label="Manual Review Threshold (pts)" hint="Flag large earn/redeem events">
                    <input type="number" min="0" value={form.manualReviewThreshold} onChange={(e) => set("manualReviewThreshold", Number(e.target.value))} />
                  </Field>
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Flag Suspicious Earning Patterns</span>
                  <Toggle on={form.flagSuspiciousEarn} onChange={(v) => set("flagSuspiciousEarn", v)} />
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Require Order Completion</span>
                    <small className="muted">Only credit points after delivery / no refund window</small>
                  </div>
                  <Toggle on={form.requireOrderCompletion} onChange={(v) => set("requireOrderCompletion", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Block Redemption via VPN</span>
                  <Toggle on={form.blockVpnRedeem} onChange={(v) => set("blockVpnRedeem", v)} />
                </div>
              </section>
            </form>
          ) : (
            <form className="ptsset-form" onSubmit={save}>
              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="bolt" size={14} /></span>
                  <div>
                    <h2>Automation</h2>
                    <p className="muted">Background jobs that keep the loyalty program running.</p>
                  </div>
                </header>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto Welcome Bonus</span>
                  <Toggle on={form.autoWelcomeBonus} onChange={(v) => set("autoWelcomeBonus", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto Tier Upgrades</span>
                  <Toggle on={form.autoTierUpgrade} onChange={(v) => set("autoTierUpgrade", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto Expiry Reminders</span>
                  <Toggle on={form.autoExpiryReminders} onChange={(v) => set("autoExpiryReminders", v)} />
                </div>
                <div className="ptsset-row">
                  <span className="ptsset-label">Auto Monthly Digest</span>
                  <Toggle on={form.autoMonthlyDigest} onChange={(v) => set("autoMonthlyDigest", v)} />
                </div>
                <div className="ptsset-row">
                  <div>
                    <span className="ptsset-label">Sync Points with Orders</span>
                    <small className="muted">Recalculate on refunds and cancellations</small>
                  </div>
                  <Toggle on={form.syncWithOrders} onChange={(v) => set("syncWithOrders", v)} />
                </div>
              </section>

              <section className="card pf-card ptsset-section">
                <header className="ptsset-sec-head">
                  <span className="ptsset-sec-ico"><Icon name="gear" size={14} /></span>
                  <div>
                    <h2>Integrations</h2>
                    <p className="muted">Optional webhook and scheduling preferences.</p>
                  </div>
                </header>
                <Field label="Webhook URL" hint="Receive loyalty events as JSON POSTs">
                  <input
                    type="url"
                    placeholder="https://example.com/hooks/points"
                    value={form.webhookUrl || ""}
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
            </section>
            </form>
          )}
        </div>

        <aside className="ptsset-side">
          <section className="card pf-card">
            <h2><Icon name="clock" size={14} /> Quick Summary</h2>
            <ul className="ptsset-summary">
              <li>
                <span className="ptsset-sum-ico green"><Icon name="users" size={14} /></span>
                <div>
                  <span className="muted">Active Members</span>
                  <strong>{fmtNum(summary.activeMembers)}</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico orange"><Icon name="gift" size={14} /></span>
                <div>
                  <span className="muted">Points Issued (Total)</span>
                  <strong>{fmtNum(summary.pointsIssued)} pts</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico red"><Icon name="exchange" size={14} /></span>
                <div>
                  <span className="muted">Points Redeemed (Total)</span>
                  <strong>{fmtNum(summary.pointsRedeemed)} pts</strong>
                </div>
              </li>
              <li>
                <span className="ptsset-sum-ico gold"><Icon name="wallet" size={14} /></span>
                <div>
                  <span className="muted">Available Points Balance</span>
                  <strong>{fmtNum(summary.availableBalance)} pts</strong>
                </div>
              </li>
            </ul>
            <button className="link-reset ptsset-report" type="button" onClick={() => navigate("/points?tab=transactions")}>
              View full points report →
            </button>
          </section>

          <section className="card pf-card">
            <h2><Icon name="info" size={14} /> Program Information</h2>
            <dl className="ptsset-info">
              <div><dt>Program Started On</dt><dd>{info.startedOn}</dd></div>
              <div><dt>Last Updated</dt><dd>{info.lastUpdated}</dd></div>
              <div><dt>Last Updated By</dt><dd>{info.lastUpdatedBy}</dd></div>
              <div><dt>Program ID</dt><dd><code>{info.programId}</code></dd></div>
            </dl>
          </section>

          <section className="card pf-card">
            <h2><Icon name="warning" size={14} /> Important Notes</h2>
            <ul className="ptsset-notes">
              {(data.notes || []).map((n) => (
                <li key={n}>
                  <Icon name="checkCircle" size={14} />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
            <div className="ptsset-warn">
              <Icon name="warning" size={14} />
              <span>Always test your changes using the Preview Member View.</span>
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
