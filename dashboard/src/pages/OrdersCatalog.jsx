import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";
import { useAutoRefresh } from "../useAutoRefresh";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function statusCls(status) {
  if (status === "delivered") return "ord-st-delivered";
  if (status === "shipped") return "ord-st-shipped";
  if (status === "processing") return "ord-st-processing";
  if (status === "pending") return "ord-st-pending";
  if (status === "cancelled") return "ord-st-cancelled";
  return "ord-st-processing";
}

function payCls(status) {
  if (status === "paid") return "pay-paid";
  if (status === "failed") return "pay-failed";
  return "pay-pending";
}

async function printOrder(order) {
  let full = order;
  if (!full.items?.length) {
    const d = await api(`/admin/orders/${order.id}`);
    full = d.order;
  }
  const rows = (full.items || [])
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${kes(i.priceKes ?? i.unitPriceKes)}</td><td>${kes(i.totalKes ?? i.lineTotalKes)}</td></tr>`
    )
    .join("");
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${full.orderNumber}</title>
    <style>
      body{font-family:Inter,Arial,sans-serif;padding:28px;color:#0B1F3A}
      h1{font-size:20px;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px}
      .muted{color:#64748b}
    </style></head><body>
    <h1>Tajira Kenya</h1>
    <div class="muted">Order ${full.orderNumber}</div>
    <p>${full.customer?.name || order.customerName || ""}<br>${full.customer?.email || ""}<br>${full.customer?.phone || order.customerPhone || ""}</p>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p>Subtotal ${kes(full.summary?.subtotalKes ?? full.subtotalKes)} · Delivery ${kes(full.summary?.deliveryKes ?? full.deliveryKes)} · VAT ${kes(full.summary?.taxKes ?? full.vatKes)}<br>
    <strong>Total ${kes(full.summary?.totalKes ?? full.totalKes ?? order.totalKes)}</strong></p>
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function Donut({ parts, total }) {
  const slices = (parts || []).reduce((s, p) => s + (p.value || 0), 0) || total || 1;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap ordc-donut">
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
        <text x="70" y="62" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">Total Orders</text>
      </svg>
      <ul className="donut-legend ordc-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.name}</span>
            <b>{Number(p.pct).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OrdersCatalog() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [payF, setPayF] = useState("");
  const [deliveryF, setDeliveryF] = useState("");
  const [dateF, setDateF] = useState("");
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      paymentStatus: next.paymentStatus ?? payF,
      delivery: next.delivery ?? deliveryF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.paymentStatus) p.set("paymentStatus", vals.paymentStatus);
    if (vals.delivery) p.set("delivery", vals.delivery);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}, options = {}) {
    api(`/admin/orders-catalog?${queryString(overrides)}`)
      .then((d) => {
        if (options.silent) {
          setData((prev) => {
            const prevTotal = prev?.stats?.total ?? 0;
            const nextTotal = d?.stats?.total ?? 0;
            if (prev && nextTotal > prevTotal) {
              const n = nextTotal - prevTotal;
              setToast(n === 1 ? "New order received" : `${n} new orders received`);
            }
            return d;
          });
        } else {
          setData(d);
          setSelected([]);
        }
        setError("");
      })
      .catch((e) => {
        if (!options.silent) setError(e.message || "Could not load orders.");
      });
  }

  useEffect(() => {
    load({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusF, payF, deliveryF]);

  useAutoRefresh(() => load({}, { silent: true }));

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  async function patch(order, body) {
    await api(`/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setMenu(null);
    setToast("Order updated");
    load();
  }

  function search(e) {
    e.preventDefault();
    setPage(1);
    load({ q, page: 1 });
  }

  function reset() {
    setQ("");
    setStatusF("");
    setPayF("");
    setDeliveryF("");
    setDateF("");
    setPage(1);
    load({ q: "", status: "", paymentStatus: "", delivery: "", page: 1 });
  }

  function exportCsv() {
    const rows = data?.orders || [];
    const header = ["Order ID", "Customer", "Phone", "Items", "Total", "Payment", "Method", "Status", "Delivery", "City", "Date"];
    const lines = [header.join(",")];
    for (const o of rows) {
      lines.push([
        o.orderNumber,
        `"${o.customerName}"`,
        o.customerPhone,
        o.itemCount,
        o.totalKes,
        o.paymentLabel,
        o.paymentMethod,
        o.statusLabel,
        o.deliveryMethod,
        o.deliveryCity,
        `"${o.orderDate} ${o.orderTime}"`,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Orders exported");
  }

  const stats = data?.stats || {};
  const orders = data?.orders || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const allChecked = orders.length > 0 && orders.every((o) => selected.includes(o.id));

  function pageButtons() {
    const btns = [];
    const max = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - max + 1));
    for (let i = 0; i < max; i += 1) btns.push(start + i);
    return btns;
  }

  if (!data) {
    return (
      <div className="ordc-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/orders">Orders</Link>
          <span>›</span>
          <strong>All Orders</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading orders…</p>}
      </div>
    );
  }

  return (
    <div className="ordc-page ord">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/orders">Orders</Link>
        <span>›</span>
        <strong>All Orders</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            All Orders
            <span className="prod-title-icon solid"><Icon name="bag" size={16} /></span>
          </h1>
          <p>View and manage all customer orders.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export Orders
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("Import orders coming soon")}>
            <Icon name="upload" size={14} /> Import Orders
          </button>
          <button className="btn btn-purple btn-small ordc-new-dd" type="button" onClick={() => setToast("Create order form coming soon")}>
            <Icon name="plus" size={14} /> Create Order
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats six ordc-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Orders</div>
            <div className="prod-stat-n purple">{fmtNum(stats.total)}</div>
            <div className="cat-stat-hint up">↑ {stats.totalDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="bag" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Pending</div>
            <div className="prod-stat-n orange">{fmtNum(stats.pending)}</div>
            <div className="cat-stat-hint up">↑ {stats.pendingDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Processing</div>
            <div className="prod-stat-n blue">{fmtNum(stats.processing)}</div>
            <div className="cat-stat-hint up">↑ {stats.processingDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon blue"><Icon name="gear" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Shipped</div>
            <div className="prod-stat-n indigo">{fmtNum(stats.shipped)}</div>
            <div className="cat-stat-hint up">↑ {stats.shippedDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon indigo"><Icon name="truck" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Delivered</div>
            <div className="prod-stat-n green">{fmtNum(stats.delivered)}</div>
            <div className="cat-stat-hint up">↑ {stats.deliveredDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Cancelled</div>
            <div className="prod-stat-n red">{fmtNum(stats.cancelled)}</div>
            <div className="cat-stat-hint up">↑ {stats.cancelledDelta}% vs last month</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="x" size={16} /></div>
        </article>
      </section>

      <div className="ordc-layout">
        <div className="ordc-main">
          <section className="card prod-filters">
            <form className="prod-filter-row ordc-filters" onSubmit={search}>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders..." />
              </div>
              <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={payF} onChange={(e) => { setPayF(e.target.value); setPage(1); }}>
                <option value="">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select value={deliveryF} onChange={(e) => { setDeliveryF(e.target.value); setPage(1); }}>
                <option value="">All Delivery Methods</option>
                {(data.filters?.deliveryMethods || []).map((m) => (
                  <option key={m} value={m.toLowerCase()}>{m}</option>
                ))}
              </select>
              <select value={dateF} onChange={(e) => setDateF(e.target.value)}>
                <option value="">All Date</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setMore((v) => !v)}>
                More Filters
              </button>
              <button className="link-reset ordc-reset" type="button" onClick={reset}>Reset</button>
            </form>
            {more && <p className="muted ordc-more">Filter by channel, coupon code, or sales agent.</p>}
          </section>

          <section className="card prod-table-wrap">
            <table className="table prod-table ordc-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => setSelected(e.target.checked ? orders.map((o) => o.id) : [])}
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total (KES)</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th>Order Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(o.id)}
                        onChange={(e) =>
                          setSelected((s) => (e.target.checked ? [...s, o.id] : s.filter((id) => id !== o.id)))
                        }
                      />
                    </td>
                    <td>
                      <button className="ordc-id" type="button" onClick={() => navigate(`/orders/${o.id}`)}>
                        <strong>{o.orderNumber}</strong>
                        <span className="muted">{o.shortId}</span>
                      </button>
                    </td>
                    <td>
                      <div className="prod-cell ordc-customer">
                        <img src={o.customerAvatar} alt="" />
                        <div>
                          <strong>{o.customerName}</strong>
                          <div className="muted">{o.customerPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{o.itemCount} items</strong>
                      <button className="ordc-link" type="button" onClick={() => setToast(`Viewing items for ${o.orderNumber}`)}>
                        View items
                      </button>
                    </td>
                    <td><strong>{kes(o.totalKes)}</strong></td>
                    <td>
                      <span className={`st-pill ${payCls(o.paymentStatus)}`}>{o.paymentLabel}</span>
                      <div className="muted ordc-sub">{o.paymentMethod}</div>
                    </td>
                    <td>
                      <span className={`st-pill ${statusCls(o.status)}`}>{o.statusLabel}</span>
                      <div className="muted ordc-sub">{o.statusDate}</div>
                    </td>
                    <td>
                      <strong>{o.deliveryMethod}</strong>
                      <div className="muted ordc-sub">{o.deliveryCity}</div>
                    </td>
                    <td>
                      <div>{o.orderDate}</div>
                      <div className="muted ordc-sub">{o.orderTime}</div>
                    </td>
                    <td>
                      <div className="prod-row-acts">
                        <button type="button" title="View" onClick={() => navigate(`/orders/${o.id}`)}>
                          <Icon name="eye" size={14} />
                        </button>
                        <button
                          type="button"
                          title="Print"
                          onClick={() => printOrder(o).catch((e) => setError(e.message || "Could not print order"))}
                        >
                          <Icon name="print" size={14} />
                        </button>
                        <div className="ord-menu-wrap">
                          <button
                            type="button"
                            title="More"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu(menu === o.id ? null : o.id);
                            }}
                          >
                            <Icon name="more" size={14} />
                          </button>
                          {menu === o.id && (
                            <div className="ord-menu" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => { navigate(`/orders/${o.id}`); setMenu(null); }}>
                                View full order
                              </button>
                              <button type="button" onClick={() => patch(o, { paymentStatus: "COMPLETED", status: "PROCESSING" })}>
                                Mark as paid
                              </button>
                              <button type="button" onClick={() => patch(o, { status: "SHIPPED" })}>
                                Mark shipped
                              </button>
                              <button type="button" onClick={() => patch(o, { status: "DELIVERED" })}>
                                Mark delivered
                              </button>
                              <button type="button" onClick={() => patch(o, { returnStatus: "REQUESTED" })}>
                                Request return
                              </button>
                              <button type="button" className="danger" onClick={() => patch(o, { status: "CANCELLED" })}>
                                Cancel order
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="10" className="muted">No orders match these filters.</td></tr>
                )}
              </tbody>
            </table>
            <footer className="prod-pager">
              <span>Showing {fromN} to {toN} of {fmtNum(total)} orders</span>
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

        <aside className="ordc-side">
          <section className="card pf-card">
            <h2><Icon name="chart" size={14} /> Orders by Status</h2>
            <Donut parts={data.statusDonut} total={stats.total} />
          </section>
          <section className="card pf-card">
            <h2><Icon name="trophy" size={14} /> Top Selling Products</h2>
            <ul className="ordc-top-list">
              {(data.topProducts || []).map((p, i) => (
                <li key={p.name}>
                  <span className="ordc-rank">{i + 1}</span>
                  {p.image ? <img src={p.image} alt="" /> : <div className="prod-ph" />}
                  <div>
                    <strong>{p.name}</strong>
                    <span className="muted">{fmtNum(p.orders)} orders</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card pf-card">
            <h2><Icon name="clock" size={14} /> Recent Orders</h2>
            <ul className="ordc-recent">
              {(data.recentOrders || []).map((r) => (
                <li key={r.id}>
                  <i className={`ordc-dot ${r.tone}`} />
                  <div>
                    <p>{r.text}</p>
                    <span className="muted">{r.atLabel}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <footer className="card pf-card ordc-foot">
        <p>
          <Icon name="info" size={14} />
          Orders refresh automatically every few seconds. New orders appear without reloading the page.
        </p>
      </footer>
    </div>
  );
}
