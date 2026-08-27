import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fmtSigned(n) {
  const v = Number(n) || 0;
  return v > 0 ? `+${fmtNum(v)}` : fmtNum(v);
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (v < 0) return `-${kes(Math.abs(v))}`;
  return kes(v);
}

function roleCls(key) {
  if (key === "super_admin") return "fdl-role-super";
  if (key === "admin") return "fdl-role-admin";
  if (key === "manager") return "fdl-role-mgr";
  return "fdl-role-sys";
}

function typeCls(type) {
  if (type === "addition") return "pia-type-add";
  if (type === "deduction") return "pia-type-ded";
  if (type === "correction") return "pia-type-cor";
  if (type === "return") return "pia-type-ret";
  return "pia-type-other";
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap pia-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {(parts || []).map((p) => {
          const value = p.value || 0;
          const len = slices ? (value / slices) * c : 0;
          const el = (
            <circle
              key={p.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">Total</text>
      </svg>
      <ul className="donut-legend pia-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{Number(p.pct).toFixed(1)}% ({fmtNum(p.value)})</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReasonBars({ items }) {
  const max = Math.max(...(items || []).map((i) => i.count), 1);
  return (
    <ul className="pia-reasons">
      {(items || []).map((item) => (
        <li key={item.key}>
          <div className="pia-reason-head">
            <span>{item.name}</span>
            <b>{fmtNum(item.count)}</b>
          </div>
          <div className="pia-reason-track">
            <i style={{ width: `${(item.count / max) * 100}%`, background: item.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function InventoryAdjustments() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [reasonF, setReasonF] = useState("");
  const [locationF, setLocationF] = useState("");
  const [userF, setUserF] = useState("");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-27");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      type: next.type ?? typeF,
      reason: next.reason ?? reasonF,
      location: next.location ?? locationF,
      user: next.user ?? userF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.type) p.set("type", vals.type);
    if (vals.reason) p.set("reason", vals.reason);
    if (vals.location) p.set("location", vals.location);
    if (vals.user) p.set("user", vals.user);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/admin/inventory-adjustments?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load inventory adjustments."));
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, typeF, reasonF, locationF, userF]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function search(e) {
    e.preventDefault();
    setPage(1);
    load({ q, page: 1 });
  }

  function reset() {
    setQ("");
    setTypeF("");
    setReasonF("");
    setLocationF("");
    setUserF("");
    setFrom("2026-05-01");
    setTo("2026-05-27");
    setPage(1);
    load({ q: "", type: "", reason: "", location: "", user: "", page: 1 });
  }

  function exportCsv() {
    const rows = data?.rows || [];
    const header = ["#", "Date & Time", "Reference", "Product", "SKU", "Type", "Reason", "Location", "Qty Change", "Value", "User", "Role"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.n,
        `"${r.atLabel}"`,
        r.reference,
        `"${r.productName}"`,
        r.productSku,
        r.typeLabel,
        r.reason,
        r.location,
        r.qtyChange,
        r.valueKes,
        `"${r.userName}"`,
        r.userRole,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netza-inventory-adjustments.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Adjustments exported");
  }

  const stats = data?.stats || {};
  const rows = data?.rows || [];
  const filters = data?.filters || {};
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
  }

  if (!data) {
    return (
      <div className="pia-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/products">Products</Link>
          <span>›</span>
          <strong>Inventory Adjustment</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading adjustments…</p>}
      </div>
    );
  }

  return (
    <div className="pia-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/products">Products</Link>
        <span>›</span>
        <strong>Inventory Adjustment</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Inventory Adjustment
            <span className="prod-title-icon purple"><Icon name="refresh" size={16} /></span>
          </h1>
          <p>Adjust product stock levels, record losses, damages or manual corrections.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Adjustments
          </button>
          <button className="btn btn-purple btn-small pia-new-dd" type="button" onClick={() => setToast("New adjustment form coming soon")}>
            <Icon name="plus" size={14} /> New Adjustment
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six pia-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Adjustments</div>
            <div className="prod-stat-n purple">{fmtNum(stats.totalAdjustments)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="list" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Items Affected</div>
            <div className="prod-stat-n green">{fmtNum(stats.itemsAffected)}</div>
            <div className="cat-stat-hint">All time</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="box" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Stock Added</div>
            <div className="prod-stat-n orange">{fmtNum(stats.stockAdded)}</div>
            <div className="cat-stat-hint">Value: {kes(stats.stockAddedValue)}</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="upload" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Stock Deducted</div>
            <div className="prod-stat-n red">{fmtNum(stats.stockDeducted)}</div>
            <div className="cat-stat-hint">Value: {kes(stats.stockDeductedValue)}</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="download" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Net Value Impact</div>
            <div className="prod-stat-n blue">{kes(stats.netValue)}</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="shield" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">This Month</div>
            <div className="prod-stat-n indigo">{fmtNum(stats.thisMonth)}</div>
            <div className="cat-stat-hint up">↑ {stats.monthDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon indigo"><Icon name="refresh" size={16} /></div>
        </article>
      </section>

      <div className="pia-layout">
        <div className="pia-main">
          <section className="card prod-filters">
            <form className="prod-filter-row pia-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search adjustments..." />
              </div>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }}>
                <option value="">All Adjustment Types</option>
                {(filters.types || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <select value={reasonF} onChange={(e) => { setReasonF(e.target.value); setPage(1); }}>
                <option value="">All Reasons</option>
                {(filters.reasons || []).map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <select value={locationF} onChange={(e) => { setLocationF(e.target.value); setPage(1); }}>
                <option value="">All Locations</option>
                {(filters.locations || []).map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <select value={userF} onChange={(e) => { setUserF(e.target.value); setPage(1); }}>
                <option value="">All Users</option>
                {(filters.users || []).map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
              <div className="pia-dates">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span>–</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-small pia-reset" type="button" onClick={reset}>Reset</button>
              <button className="btn btn-purple btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
            </form>
          </section>

          <section className="card prod-table-wrap">
            <table className="table prod-table pia-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date &amp; Time</th>
                  <th>Reference No.</th>
                  <th>Product</th>
                  <th>Adjustment Type</th>
                  <th>Reason</th>
                  <th>Location</th>
                  <th>Qty Change</th>
                  <th>Value (KSh)</th>
                  <th>Adjusted By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.n}</td>
                    <td className="pia-when">{r.atLabel}</td>
                    <td className="mono">{r.reference}</td>
                    <td>
                      <div className="prod-cell">
                        {r.productImage ? <img src={r.productImage} alt="" /> : <div className="prod-ph" />}
                        <div>
                          <strong>{r.productName}</strong>
                          <div className="muted mono">{r.productSku}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`pia-type ${typeCls(r.type)}`}>{r.typeLabel}</span></td>
                    <td>{r.reason}</td>
                    <td>{r.location}</td>
                    <td className={r.qtyChange >= 0 ? "pia-pos" : "pia-neg"}>{fmtSigned(r.qtyChange)}</td>
                    <td className={r.valueKes >= 0 ? "pia-pos" : "pia-neg"}>{fmtMoney(r.valueKes)}</td>
                    <td>
                      <div className="fdl-user pia-user">
                        <span>
                          <strong>{r.userName}</strong>
                          <span className={`fdl-role ${roleCls(r.roleKey)}`}>{r.userRole}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="prod-row-acts">
                        <button type="button" title="View" onClick={() => setToast(`Viewing ${r.reference}`)}><Icon name="eye" size={14} /></button>
                        <button type="button" title="More"><Icon name="more" size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="11" className="muted">No adjustments match these filters.</td></tr>
                )}
              </tbody>
            </table>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} adjustments</span>
              <div className="pager-btns">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="chevronLeft" size={14} />
                </button>
                {pageButtons().map((n) => (
                  <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
                ))}
                {pages > 5 && (
                  <>
                    <span className="muted">…</span>
                    <button type="button" onClick={() => setPage(pages)}>{pages}</button>
                  </>
                )}
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
              <label className="prod-rows">
                Rows per page
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </footer>
          </section>
        </div>

        <aside className="pia-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Adjustments by Type</h2>
            <Donut parts={data.typeDonut} total={stats.totalAdjustments} />
          </section>
          <section className="card pf-card">
            <h2><Icon name="bars" size={14} /> Adjustment Reasons</h2>
            <ReasonBars items={data.reasonBars} />
          </section>
          <section className="card pf-card pia-value-card">
            <h2><Icon name="coin" size={14} /> Value Impact Summary</h2>
            <ul className="pia-value-list">
              <li className="add">
                <span>Total Value Added</span>
                <strong>{kes(data.valueImpact?.added)}</strong>
              </li>
              <li className="ded">
                <span>Total Value Deducted</span>
                <strong>{kes(data.valueImpact?.deducted)}</strong>
              </li>
              <li className="net">
                <span>Net Value Impact</span>
                <strong>{kes(data.valueImpact?.net)}</strong>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <footer className="card pf-card pia-foot">
        <p>
          <Icon name="info" size={14} />
          Inventory adjustments are recorded in real-time and reflected in product stock immediately. All adjustments are logged for audit and reporting purposes.
        </p>
      </footer>
    </div>
  );
}
