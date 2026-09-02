import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";
import OrdersCatalog from "./OrdersCatalog";
import { useAutoRefresh } from "../useAutoRefresh";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fulfillment(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING_PAYMENT") return { label: "Pending", cls: "ord-st-pending" };
  if (s === "SHIPPED") return { label: "Shipped", cls: "ord-st-shipped" };
  if (s === "DELIVERED") return { label: "Delivered", cls: "ord-st-delivered" };
  if (s === "CANCELLED") return { label: "Cancelled", cls: "ord-st-cancelled" };
  return { label: "Processing", cls: "ord-st-processing" };
}

function payLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED" || s === "PAID") return { label: "Paid", cls: "pay-paid" };
  if (s === "FAILED") return { label: "Failed", cls: "pay-failed" };
  return { label: "Pending", cls: "pay-pending" };
}

function methodLabel(method) {
  const m = String(method || "").toUpperCase();
  if (m === "MPESA") return "M-Pesa";
  if (m === "POINTS") return "Tajira Points";
  if (m === "PESAPAL" || m === "CARD") return "Card (Pesapal)";
  return method || "—";
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

function fmtWhen(value) {
  if (!value) return "—";
  return `${fmtDate(value)}, ${fmtTime(value)}`;
}

function customerName(o) {
  const u = o.user || {};
  return `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Guest";
}

function itemCount(o) {
  return o.itemCount || (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
}

const STATS = [
  { key: "total", label: "Total Orders", hint: "All time", icon: "bag", tone: "purple" },
  { key: "pending", label: "Pending", hint: "Awaiting payment", icon: "clock", tone: "orange" },
  { key: "processing", label: "Processing", hint: "Being processed", icon: "gear", tone: "blue" },
  { key: "shipped", label: "Shipped", hint: "On the way", icon: "truck", tone: "indigo" },
  { key: "delivered", label: "Delivered", hint: "Completed", icon: "checkCircle", tone: "green" },
  { key: "cancelled", label: "Cancelled", hint: "Cancelled orders", icon: "x", tone: "red" },
];

const CRUMB = {
  "": "All Orders",
  pending: "Pending Orders",
  processing: "Processing Orders",
  shipped: "Shipped Orders",
  delivered: "Delivered Orders",
  cancelled: "Cancelled Orders",
  returns: "Order Returns",
};

function printOrder(order) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  const rows = (order.items || [])
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${kes(i.unitPriceKes)}</td><td>${kes(i.lineTotalKes)}</td></tr>`
    )
    .join("");
  w.document.write(`<!doctype html><html><head><title>${order.orderNumber}</title>
    <style>
      body{font-family:Inter,Arial,sans-serif;padding:28px;color:#0B1F3A}
      h1{font-size:20px;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px}
      .muted{color:#64748b}
    </style></head><body>
    <h1>Tajira Kenya</h1>
    <div class="muted">Order ${order.orderNumber}</div>
    <p>${customerName(order)}<br>${order.user?.email || ""}<br>${order.user?.phone || order.address?.phone || ""}</p>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p>Subtotal ${kes(order.subtotalKes)} · Delivery ${kes(order.deliveryKes)} · VAT ${kes(order.vatKes)}<br>
    <strong>Total ${kes(order.totalKes)}</strong></p>
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

const emptyCreate = {
  userId: "",
  productId: "",
  quantity: 1,
  items: [],
  paymentMethod: "MPESA",
  paymentStatus: "PENDING",
  status: "PENDING_PAYMENT",
  street: "",
  city: "Nairobi",
  phone: "",
};

export default function Orders() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [params, setParams] = useSearchParams();
  const navStatus = params.get("returns") === "1" ? "returns" : params.get("status") || "";
  const headerQ = params.get("q") || "";
  const isAllOrders = !navStatus && params.get("returns") !== "1";

  const [data, setData] = useState({ orders: [], stats: {}, total: 0 });
  const [q, setQ] = useState(headerQ);
  const [status, setStatus] = useState(navStatus === "returns" ? "" : navStatus);
  const [pay, setPay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [open, setOpen] = useState(null);
  const [full, setFull] = useState(false);
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function queryString(next = {}) {
    const p = new URLSearchParams();
    const query = next.q ?? q;
    const st = next.status ?? status;
    const payment = next.pay ?? pay;
    const df = next.from ?? from;
    const dt = next.to ?? to;
    const pg = next.page ?? page;
    const lim = next.limit ?? limit;
    const ret = next.returns ?? (navStatus === "returns");
    if (query) p.set("q", query);
    if (st) p.set("status", st);
    if (payment) p.set("paymentStatus", payment);
    if (df) p.set("from", df);
    if (dt) p.set("to", dt);
    if (ret) p.set("returns", "1");
    p.set("page", String(pg));
    p.set("limit", String(lim));
    return p.toString();
  }

  function load(overrides = {}, options = {}) {
    api(`/admin/orders?${queryString(overrides)}`)
      .then((d) => {
        setData(d);
        if (!options.silent) setSelected([]);
        setError("");
        setOpen((cur) => {
          if (routeId) return d.orders.find((o) => o.id === routeId) || cur;
          if (cur) return d.orders.find((o) => o.id === cur.id) || (options.silent ? cur : d.orders[0] || null);
          return options.silent ? cur : d.orders[0] || null;
        });
      })
      .catch((e) => {
        if (!options.silent) setError(e.message);
      });
  }

  useAutoRefresh(() => {
    if (!isAllOrders) load({}, { silent: true });
  });

  useEffect(() => {
    const nextStatus = navStatus === "returns" ? "" : navStatus;
    setStatus(nextStatus);
    setPage(1);
    if (headerQ) setQ(headerQ);
    load({ status: nextStatus, page: 1, q: headerQ || q, returns: navStatus === "returns" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navStatus, headerQ]);

  useEffect(() => {
    if (!routeId) return;
    api(`/admin/orders/${routeId}`)
      .then((d) => setOpen(d.order))
      .catch(() => {});
  }, [routeId]);

  useEffect(() => {
    function close() {
      setMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const orders = data.orders || [];
  const stats = data.stats || {};
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const allChecked = orders.length > 0 && orders.every((o) => selected.includes(o.id));
  const crumb = CRUMB[navStatus] || "All Orders";

  const pageButtons = useMemo(() => {
    const maxBtns = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - maxBtns + 1));
    const list = [];
    for (let i = 0; i < maxBtns; i += 1) list.push(start + i);
    return list;
  }, [page, pages]);

  function applyFilters(e) {
    e?.preventDefault();
    setPage(1);
    load({ page: 1 });
  }

  function reset() {
    setQ("");
    setPay("");
    setFrom("");
    setTo("");
    setPage(1);
    if (navStatus) load({ q: "", pay: "", from: "", to: "", page: 1 });
    else {
      setStatus("");
      load({ q: "", status: "", pay: "", from: "", to: "", page: 1, returns: false });
    }
  }

  async function patch(order, body) {
    const data = await api(`/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setOpen(data.order);
    load();
  }

  async function exportCsv() {
    const d = await api(`/admin/orders?${queryString({ page: 1, limit: 200 })}`);
    const rows = [
      ["Order ID", "Customer", "Email", "Phone", "Total", "Items", "Payment", "Method", "Status", "Date"],
      ...(d.orders || []).map((o) => [
        o.orderNumber,
        customerName(o),
        o.user?.email || "",
        o.user?.phone || "",
        o.totalKes,
        itemCount(o),
        payLabel(o.paymentStatus).label,
        methodLabel(o.paymentMethod),
        fulfillment(o.status).label,
        o.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openCreate() {
    setForm(emptyCreate);
    setCreate(true);
    api("/admin/customers?limit=50").then((d) => setCustomers(d.customers || [])).catch(() => {});
    api("/admin/products?limit=50").then((d) => setProducts(d.products || [])).catch(() => {});
  }

  function addLine() {
    if (!form.productId) return;
    const product = products.find((p) => p.id === form.productId);
    if (!product) return;
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: product.id, name: product.name, quantity: Number(f.quantity) || 1 }],
      productId: "",
      quantity: 1,
    }));
  }

  async function saveCreate(e) {
    e.preventDefault();
    if (!form.userId || form.items.length === 0) {
      setError("Choose a customer and at least one product.");
      return;
    }
    setBusy(true);
    try {
      const d = await api("/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          userId: form.userId,
          items: form.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod: form.paymentMethod,
          paymentStatus: form.paymentStatus,
          status: form.status,
          street: form.street,
          city: form.city,
          phone: form.phone,
        }),
      });
      setCreate(false);
      setOpen(d.order);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return isAllOrders && !routeId ? (
    <OrdersCatalog />
  ) : (
    <div className="ord">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/orders">Orders</Link>
        <span>›</span>
        <strong>{crumb}</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="bag" size={18} /></span>
            Orders
          </h1>
          <p>Manage and track all customer orders.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
            <Icon name="download" size={14} /> Export
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => (open ? printOrder(open) : window.print())}>
            <Icon name="print" size={14} /> Print
          </button>
          <button className="btn btn-purple btn-small" type="button" onClick={openCreate}>
            <Icon name="plus" size={14} /> Create Order
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="ord-stats">
        {STATS.map((s) => (
          <article key={s.key} className="prod-stat cat-stat">
            <div>
              <div className="muted">{s.label}</div>
              <div className={`prod-stat-n ${s.tone}`}>{fmtNum(stats[s.key])}</div>
              <div className="cat-stat-hint">{s.hint}</div>
            </div>
            <div className={`prod-stat-icon ${s.tone}`}>
              <Icon name={s.icon} size={16} />
            </div>
          </article>
        ))}
      </section>

      <div className={`ord-layout ${open ? "has-drawer" : ""}`}>
        <section className="card cat-table-card">
          <form className="attr-filters" onSubmit={applyFilters}>
            <div className="prod-search">
              <Icon name="search" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by order ID, customer, email, phone..."
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                const v = e.target.value;
                setStatus(v);
                setPage(1);
                const next = new URLSearchParams(params);
                if (v) {
                  next.set("status", v);
                  next.delete("returns");
                } else {
                  next.delete("status");
                }
                setParams(next, { replace: true });
                load({ status: v, page: 1, returns: false });
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={pay}
              onChange={(e) => {
                setPay(e.target.value);
                setPage(1);
                load({ pay: e.target.value, page: 1 });
              }}
            >
              <option value="">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <div className="ord-dates">
              <Icon name="calendar" size={14} />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
            </div>
            <button className="btn btn-ghost btn-small" type="submit">
              <Icon name="filter" size={14} /> Filter
            </button>
            <button className="link-reset" type="button" onClick={reset}>Reset</button>
          </form>

          <div className="cat-table-wrap">
            <table className="table cat-table ord-table">
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
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const st = fulfillment(o.status);
                  const paySt = payLabel(o.paymentStatus);
                  const count = itemCount(o);
                  return (
                    <tr key={o.id} className={open?.id === o.id ? "is-open" : ""}>
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
                        <button className="ord-id" type="button" onClick={() => { setOpen(o); setFull(false); }}>
                          #{o.orderNumber}
                        </button>
                      </td>
                      <td>
                        <div className="ord-cust">
                          <strong>{customerName(o)}</strong>
                          <div className="muted">{o.user?.email || o.user?.phone || "—"}</div>
                        </div>
                      </td>
                      <td>
                        <div className="ord-cust">
                          <strong>{kes(o.totalKes)}</strong>
                          <div className="muted">{count} {count === 1 ? "item" : "items"}</div>
                        </div>
                      </td>
                      <td>
                        <div className="ord-cust">
                          <span className={`st-pill ${paySt.cls}`}>{paySt.label}</span>
                          <div className="muted">{methodLabel(o.paymentMethod)}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`st-pill ${st.cls}`}>{st.label}</span>
                      </td>
                      <td>
                        <div className="ord-cust">
                          <div>{fmtDate(o.createdAt)}</div>
                          <div className="muted">{fmtTime(o.createdAt)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="prod-row-acts">
                          <button type="button" title="View" onClick={() => { setOpen(o); setFull(false); }}>
                            <Icon name="eye" size={14} />
                          </button>
                          <button type="button" title="Print" onClick={() => printOrder(o)}>
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
                                <button type="button" onClick={() => { setOpen(o); setFull(true); setMenu(null); }}>View full order</button>
                                <button type="button" onClick={() => { patch(o, { paymentStatus: "COMPLETED", status: "PROCESSING" }); setMenu(null); }}>Mark as paid</button>
                                <button type="button" onClick={() => { patch(o, { status: "SHIPPED" }); setMenu(null); }}>Mark shipped</button>
                                <button type="button" onClick={() => { patch(o, { status: "DELIVERED" }); setMenu(null); }}>Mark delivered</button>
                                <button type="button" onClick={() => { patch(o, { returnStatus: "REQUESTED" }); setMenu(null); }}>Request return</button>
                                <button type="button" className="danger" onClick={() => { patch(o, { status: "CANCELLED" }); setMenu(null); }}>Cancel order</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="muted">No orders match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="prod-pager">
            <span>Showing {fromN} to {toN} of {fmtNum(total)} orders</span>
            <div className="pager-btns">
              <button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); load({ page: page - 1 }); }}>
                <Icon name="chevronLeft" size={14} />
              </button>
              {pageButtons.map((n) => (
                <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => { setPage(n); load({ page: n }); }}>
                  {n}
                </button>
              ))}
              {pages > 5 && <span className="muted">… {pages}</span>}
              <button type="button" disabled={page >= pages} onClick={() => { setPage(page + 1); load({ page: page + 1 }); }}>
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
            <select
              value={limit}
              onChange={(e) => {
                const n = Number(e.target.value);
                setLimit(n);
                setPage(1);
                load({ limit: n, page: 1 });
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </footer>
        </section>

        {open && (
          <aside className="ord-drawer">
            <div className="ord-drawer-head">
              <div>
                <h2>#{open.orderNumber}</h2>
                <span className={`st-pill ${fulfillment(open.status).cls}`}>{fulfillment(open.status).label}</span>
              </div>
              <button className="icon-btn" type="button" aria-label="Close" onClick={() => { setOpen(null); if (routeId) navigate("/orders"); }}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="ord-meta">
              <div><Icon name="calendar" size={14} /> {fmtWhen(open.createdAt)}</div>
              <div><Icon name="users" size={14} /> {customerName(open)}</div>
              <div><Icon name="phone" size={14} /> {open.user?.phone || open.address?.phone || "—"}</div>
              <div><Icon name="mail" size={14} /> {open.user?.email || "—"}</div>
            </div>
            <h3>Order Summary</h3>
            <dl className="ord-sum">
              <div><dt>Subtotal</dt><dd>{kes(open.subtotalKes)}</dd></div>
              <div><dt>Delivery Fee</dt><dd>{kes(open.deliveryKes)}</dd></div>
              <div><dt>VAT (16%)</dt><dd>{kes(open.vatKes)}</dd></div>
              <div className="ord-total"><dt>Total</dt><dd>{kes(open.totalKes)}</dd></div>
            </dl>
            <h3>Payment Information</h3>
            <div className="ord-pay-block">
              <span className={`st-pill ${payLabel(open.paymentStatus).cls}`}>{payLabel(open.paymentStatus).label}</span>
              <p>Method: {methodLabel(open.paymentMethod)}</p>
              <p>Transaction ID: {open.paymentRef || open.payments?.[0]?.reference || "—"}</p>
              <p>Paid At: {open.paidAt ? fmtWhen(open.paidAt) : "—"}</p>
            </div>
            <h3>Shipping Address</h3>
            <p className="ord-addr">
              <Icon name="pin" size={14} />
              <span>
                <strong>{customerName(open)}</strong><br />
                {open.address?.street}<br />
                {[open.address?.city, open.address?.county].filter((v, i, a) => v && a.indexOf(v) === i).join(", ")}
                {open.address?.city || open.address?.county ? ", Kenya" : "Kenya"}
                {open.address?.postalCode ? <><br />Pincode: {open.address.postalCode}</> : null}
              </span>
            </p>
            <button className="btn btn-purple" type="button" onClick={() => setFull(true)}>
              View Full Order
            </button>
          </aside>
        )}
      </div>

      {full && open && (
        <div className="prod-modal" onClick={() => setFull(false)}>
          <div className="card prod-modal-card ord-full" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Order {open.orderNumber}</h2>
              <button className="icon-btn" type="button" onClick={() => setFull(false)}><Icon name="x" size={16} /></button>
            </div>
            <p className="muted">{customerName(open)} · {open.user?.email} · {open.user?.phone}</p>
            <label>Fulfillment status</label>
            <select value={open.status} onChange={(e) => patch(open, { status: e.target.value })}>
              {["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
                <option key={s} value={s}>{fulfillment(s).label} ({s})</option>
              ))}
            </select>
            <table className="table" style={{ marginTop: 14 }}>
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Price</th><th>Line</th></tr>
              </thead>
              <tbody>
                {(open.items || []).map((i, idx) => (
                  <tr key={i.sku || idx}>
                    <td>{i.name}{i.wasFlashDrop ? " · FLASH" : ""}<div className="muted">{i.sku}</div></td>
                    <td>{i.quantity}</td>
                    <td>{kes(i.unitPriceKes)}</td>
                    <td>{kes(i.lineTotalKes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ textAlign: "right", fontWeight: 800 }}>Total {kes(open.totalKes)}</p>
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => printOrder(open)}>Print invoice</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setFull(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {create && (
        <div className="prod-modal" onClick={() => setCreate(false)}>
          <form className="card prod-modal-card ord-full" onClick={(e) => e.stopPropagation()} onSubmit={saveCreate}>
            <h2>Create Order</h2>
            <label>Customer</label>
            <select value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} · {c.phone}</option>
              ))}
            </select>
            <label>Add product</label>
            <div className="ord-add-line">
              <select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {kes(p.priceKes)}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              <button className="btn btn-ghost btn-small" type="button" onClick={addLine}>Add</button>
            </div>
            <ul className="ord-lines">
              {form.items.map((i, idx) => (
                <li key={idx}>
                  {i.name} × {i.quantity}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, n) => n !== idx) }))}>×</button>
                </li>
              ))}
            </ul>
            <div className="pf-2">
              <div>
                <label>Payment method</label>
                <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="MPESA">M-Pesa</option>
                  <option value="PESAPAL">Card (Pesapal)</option>
                  <option value="POINTS">Tajira Points</option>
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="PENDING_PAYMENT">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>
            </div>
            <label>Street</label>
            <input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Ngong Road" />
            <div className="cat-form-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setCreate(false)}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Create Order"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
