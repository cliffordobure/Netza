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
          ) : (
            <section className="card pf-card ptsset-placeholder">
              <h2>{TABS.find((t) => t.id === tab)?.label}</h2>
              <p className="muted">
                Configure {TABS.find((t) => t.id === tab)?.label.toLowerCase()} for the loyalty program. This section is ready for detailed rule setup.
              </p>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setTab("general")}>
                Back to General Settings
              </button>
            </section>
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
